// filepath: /Users/dog/WebstormProjects/diplom/mvp/warehouse-service/model.go
package main

import (
	"go.mongodb.org/mongo-driver/bson/primitive"
	"time"
)

// WarehouseItem представляет единицу оборудования на складе
type WarehouseItem struct {
	ID              primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name            string             `bson:"name" json:"name"`
	SerialNumber    string             `bson:"serial_number" json:"serial_number"`
	Category        string             `bson:"category" json:"category"`
	Description     string             `bson:"description" json:"description"`
	Manufacturer    string             `bson:"manufacturer" json:"manufacturer"`
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
