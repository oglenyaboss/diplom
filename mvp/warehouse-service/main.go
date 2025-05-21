// Основная точка входа для Warehouse Service
package main

import (
	"context"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type WarehouseItemRequest struct {
	Name           string    `json:"name" binding:"required"`
	SerialNumber   string    `json:"serial_number" binding:"required"`
	Category       string    `json:"category" binding:"required"`
	Description    string    `json:"description"`
	Manufacturer   string    `json:"manufacturer"`
	Quantity       int       `json:"quantity" binding:"required"`
	MinQuantity    int       `json:"min_quantity"`
	Location       string    `json:"location" binding:"required"`
	PurchaseDate   time.Time `json:"purchase_date"`
	WarrantyExpiry time.Time `json:"warranty_expiry"`
}

type TransactionRequest struct {
	ItemID          string `json:"item_id" binding:"required"`
	TransactionType string `json:"transaction_type" binding:"required"` // intake, issue, return, adjustment
	Quantity        int    `json:"quantity" binding:"required"`
	ResponsibleUser string `json:"responsible_user" binding:"required"`
	DestinationUser string `json:"destination_user"`
	Reason          string `json:"reason"`
	Notes           string `json:"notes"`
}

func main() {
	// Initialize MongoDB connection
	if err := initMongo(); err != nil {
		log.Fatalf("Failed to connect to MongoDB: %v", err)
	}
	
	// Initialize RabbitMQ connection
	if err := initRabbitMQ(); err != nil {
		log.Printf("Warning: Failed to initialize RabbitMQ: %v", err)
		// Продолжаем работу даже если RabbitMQ недоступен
	}
	// Закрываем соединение с RabbitMQ при завершении
	defer closeRabbitMQ()
	
	r := gin.Default()

	// CORS middleware
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// Endpoint для проверки доступности сервиса
	r.GET("/ping", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status": "ok",
			"service": "warehouse-service",
			"time": time.Now().Format(time.RFC3339),
		})
	})

	// Endpoints для работы с оборудованием на складе
	r.POST("/items", createWarehouseItem)
	r.GET("/items/:id", getWarehouseItem)
	r.GET("/items", listWarehouseItems)
	r.PUT("/items/:id", updateWarehouseItem)
	r.DELETE("/items/:id", deleteWarehouseItem)

	// Endpoints для работы с транзакциями
	r.POST("/transactions", createTransaction)
	r.GET("/transactions", listTransactions)
	r.GET("/transactions/item/:item_id", getItemTransactions)

	log.Println("Starting warehouse service on port 8001...")
	r.Run(":8001")
}

// Создание нового оборудования на складе
func createWarehouseItem(c *gin.Context) {
	var req WarehouseItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Создаем новую запись об оборудовании
	item := WarehouseItem{
		ID:             primitive.NewObjectID(),
		Name:           req.Name,
		SerialNumber:   req.SerialNumber,
		Category:       req.Category,
		Description:    req.Description,
		Manufacturer:   req.Manufacturer,
		Quantity:       req.Quantity,
		MinQuantity:    req.MinQuantity,
		Location:       req.Location,
		PurchaseDate:   req.PurchaseDate,
		WarrantyExpiry: req.WarrantyExpiry,
		Status:         "available",
		LastInventory:  time.Now(),
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	// Сохраняем в MongoDB
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	
	_, err := warehouseCollection.InsertOne(ctx, item)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create warehouse item: " + err.Error()})
		return
	}

	// Отправляем сообщение в RabbitMQ
	if err := publishEquipmentCreated(item); err != nil {
		log.Printf("Warning: Failed to publish message to RabbitMQ: %v", err)
		// Продолжаем работу даже если не удалось отправить сообщение
	}

	// Создаем начальную транзакцию прихода оборудования
	transaction := InventoryTransaction{
		ID:              primitive.NewObjectID(),
		ItemID:          item.ID,
		TransactionType: "intake",
		Quantity:        req.Quantity,
		ResponsibleUser: "admin", // В реальной системе будет использоваться авторизованный пользователь
		Reason:          "Initial registration",
		Date:            time.Now(),
	}

	_, err = transactionCollection.InsertOne(ctx, transaction)
	if err != nil {
		log.Printf("Warning: Failed to record initial transaction: %v", err)
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Warehouse item created successfully",
		"item": item,
	})
}

