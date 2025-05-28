// Основная точка входа для Warehouse Service
package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"runtime"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Глобальные переменные
var (
	startTime     time.Time
	serviceVersion string = "1.0.0" // Версия сервиса
)

// Инициализация времени запуска
func init() {
	startTime = time.Now()
}

// Форматирование времени работы
func formatUptime(uptime float64) string {
	days := int(uptime / (24 * 3600))
	hours := int(uptime/3600) % 24
	minutes := int(uptime/60) % 60
	seconds := int(uptime) % 60

	var parts []string
	if days > 0 {
		parts = append(parts, fmt.Sprintf("%dd", days))
	}
	if hours > 0 {
		parts = append(parts, fmt.Sprintf("%dh", hours))
	}
	if minutes > 0 {
		parts = append(parts, fmt.Sprintf("%dm", minutes))
	}
	if seconds > 0 || len(parts) == 0 {
		parts = append(parts, fmt.Sprintf("%ds", seconds))
	}

	return strings.Join(parts, " ")
}

// Проверка состояния подключения к RabbitMQ
func isRabbitConnected() bool {
	if rabbitConn != nil && rabbitConn.IsClosed() == false {
		return true
	}
	return false
}

type WarehouseItemRequest struct {
	Name           string    `json:"name" binding:"required"`
	SerialNumber   string    `json:"serial_number" binding:"required"`
	Category       string    `json:"category" binding:"required"`
	Description    string    `json:"description"`
	Manufacturer   string    `json:"manufacturer"`
	Price          float64   `json:"price"`
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
	ReceivedByName  string `json:"received_by_name"` // ФИО пользователя, который заполняет накладную
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

	// Endpoint для проверки доступности сервиса с расширенной информацией
	r.GET("/ping", func(c *gin.Context) {
		// Получение информации о состоянии системы
		var mem runtime.MemStats
		runtime.ReadMemStats(&mem)

		// Проверка состояния MongoDB
		dbStatus := "connected"
		dbConnected := true
		
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		
		err := mongoClient.Ping(ctx, nil)
		if err != nil {
			dbStatus = "disconnected"
			dbConnected = false
		}
		
		// Информация о RabbitMQ
		rabbitConnected := isRabbitConnected()
		
		// Получаем путь к текущему исполняемому файлу
		execPath, _ := os.Executable()
		
		// Вычисляем uptime
		uptimeSeconds := time.Since(startTime).Seconds()
		uptimeFormatted := formatUptime(uptimeSeconds)
		
		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"service": "warehouse-service",
			"version": serviceVersion,
			"time":    time.Now().Format(time.RFC3339),
			"uptime": gin.H{
				"seconds":   uptimeSeconds,
				"formatted": uptimeFormatted,
			},
			"system": gin.H{
				"platform":    runtime.GOOS,
				"goVersion":   runtime.Version(),
				"memory": gin.H{
					"free":  fmt.Sprintf("%d MB", mem.HeapIdle/1024/1024),
					"total": fmt.Sprintf("%d MB", mem.HeapSys/1024/1024),
				},
				"execPath": execPath,
			},
			"database": gin.H{
				"connected": dbConnected,
				"readyState": dbStatus,
			},
			"rabbitMQ": gin.H{
				"connected": rabbitConnected,
			},
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

	// Endpoints для работы с накладными
	r.POST("/invoices", createInvoice)
	r.GET("/invoices", listInvoices)
	r.GET("/invoices/:id", getInvoice)
	r.GET("/transactions/without-invoices", getTransactionsWithoutInvoices)

	// Endpoints для работы с категориями
	r.POST("/categories", createCategory)
	r.GET("/categories", listCategories)
	r.GET("/categories/:id", getCategory)
	r.PUT("/categories/:id", updateCategory)
	r.DELETE("/categories/:id", deleteCategory)

	// Endpoints для работы со складами
	r.POST("/warehouses", createWarehouse)
	r.GET("/warehouses", listWarehouses)
	r.GET("/warehouses/:id", getWarehouse)
	r.PUT("/warehouses/:id", updateWarehouse)
	r.DELETE("/warehouses/:id", deleteWarehouse)

	// Endpoints для работы с поставщиками
	r.POST("/suppliers", createSupplier)
	r.GET("/suppliers", listSuppliers)
	r.GET("/suppliers/:id", getSupplier)
	r.PUT("/suppliers/:id", updateSupplier)
	r.DELETE("/suppliers/:id", deleteSupplier)

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
		Price:          req.Price,
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

	// После успешного создания транзакции, проверяем наличие накладной
	// и отправляем уведомление, если накладная не создана
	go func(transactionID primitive.ObjectID, transactionType string) {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		
		exists, err := checkInvoiceExists(ctx, transactionID)
		if err != nil {
			log.Printf("Error checking invoice existence: %v", err)
			return
		}
		
		if !exists {
			// Если накладная не найдена, отправляем уведомление
			if err := sendInvoiceRequiredNotification(transactionID, transactionType); err != nil {
				log.Printf("Failed to send invoice required notification: %v", err)
			}
		}
	}(transaction.ID, req.TransactionType)

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

// ================================
// CATEGORIES HANDLERS
// ================================

// Создание новой категории
func createCategory(c *gin.Context) {
	var category Category
	if err := c.ShouldBindJSON(&category); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Устанавливаем временные метки
	category.CreatedAt = time.Now()
	category.UpdatedAt = time.Now()

	// Сохраняем в базе данных
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	result, err := categoryCollection.InsertOne(ctx, category)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create category: " + err.Error()})
		return
	}

	category.ID = result.InsertedID.(primitive.ObjectID)
	c.JSON(http.StatusCreated, category)
}

// Получение списка категорий
func listCategories(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Создаем фильтр для активных категорий
	filter := bson.M{"is_active": true}
	
	cursor, err := categoryCollection.Find(ctx, filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch categories: " + err.Error()})
		return
	}
	defer cursor.Close(ctx)

	var categories []Category
	if err := cursor.All(ctx, &categories); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode categories: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"categories": categories})
}

