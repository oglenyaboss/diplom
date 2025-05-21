package main

import (
	"encoding/json"
	"log"
	"os"
	"time"

	"github.com/streadway/amqp"
)

// RabbitMQ конфигурация
var (
	rabbitConn    *amqp.Connection
	rabbitChannel *amqp.Channel
	rabbitQueue   amqp.Queue
)

// Константы для обмена сообщениями
const (
	ExchangeName      = "warehouse_exchange"
	EquipmentKey      = "equipment.created"
	EquipmentQueueName = "equipment_created_queue"
)

// Сообщение о создании оборудования
type EquipmentCreatedMessage struct {
	ID              string    `json:"id"`
	Name            string    `json:"name"`
	SerialNumber    string    `json:"serial_number"`
	Category        string    `json:"category"`
	Description     string    `json:"description"`
	Manufacturer    string    `json:"manufacturer"`
	PurchaseDate    time.Time `json:"purchase_date"`
	WarrantyExpiry  time.Time `json:"warranty_expiry,omitempty"`
	Status          string    `json:"status"`
	Location        string    `json:"location"`
	CurrentHolderId string    `json:"current_holder_id"`
	CreatedAt       time.Time `json:"created_at"`
}

// Инициализация подключения к RabbitMQ
func initRabbitMQ() error {
	// Получаем URI из переменной окружения или используем значение по умолчанию
	rabbitURI := os.Getenv("RABBITMQ_URI")
	if rabbitURI == "" {
		rabbitURI = "amqp://guest:guest@localhost:5672/"
	}

	// Подключение к RabbitMQ
	conn, err := amqp.Dial(rabbitURI)
	if err != nil {
		log.Printf("Failed to connect to RabbitMQ: %v", err)
		return err
	}
	rabbitConn = conn

	// Создание канала
	ch, err := conn.Channel()
	if err != nil {
		log.Printf("Failed to open a channel: %v", err)
		return err
	}
	rabbitChannel = ch

	// Объявление обмена
	err = ch.ExchangeDeclare(
		ExchangeName, // name
		"direct",     // type
		true,         // durable
		false,        // auto-deleted
		false,        // internal
		false,        // no-wait
		nil,          // arguments
	)
	if err != nil {
		log.Printf("Failed to declare an exchange: %v", err)
		return err
	}

	// Объявление очереди
	q, err := ch.QueueDeclare(
		EquipmentQueueName, // name
		true,              // durable
		false,             // delete when unused
		false,             // exclusive
		false,             // no-wait
		nil,               // arguments
	)
	if err != nil {
		log.Printf("Failed to declare a queue: %v", err)
		return err
	}
	rabbitQueue = q

	// Связывание очереди с обменом
	err = ch.QueueBind(
		q.Name,        // queue name
		EquipmentKey,  // routing key
		ExchangeName,  // exchange
		false,         // no-wait
		nil,           // arguments
	)
	if err != nil {
		log.Printf("Failed to bind a queue: %v", err)
		return err
	}

	log.Println("RabbitMQ initialized successfully")
	return nil
}

// Публикация сообщения о создании оборудования
func publishEquipmentCreated(item WarehouseItem) error {
	if rabbitChannel == nil {
		log.Println("RabbitMQ channel is not initialized")
		return nil // Просто логируем и продолжаем, если RabbitMQ недоступен
	}

	// Подготовка сообщения
	message := EquipmentCreatedMessage{
		ID:              item.ID.Hex(),
		Name:            item.Name,
		SerialNumber:    item.SerialNumber,
		Category:        item.Category,
		Description:     item.Description,
		Manufacturer:    item.Manufacturer,
		PurchaseDate:    item.PurchaseDate,
		WarrantyExpiry:  item.WarrantyExpiry,
		Status:          item.Status,
		Location:        item.Location,
		CurrentHolderId: "", // По умолчанию пустая строка, будет интерпретирована как "склад" (нулевой адрес в блокчейне)
		CreatedAt:       item.CreatedAt,
	}

	// Сериализация в JSON
	body, err := json.Marshal(message)
	if err != nil {
		log.Printf("Failed to marshal equipment message: %v", err)
		return err
	}

	// Публикация сообщения
	err = rabbitChannel.Publish(
		ExchangeName,  // exchange
		EquipmentKey,  // routing key
		false,         // mandatory
		false,         // immediate
		amqp.Publishing{
			ContentType: "application/json",
			Body:        body,
		})
	if err != nil {
		log.Printf("Failed to publish a message: %v", err)
		return err
	}

	log.Printf("Published message about equipment creation: %s", item.ID.Hex())
	return nil
}

// Закрытие подключения к RabbitMQ
func closeRabbitMQ() {
	if rabbitChannel != nil {
		rabbitChannel.Close()
	}
	if rabbitConn != nil {
		rabbitConn.Close()
	}
}