// Получение информации об оборудовании
func getWarehouseItem(c *gin.Context) {
	id := c.Param("id")
	
	// Проверяем валидность ID
	itemID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid item ID format"})
		return
	}

	// Находим оборудование в базе
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var item WarehouseItem
	err = warehouseCollection.FindOne(ctx, bson.M{"_id": itemID}).Decode(&item)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Item not found"})
		return
	}

	c.JSON(http.StatusOK, item)
}

// Список оборудования на складе
func listWarehouseItems(c *gin.Context) {
	// Получаем параметры фильтрации
	category := c.Query("category")
	location := c.Query("location")
	status := c.Query("status")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	skip, _ := strconv.Atoi(c.DefaultQuery("skip", "0"))
	
	// Создаем фильтр
	filter := bson.M{}
	if category != "" {
		filter["category"] = category
	}
	if location != "" {
		filter["location"] = location
	}
	if status != "" {
		filter["status"] = status
	}

	// Настраиваем опции запроса
	findOptions := options.Find()
	findOptions.SetLimit(int64(limit))
	findOptions.SetSkip(int64(skip))
	findOptions.SetSort(bson.M{"created_at": -1})

	// Находим оборудование по фильтру
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cursor, err := warehouseCollection.Find(ctx, filter, findOptions)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch items: " + err.Error()})
		return
	}
	defer cursor.Close(ctx)

	var items []WarehouseItem
	if err := cursor.All(ctx, &items); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode items data: " + err.Error()})
		return
	}

	// Получаем общее количество записей для пагинации
	total, err := warehouseCollection.CountDocuments(ctx, filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count items: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"items": items,
		"total": total,
		"limit": limit,
		"skip": skip,
	})
}

// Обновление информации об оборудовании
func updateWarehouseItem(c *gin.Context) {
	id := c.Param("id")
	
	// Проверяем валидность ID
	itemID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid item ID format"})
		return
	}

	// Получаем данные для обновления
	var updateData map[string]interface{}
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Добавляем поле updated_at
	updateData["updated_at"] = time.Now()

	// Создаем документ обновления
	update := bson.M{"$set": updateData}

	// Обновляем оборудование в базе
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	result, err := warehouseCollection.UpdateOne(ctx, bson.M{"_id": itemID}, update)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update item: " + err.Error()})
		return
	}

	if result.MatchedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Item not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Item updated successfully"})
}

// Удаление оборудования
func deleteWarehouseItem(c *gin.Context) {
	id := c.Param("id")
	
	// Проверяем валидность ID
	itemID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid item ID format"})
		return
	}

	// Удаляем оборудование из базы
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Сначала проверяем, нет ли связанных транзакций
	count, err := transactionCollection.CountDocuments(ctx, bson.M{"item_id": itemID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check for related transactions: " + err.Error()})
		return
	}
	
	if count > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot delete item with existing transactions. Archive it instead."})
		return
	}

	result, err := warehouseCollection.DeleteOne(ctx, bson.M{"_id": itemID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete item: " + err.Error()})
		return
	}

	if result.DeletedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Item not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Item deleted successfully"})
}