// Получение категории по ID
func getCategory(c *gin.Context) {
	id, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid category ID"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var category Category
	err = categoryCollection.FindOne(ctx, bson.M{"_id": id}).Decode(&category)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "Category not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch category: " + err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, category)
}

// Обновление категории
func updateCategory(c *gin.Context) {
	id, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid category ID"})
		return
	}

	var updateData Category
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updateData.UpdatedAt = time.Now()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	result, err := categoryCollection.UpdateOne(ctx, bson.M{"_id": id}, bson.M{"$set": updateData})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update category: " + err.Error()})
		return
	}

	if result.MatchedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Category not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Category updated successfully"})
}

// Удаление категории (мягкое удаление)
func deleteCategory(c *gin.Context) {
	id, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid category ID"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Мягкое удаление - устанавливаем is_active = false
	result, err := categoryCollection.UpdateOne(ctx, bson.M{"_id": id}, bson.M{
		"$set": bson.M{
			"is_active":  false,
			"updated_at": time.Now(),
		},
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete category: " + err.Error()})
		return
	}

	if result.MatchedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Category not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Category deleted successfully"})
}

// ================================
// WAREHOUSES HANDLERS
// ================================

// Создание нового склада
func createWarehouse(c *gin.Context) {
	var warehouse Warehouse
	if err := c.ShouldBindJSON(&warehouse); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	warehouse.CreatedAt = time.Now()
	warehouse.UpdatedAt = time.Now()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	result, err := warehouseLocationCollection.InsertOne(ctx, warehouse)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create warehouse: " + err.Error()})
		return
	}

	warehouse.ID = result.InsertedID.(primitive.ObjectID)
	c.JSON(http.StatusCreated, warehouse)
}

// Получение списка складов
func listWarehouses(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	filter := bson.M{"is_active": true}
	
	cursor, err := warehouseLocationCollection.Find(ctx, filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch warehouses: " + err.Error()})
		return
	}
	defer cursor.Close(ctx)

	var warehouses []Warehouse
	if err := cursor.All(ctx, &warehouses); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode warehouses: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"warehouses": warehouses})
}

// Получение склада по ID
func getWarehouse(c *gin.Context) {
	id, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid warehouse ID"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var warehouse Warehouse
	err = warehouseLocationCollection.FindOne(ctx, bson.M{"_id": id}).Decode(&warehouse)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "Warehouse not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch warehouse: " + err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, warehouse)
}

// Обновление склада
func updateWarehouse(c *gin.Context) {
	id, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid warehouse ID"})
		return
	}

	var updateData Warehouse
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updateData.UpdatedAt = time.Now()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	result, err := warehouseLocationCollection.UpdateOne(ctx, bson.M{"_id": id}, bson.M{"$set": updateData})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update warehouse: " + err.Error()})
		return
	}

	if result.MatchedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Warehouse not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Warehouse updated successfully"})
}

// Удаление склада (мягкое удаление)
func deleteWarehouse(c *gin.Context) {
	id, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid warehouse ID"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	result, err := warehouseLocationCollection.UpdateOne(ctx, bson.M{"_id": id}, bson.M{
		"$set": bson.M{
			"is_active":  false,
			"updated_at": time.Now(),
		},
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete warehouse: " + err.Error()})
		return
	}

	if result.MatchedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Warehouse not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Warehouse deleted successfully"})
}

// ================================
// SUPPLIERS HANDLERS
// ================================

// Создание нового поставщика
func createSupplier(c *gin.Context) {
	var supplier Supplier
	if err := c.ShouldBindJSON(&supplier); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	supplier.CreatedAt = time.Now()
	supplier.UpdatedAt = time.Now()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	result, err := supplierCollection.InsertOne(ctx, supplier)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create supplier: " + err.Error()})
		return
	}

	supplier.ID = result.InsertedID.(primitive.ObjectID)
	c.JSON(http.StatusCreated, supplier)
}

// Получение списка поставщиков
func listSuppliers(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	filter := bson.M{"is_active": true}
	
	cursor, err := supplierCollection.Find(ctx, filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch suppliers: " + err.Error()})
		return
	}
	defer cursor.Close(ctx)

	var suppliers []Supplier
	if err := cursor.All(ctx, &suppliers); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode suppliers: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"suppliers": suppliers})
}

// Получение поставщика по ID
func getSupplier(c *gin.Context) {
	id, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid supplier ID"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var supplier Supplier
	err = supplierCollection.FindOne(ctx, bson.M{"_id": id}).Decode(&supplier)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "Supplier not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch supplier: " + err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, supplier)
}

// Обновление поставщика
func updateSupplier(c *gin.Context) {
	id, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid supplier ID"})
		return
	}

	var updateData Supplier
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updateData.UpdatedAt = time.Now()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	result, err := supplierCollection.UpdateOne(ctx, bson.M{"_id": id}, bson.M{"$set": updateData})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update supplier: " + err.Error()})
		return
	}

	if result.MatchedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Supplier not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Supplier updated successfully"})
}

// Удаление поставщика (мягкое удаление)
func deleteSupplier(c *gin.Context) {
	id, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid supplier ID"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	result, err := supplierCollection.UpdateOne(ctx, bson.M{"_id": id}, bson.M{
		"$set": bson.M{
			"is_active":  false,
			"updated_at": time.Now(),
		},
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete supplier: " + err.Error()})
		return
	}

	if result.MatchedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Supplier not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Supplier deleted successfully"})
}
