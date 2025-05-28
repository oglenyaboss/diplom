package main

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Роли пользователей
const (
	RoleAdmin     = "admin"     // Администратор системы
	RoleManager   = "manager"   // Менеджер склада
	RoleWarehouse = "warehouse" // Кладовщик
	RoleEmployee  = "employee"  // Обычный сотрудник
)

// User представляет пользователя системы
type User struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Username     string             `bson:"username" json:"username"`
	Email        string             `bson:"email" json:"email"`
	PasswordHash string             `bson:"password_hash" json:"-"` // Хеш пароля не отправляется клиенту
	FirstName    string             `bson:"first_name" json:"first_name"`
	LastName     string             `bson:"last_name" json:"last_name"`
	Role         string             `bson:"role" json:"role"`
	Department   string             `bson:"department" json:"department"`
	Position     string             `bson:"position" json:"position"`
	EthAddress   string             `bson:"eth_address" json:"eth_address"` // Ethereum адрес пользователя
	IsActive     bool               `bson:"is_active" json:"is_active"`
	LastLogin    time.Time          `bson:"last_login,omitempty" json:"last_login,omitempty"`
	CreatedAt    time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt    time.Time          `bson:"updated_at" json:"updated_at"`
}

// UserResponse представляет данные пользователя, отправляемые клиенту
type UserResponse struct {
	ID         string    `json:"id"`
	Username   string    `json:"username"`
	Email      string    `json:"email"`
	FirstName  string    `json:"first_name"`
	LastName   string    `json:"last_name"`
	Role       string    `json:"role"`
	Department string    `json:"department"`
	Position   string    `json:"position"`
	EthAddress string    `json:"eth_address"`
	IsActive   bool      `json:"is_active"`
	LastLogin  time.Time `json:"last_login,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
}

type SignupRequest struct {
	Username   string `json:"username" binding:"required"`
	Email      string `json:"email" binding:"required,email"`
	Password   string `json:"password" binding:"required,min=6"`
	FirstName  string `json:"first_name" binding:"required"`
	LastName   string `json:"last_name" binding:"required"`
	Department string `json:"department"`
	Position   string `json:"position"`
	Role       string `json:"role"`
	IsActive   *bool  `json:"is_active,omitempty"`
	EthAddress string `json:"eth_address,omitempty"`
}

// LoginRequest представляет запрос на авторизацию пользователя
type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// TokenResponse представляет ответ с JWT токеном
type TokenResponse struct {
	Token        string `json:"token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int64  `json:"expires_in"` // Срок действия токена в секундах
	UserID       string `json:"id"`         // Изменено с user_id на id для совместимости с фронтендом
	Username     string `json:"username"`
	Role         string `json:"role"`
}

// RefreshTokenRequest представляет запрос на обновление токена
type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

// AuditLog представляет запись журнала аудита
type AuditLog struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID     string             `bson:"user_id" json:"user_id"`                         // ID пользователя
	SessionID  string             `bson:"session_id,omitempty" json:"session_id,omitempty"` // ID сессии
	ActionType string             `bson:"action_type" json:"action_type"`                 // Тип действия
	Resource   string             `bson:"resource" json:"resource"`                       // Ресурс (equipment, user, etc.)
	ResourceID primitive.ObjectID `bson:"resource_id,omitempty" json:"resource_id,omitempty"` // ID ресурса
	Details    map[string]interface{} `bson:"details,omitempty" json:"details,omitempty"` // Дополнительные детали
	IPAddress  string             `bson:"ip_address,omitempty" json:"ip_address,omitempty"` // IP адрес
	UserAgent  string             `bson:"user_agent,omitempty" json:"user_agent,omitempty"` // User Agent
	Timestamp  time.Time          `bson:"timestamp" json:"timestamp"`                     // Время действия
	Result     string             `bson:"result" json:"result"`                           // Результат (success, failure)
}

// SystemSetting представляет системную настройку
type SystemSetting struct {
	ID             primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Key            string             `bson:"key" json:"key"`                                       // Ключ настройки
	Category       string             `bson:"category" json:"category"`                             // Категория настройки
	Value          interface{}        `bson:"value" json:"value"`                                   // Значение настройки
	Description    string             `bson:"description,omitempty" json:"description,omitempty"`   // Описание настройки
	DataType       string             `bson:"data_type" json:"data_type"`                           // Тип данных (string, number, boolean, object)
	IsActive       bool               `bson:"is_active" json:"is_active"`                           // Активна ли настройка
	CanBeModified  bool               `bson:"can_be_modified" json:"can_be_modified"`               // Можно ли изменять
	LastModifiedBy string             `bson:"last_modified_by,omitempty" json:"last_modified_by,omitempty"` // Кем последний раз изменена
	CreatedAt      time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt      time.Time          `bson:"updated_at" json:"updated_at"`
}