// Создание транзакции (приход, расход, возврат, корректировка)
func createTransaction(c *gin.Context) {
	var req TransactionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Проверяем валидность ID оборудования
	itemID, err := primitive.ObjectIDFromHex(req.ItemID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid item ID format"})
		return
	}

	// Проверяем существование оборудования
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var item WarehouseItem
	err = warehouseCollection.FindOne(ctx, bson.M{"_id": itemID}).Decode(&item)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Item not found"})
		return
	}

	// Проверяем достаточность количества для расхода или возврата
	if (req.TransactionType == "issue" || req.TransactionType == "adjustment") && req.Quantity > item.Quantity {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Insufficient quantity available"})
		return
	}

	// Создаем транзакцию
	transaction := InventoryTransaction{
		ID:              primitive.NewObjectID(),
		ItemID:          itemID,
		TransactionType: req.TransactionType,
		Quantity:        req.Quantity,
		ResponsibleUser: req.ResponsibleUser,
		DestinationUser: req.DestinationUser,
		Reason:          req.Reason,
		Notes:           req.Notes,
		Date:            time.Now(),
	}

	// Обновляем количество оборудования на складе
	var newQuantity int
	switch req.TransactionType {
	case "intake", "return":
		newQuantity = item.Quantity + req.Quantity
	case "issue", "adjustment":
		newQuantity = item.Quantity - req.Quantity
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid transaction type"})
		return
	}

	// Обновляем статус, если количество стало 0 или меньше минимального
	var newStatus string
	if newQuantity <= 0 {
		newStatus = "unavailable"
	} else if newQuantity < item.MinQuantity {
		newStatus = "low"
	} else {
		newStatus = "available"
	}

	// Начинаем транзакцию MongoDB
	session, err := mongoClient.StartSession()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start session: " + err.Error()})
		return
	}
	defer session.EndSession(ctx)

	// Выполняем операции в транзакции
	_, err = session.WithTransaction(ctx, func(sessCtx mongo.SessionContext) (interface{}, error) {
		// Сохраняем транзакцию
		_, err := transactionCollection.InsertOne(sessCtx, transaction)
		if err != nil {
			return nil, err
		}

		// Обновляем количество и статус оборудования
		update := bson.M{
			"$set": bson.M{
				"quantity":  newQuantity,
				"status":    newStatus,
				"updated_at": time.Now(),
			},
		}
		_, err = warehouseCollection.UpdateOne(sessCtx, bson.M{"_id": itemID}, update)
		if err != nil {
			return nil, err
		}
		return nil, nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process transaction: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Transaction created successfully",
		"transaction": transaction,
		"new_quantity": newQuantity,
		"new_status": newStatus,
	})
}

// Список всех транзакций
func listTransactions(c *gin.Context) {
	// Получаем параметры фильтрации
	transactionType := c.Query("type")
	fromDate := c.Query("from")
	toDate := c.Query("to")
	responsibleUser := c.Query("user")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	skip, _ := strconv.Atoi(c.DefaultQuery("skip", "0"))
	
	// Создаем фильтр
	filter := bson.M{}
	if transactionType != "" {
		filter["transaction_type"] = transactionType
	}
	if responsibleUser != "" {
		filter["responsible_user"] = responsibleUser
	}
	
	// Фильтр по дате
	if fromDate != "" || toDate != "" {
		dateFilter := bson.M{}
		if fromDate != "" {
			fromDateTime, err := time.Parse(time.RFC3339, fromDate)
			if err == nil {
				dateFilter["$gte"] = fromDateTime
			}
		}
		if toDate != "" {
			toDateTime, err := time.Parse(time.RFC3339, toDate)
			if err == nil {
				dateFilter["$lte"] = toDateTime
			}
		}
		if len(dateFilter) > 0 {
			filter["date"] = dateFilter
		}
	}

	// Настраиваем опции запроса
	findOptions := options.Find()
	findOptions.SetLimit(int64(limit))
	findOptions.SetSkip(int64(skip))
	findOptions.SetSort(bson.M{"date": -1})

	// Получаем транзакции
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cursor, err := transactionCollection.Find(ctx, filter, findOptions)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch transactions: " + err.Error()})
		return
	}
	defer cursor.Close(ctx)

	var transactions []InventoryTransaction
	if err := cursor.All(ctx, &transactions); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode transactions data: " + err.Error()})
		return
	}

	// Получаем общее количество записей для пагинации
	total, err := transactionCollection.CountDocuments(ctx, filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count transactions: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"transactions": transactions,
		"total": total,
		"limit": limit,
		"skip": skip,
	})
}

// Получение транзакций для конкретного оборудования
func getItemTransactions(c *gin.Context) {
	itemIDStr := c.Param("item_id")
	
	// Проверяем валидность ID оборудования
	itemID, err := primitive.ObjectIDFromHex(itemIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid item ID format"})
		return
	}

	// Настраиваем опции запроса
	findOptions := options.Find()
	findOptions.SetSort(bson.M{"date": -1})

	// Получаем транзакции для данного оборудования
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cursor, err := transactionCollection.Find(ctx, bson.M{"item_id": itemID}, findOptions)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch transactions: " + err.Error()})
		return
	}
	defer cursor.Close(ctx)

	var transactions []InventoryTransaction
	if err := cursor.All(ctx, &transactions); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode transactions data: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"transactions": transactions})
}
