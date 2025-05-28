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

// Category представляет категорию оборудования
type Category struct {
	ID             primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Code           string             `bson:"code" json:"code"`                                   // Уникальный код категории
	Name           string             `bson:"name" json:"name"`                                   // Название категории
	Description    string             `bson:"description,omitempty" json:"description,omitempty"` // Описание
	ParentCategory *string            `bson:"parent_category,omitempty" json:"parent_category,omitempty"` // Родительская категория
	IsActive       bool               `bson:"is_active" json:"is_active"`                         // Активна ли категория
	CreatedAt      time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt      time.Time          `bson:"updated_at" json:"updated_at"`
}

// Address представляет адрес
type Address struct {
	Street     string `bson:"street" json:"street"`
	City       string `bson:"city" json:"city"`
	Region     string `bson:"region" json:"region"`
	PostalCode string `bson:"postal_code" json:"postal_code"`
	Country    string `bson:"country" json:"country"`
}

// Contact представляет контактную информацию
type Contact struct {
	Phone   string `bson:"phone,omitempty" json:"phone,omitempty"`
	Email   string `bson:"email,omitempty" json:"email,omitempty"`
	Website string `bson:"website,omitempty" json:"website,omitempty"`
	Manager string `bson:"manager,omitempty" json:"manager,omitempty"`
}

// Warehouse представляет складское помещение
type Warehouse struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Code      string             `bson:"code" json:"code"`           // Уникальный код склада
	Name      string             `bson:"name" json:"name"`           // Название склада
	Address   Address            `bson:"address" json:"address"`     // Адрес склада
	Contact   Contact            `bson:"contact" json:"contact"`     // Контактная информация
	AreaSqm   float64            `bson:"area_sqm" json:"area_sqm"`   // Площадь в кв.м
	Capacity  int                `bson:"capacity" json:"capacity"`   // Вместимость
	IsActive  bool               `bson:"is_active" json:"is_active"` // Активен ли склад
	CreatedAt time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time          `bson:"updated_at" json:"updated_at"`
}

// ContactPerson представляет контактное лицо поставщика
type ContactPerson struct {
	Name     string `bson:"name" json:"name"`
	Position string `bson:"position,omitempty" json:"position,omitempty"`
	Phone    string `bson:"phone,omitempty" json:"phone,omitempty"`
	Email    string `bson:"email,omitempty" json:"email,omitempty"`
}

// Supplier представляет поставщика оборудования
type Supplier struct {
	ID            primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	CompanyName   string             `bson:"company_name" json:"company_name"`       // Название компании
	TaxID         string             `bson:"tax_id" json:"tax_id"`                   // ИНН/Налоговый номер
	Contact       Contact            `bson:"contact" json:"contact"`                 // Основная контактная информация
	ContactPerson ContactPerson      `bson:"contact_person" json:"contact_person"`   // Контактное лицо
	PaymentTerms  string             `bson:"payment_terms,omitempty" json:"payment_terms,omitempty"` // Условия оплаты
	DeliveryTerms string             `bson:"delivery_terms,omitempty" json:"delivery_terms,omitempty"` // Условия поставки
	IsActive      bool               `bson:"is_active" json:"is_active"`             // Активен ли поставщик
	CreatedAt     time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt     time.Time          `bson:"updated_at" json:"updated_at"`
}
