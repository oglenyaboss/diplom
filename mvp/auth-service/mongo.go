// filepath: /Users/dog/WebstormProjects/diplom/mvp/auth-service/mongo.go
package main

import (
	"context"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.mongodb.org/mongo-driver/mongo/readpref"
)

var mongoClient *mongo.Client
var userCollection *mongo.Collection
var auditLogCollection *mongo.Collection
var systemSettingCollection *mongo.Collection

func initMongo() error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	
	// Подключаемся к MongoDB
	client, err := mongo.Connect(ctx, options.Client().ApplyURI("mongodb://mongo:27017"))
	if err != nil {
		return err
	}
	
	// Проверяем подключение
	if err = client.Ping(ctx, readpref.Primary()); err != nil {
		return err
	}
	
	log.Println("Connected to MongoDB")
	
	mongoClient = client
	
	// Инициализируем коллекции
	db := client.Database("warehouse_auth")
	userCollection = db.Collection("users")
	auditLogCollection = db.Collection("audit_logs")
	systemSettingCollection = db.Collection("system_settings")
	
	return nil
}

// Закрываем подключение к MongoDB при завершении работы
func closeMongo(ctx context.Context) error {
	if mongoClient != nil {
		return mongoClient.Disconnect(ctx)
	}
	return nil
}
