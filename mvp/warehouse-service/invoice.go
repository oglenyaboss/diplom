package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// InvoiceRequest представляет запрос на создание накладной
type InvoiceRequest struct {
	Number        string        `json:"number" binding:"required"`
	Type          InvoiceType   `json:"type" binding:"required"` // receipt или expense
	Date          time.Time     `json:"date"`
	Items         []InvoiceItem `json:"items" binding:"required"`
	ReceivedBy    PersonInfo    `json:"receivedBy" binding:"required"`
	IssuedBy      PersonInfo    `json:"issuedBy" binding:"required"`
	TotalAmount   float64       `json:"totalAmount" binding:"required"`
	Notes         string        `json:"notes"`
	TransactionID string        `json:"transactionId"`
}

// Создание новой накладной
func createInvoice(c *gin.Context) {
	var req InvoiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("Error binding JSON: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error(), "fields": req})
		return
	}

	// Валидация запроса
	if len(req.Items) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Накладная должна содержать хотя бы одну позицию"})
		return
	}

	// Создаем новую накладную
	invoice := Invoice{
		ID:          primitive.NewObjectID(),
		Number:      req.Number,
		Type:        req.Type,
		Date:        req.Date,
		Items:       req.Items,
		ReceivedBy:  req.ReceivedBy,
		IssuedBy:    req.IssuedBy,
		TotalAmount: req.TotalAmount,
		Notes:       req.Notes,
		CreatedAt:   time.Now(),
	}
	
	// Если указан ID транзакции, связываем накладную с ней
	if req.TransactionID != "" {
		transactionID, err := primitive.ObjectIDFromHex(req.TransactionID)
		if err == nil {
			invoice.TransactionID = transactionID
		}
	}

	// Сохраняем накладную в MongoDB
	_, err := invoiceCollection.InsertOne(context.Background(), invoice)
	if err != nil {
		log.Printf("Error saving invoice: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось сохранить накладную"})
		return
	}

	// Отправляем уведомление о создании накладной
	if err := sendInvoiceNotification(invoice); err != nil {
		log.Printf("Failed to send invoice notification: %v", err)
		// Продолжаем выполнение, даже если не удалось отправить уведомление
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Накладная успешно создана и сохранена",
		"invoice": invoice,
	})
}

// Получение списка накладных
func listInvoices(c *gin.Context) {
	// Опции для получения списка накладных
	findOptions := options.Find()
	
	// Обратная сортировка по дате создания
	findOptions.SetSort(bson.D{{Key: "created_at", Value: -1}})
	
	// Лимит результатов (по умолчанию)
	limit := 50
	if limitParam := c.Query("limit"); limitParam != "" {
		// TODO: обработка ошибки парсинга
		fmt.Sscanf(limitParam, "%d", &limit)
	}
	findOptions.SetLimit(int64(limit))

	// Фильтр по типу, если указан
	filter := bson.M{}
	if invoiceType := c.Query("type"); invoiceType != "" {
		filter["type"] = invoiceType
	}

	// Поиск в БД
	ctx := context.Background()
	cursor, err := invoiceCollection.Find(ctx, filter, findOptions)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка при получении списка накладных"})
		return
	}
	defer cursor.Close(ctx)

	// Результаты
	var invoices []Invoice
	if err := cursor.All(ctx, &invoices); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка при обработке результатов"})
		return
	}

	c.JSON(http.StatusOK, invoices)
}

// Получение накладной по ID
func getInvoice(c *gin.Context) {
	// Получаем ID из URL
	id := c.Param("id")
	
	// Преобразуем ID в ObjectID
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный формат ID"})
		return
	}

	// Поиск накладной в БД
	var invoice Invoice
	err = invoiceCollection.FindOne(context.Background(), bson.M{"_id": objectID}).Decode(&invoice)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Накладная не найдена"})
		return
	}

	c.JSON(http.StatusOK, invoice)
}

// Проверка наличия накладной для транзакции
func checkInvoiceExists(ctx context.Context, transactionID primitive.ObjectID) (bool, error) {
	count, err := invoiceCollection.CountDocuments(ctx, bson.M{"transaction_id": transactionID})
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// Отправка уведомления о создании накладной
func sendInvoiceNotification(invoice Invoice) error {
	// Создаем сообщение для уведомления
	message := map[string]interface{}{
		"type":     "invoice_created",
		"invoice":  invoice,
		"datetime": time.Now(),
	}

	// Отправляем сообщение через RabbitMQ
	return publishNotification("invoice.created", message)
}

// Отправка уведомления о необходимости создания накладной
func sendInvoiceRequiredNotification(transactionID primitive.ObjectID, transactionType string) error {
	// Создаем сообщение для уведомления
	message := map[string]interface{}{
		"type":            "invoice_required",
		"transaction_id":  transactionID.Hex(),
		"transaction_type": transactionType,
		"datetime":        time.Now(),
	}

	// Отправляем сообщение через RabbitMQ
	return publishNotification("invoice.required", message)
}

// Получение списка транзакций без накладных
func getTransactionsWithoutInvoices(c *gin.Context) {
	ctx := context.Background()
	
	// Получаем все транзакции
	cursor, err := transactionCollection.Find(ctx, bson.M{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка при получении транзакций"})
		return
	}
	defer cursor.Close(ctx)

	var transactions []InventoryTransaction
	if err := cursor.All(ctx, &transactions); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка при обработке результатов"})
		return
	}
	
	// Фильтруем транзакции, для которых нет накладных
	var transactionsWithoutInvoices []InventoryTransaction
	for _, transaction := range transactions {
		exists, err := checkInvoiceExists(ctx, transaction.ID)
		if err != nil {
			log.Printf("Error checking invoice for transaction %s: %v", transaction.ID.Hex(), err)
			continue
		}
		
		if !exists {
			transactionsWithoutInvoices = append(transactionsWithoutInvoices, transaction)
		}
	}
	
	c.JSON(http.StatusOK, transactionsWithoutInvoices)
}