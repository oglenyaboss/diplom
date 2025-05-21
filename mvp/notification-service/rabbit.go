package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/streadway/amqp"
)

// RabbitMQ конфигурация
var (
	rabbitConn    *amqp.Connection
	rabbitChannel *amqp.Channel
)

// Константы для обмена сообщениями
const (
	TransferExchange      = "tracking_exchange"
	TransferKey           = "equipment.transferred"
	TransferQueueName     = "equipment_transferred_queue"
)

// Сообщение о передаче оборудования
type TransferMessage struct {
	TransferID      string    `json:"transfer_id"`
	EquipmentID     string    `json:"equipment_id"`
	EquipmentName   string    `json:"equipment_name"`
	SerialNumber    string    `json:"serial_number"`
	FromHolderID    string    `json:"from_holder_id"`
	ToHolderID      string    `json:"to_holder_id"`
	TransferDate    time.Time `json:"transfer_date"`
	TransferReason  string    `json:"transfer_reason"`
	BlockchainTxID  string    `json:"blockchain_tx_id"`
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
		TransferExchange, // name
		"direct",         // type
		true,             // durable
		false,            // auto-deleted
		false,            // internal
		false,            // no-wait
		nil,              // arguments
	)
	if err != nil {
		log.Printf("Failed to declare an exchange: %v", err)
		return err
	}

	// Объявление очереди
	q, err := ch.QueueDeclare(
		TransferQueueName, // name
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

	// Связывание очереди с обменом
	err = ch.QueueBind(
		q.Name,        // queue name
		TransferKey,   // routing key
		TransferExchange, // exchange
		false,         // no-wait
		nil,           // arguments
	)
	if err != nil {
		log.Printf("Failed to bind a queue: %v", err)
		return err
	}

	// Запуск потребителя сообщений
	go consumeTransferMessages()

	log.Println("RabbitMQ initialized successfully")
	return nil
}

// Потребитель сообщений о передаче оборудования
func consumeTransferMessages() {
	if rabbitChannel == nil {
		log.Println("RabbitMQ channel is not initialized")
		return
	}

	msgs, err := rabbitChannel.Consume(
		TransferQueueName, // queue
		"",                // consumer
		false,             // auto-ack
		false,             // exclusive
		false,             // no-local
		false,             // no-wait
		nil,               // args
	)
	if err != nil {
		log.Printf("Failed to register a consumer: %v", err)
		return
	}

	log.Printf("Started consuming messages from queue: %s", TransferQueueName)

	for msg := range msgs {
		var transferMsg TransferMessage
		err := json.Unmarshal(msg.Body, &transferMsg)
		if err != nil {
			log.Printf("Error parsing transfer message: %v", err)
			msg.Nack(false, true) // Отклоняем сообщение и возвращаем его в очередь
			continue
		}

		log.Printf("Received transfer message for equipment: %s", transferMsg.EquipmentID)

		// Создаем уведомления для отправителя и получателя
		fromUserNotification := createTransferNotification(transferMsg, transferMsg.FromHolderID, false)
		toUserNotification := createTransferNotification(transferMsg, transferMsg.ToHolderID, true)

		// Сохраняем уведомления (в настоящей реализации здесь будет сохранение в MongoDB)
		notifications = append(notifications, fromUserNotification)
		notifications = append(notifications, toUserNotification)

		log.Printf("Created notifications for transfer: %s -> %s", transferMsg.FromHolderID, transferMsg.ToHolderID)

		// Подтверждаем обработку сообщения
		msg.Ack(false)
	}
}

// Создание уведомления о передаче оборудования
func createTransferNotification(transferMsg TransferMessage, userID string, isReceiver bool) Notification {
	var message, notificationType string
	
	if isReceiver {
		message = fmt.Sprintf("Вы получили оборудование: %s (S/N: %s)", transferMsg.EquipmentName, transferMsg.SerialNumber)
		notificationType = "info"
	} else {
		message = fmt.Sprintf("Вы передали оборудование: %s (S/N: %s)", transferMsg.EquipmentName, transferMsg.SerialNumber)
		notificationType = "info"
	}

	// Если указана причина передачи, добавляем её в сообщение
	if transferMsg.TransferReason != "" {
		message = fmt.Sprintf("%s. Причина: %s", message, transferMsg.TransferReason)
	}

	// Если есть транзакция в блокчейне, добавляем её ID (сокращенный)
	if transferMsg.BlockchainTxID != "" {
		shortTxID := transferMsg.BlockchainTxID
		if len(shortTxID) > 10 {
			shortTxID = shortTxID[:10] + "..."
		}
		message = fmt.Sprintf("%s. ID транзакции в блокчейне: %s", message, shortTxID)
	}

	return Notification{
		ID:        fmt.Sprintf("transfer_%s_%s", transferMsg.TransferID, strings.ReplaceAll(userID, "-", "")),
		UserID:    userID,
		Type:      notificationType,
		Message:   message,
		RelatedTo: fmt.Sprintf("transfer-%s", transferMsg.TransferID),
		IsRead:    false,
		CreatedAt: time.Now(),
	}
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
