// filepath: /Users/dog/WebstormProjects/diplom/mvp/warehouse-service/model.go
package main

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// WarehouseItem представляет единицу оборудования на складе
type WarehouseItem struct {
	ID              primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name            string             `bson:"name" json:"name"`
	SerialNumber    string             `bson:"serial_number" json:"serial_number"`
	Category        string             `bson:"category" json:"category"`
	Description     string             `bson:"description" json:"description"`
	Manufacturer    string             `bson:"manufacturer" json:"manufacturer"`
	Price          float64            `bson:"price" json:"price"`
	Quantity        int                `bson:"quantity" json:"quantity"`
	MinQuantity     int                `bson:"min_quantity" json:"min_quantity"`
	Location        string             `bson:"location" json:"location"`
	PurchaseDate    time.Time          `bson:"purchase_date" json:"purchase_date"`
	WarrantyExpiry  time.Time          `bson:"warranty_expiry" json:"warranty_expiry"`
	Status          string             `bson:"status" json:"status"` // available, reserved, unavailable
	LastInventory   time.Time          `bson:"last_inventory" json:"last_inventory"`
	CreatedAt       time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt       time.Time          `bson:"updated_at" json:"updated_at"`
}

// InventoryTransaction представляет операцию с оборудованием (приход/расход)
type InventoryTransaction struct {
	ID              primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	ItemID          primitive.ObjectID `bson:"item_id" json:"item_id"`
	TransactionType string             `bson:"transaction_type" json:"transaction_type"` // intake, issue, return, adjustment
	Quantity        int                `bson:"quantity" json:"quantity"`
	ResponsibleUser string             `bson:"responsible_user" json:"responsible_user"`
	DestinationUser string             `bson:"destination_user,omitempty" json:"destination_user,omitempty"`
	Reason          string             `bson:"reason" json:"reason"`
	Date            time.Time          `bson:"date" json:"date"`
	Notes           string             `bson:"notes,omitempty" json:"notes,omitempty"`
}

// InvoiceType определяет тип накладной
type InvoiceType string

const (
	InvoiceTypeReceipt InvoiceType = "receipt" // Приходная накладная
	InvoiceTypeExpense InvoiceType = "expense" // Расходная накладная
)

// InvoiceItem представляет позицию в накладной
type InvoiceItem struct {
	ItemID       primitive.ObjectID `bson:"item_id" json:"itemId"`
	Name         string             `bson:"name" json:"name"`
	SerialNumber string             `bson:"serial_number" json:"serialNumber"`
	Category     string             `bson:"category" json:"category"`
	Manufacturer string             `bson:"manufacturer" json:"manufacturer"`
	Quantity     int                `bson:"quantity" json:"quantity"`
	Price        float64            `bson:"price" json:"price"`
	TotalAmount  float64            `bson:"total_amount" json:"totalAmount"`
}

// PersonInfo содержит информацию о человеке в накладной
type PersonInfo struct {
	UserID   string `bson:"user_id,omitempty" json:"userId,omitempty"`
	FullName string `bson:"full_name" json:"fullName"`
	Position string `bson:"position,omitempty" json:"position,omitempty"`
}

// Invoice представляет накладную (приходную или расходную)
type Invoice struct {
	ID            primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Number        string             `bson:"number" json:"number"`         // Номер накладной
	Type          InvoiceType        `bson:"type" json:"type"`             // Тип накладной
	Date          time.Time          `bson:"date" json:"date"`             // Дата создания
	Items         []InvoiceItem      `bson:"items" json:"items"`           // Позиции
	ReceivedBy    PersonInfo         `bson:"received_by" json:"receivedBy"` // Кто получил
	IssuedBy      PersonInfo         `bson:"issued_by" json:"issuedBy"`     // Кто выдал
	TotalAmount   float64            `bson:"total_amount" json:"totalAmount"` // Общая стоимость
	Notes         string             `bson:"notes,omitempty" json:"notes,omitempty"` // Дополнительные заметки
	TransactionID primitive.ObjectID `bson:"transaction_id,omitempty" json:"transactionId,omitempty"` // Связь с транзакцией
	CreatedAt     time.Time          `bson:"created_at" json:"createdAt"` // Время сохранения накладной
}
