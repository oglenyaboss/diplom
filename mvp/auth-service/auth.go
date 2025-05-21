// filepath: /Users/dog/WebstormProjects/diplom/mvp/auth-service/auth.go
package main

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/crypto/bcrypt"
)

// Время жизни токенов
const (
	AccessTokenDuration  = 15 * time.Minute
	RefreshTokenDuration = 7 * 24 * time.Hour
)

// JWTSecret - секретный ключ для JWT (в реальном проекте должен храниться в защищенном месте)
var JWTSecret = []byte("secret-jwt-key-mvp-project-2025")

// Claims представляет данные JWT токена
type Claims struct {
	UserID   string `json:"user_id"`
	Username string `json:"username"`
	Role     string `json:"role"`
	jwt.RegisteredClaims
}

// CreateUser создает нового пользователя
func CreateUser(ctx context.Context, req SignupRequest, role string) (*User, error) {
	// Проверяем уникальность имени пользователя и email
	var existingUser User
	err := userCollection.FindOne(ctx, bson.M{
		"$or": []bson.M{
			{"username": req.Username},
			{"email": req.Email},
		},
	}).Decode(&existingUser)
	
	if err != nil && err != mongo.ErrNoDocuments {
		return nil, err
	}
	
	if err == nil {
		return nil, errors.New("Пользователь с таким именем или email уже существует")
	}
	
	// Хешируем пароль
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}
	
	// Генерируем Ethereum адрес для пользователя
	_, ethAddress, err := GenerateEthereumAccount()
	if err != nil {
		return nil, fmt.Errorf("ошибка при генерации Ethereum адреса: %w", err)
	}
	
	// Создаем пользователя
	user := &User{
		ID:           primitive.NewObjectID(),
		Username:     req.Username,
		Email:        req.Email,
		PasswordHash: string(passwordHash),
		FirstName:    req.FirstName,
		LastName:     req.LastName,
		Role:         role,
		Department:   req.Department,
		Position:     req.Position,
		EthAddress:   ethAddress,
		IsActive:     true,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
	
	// Сохраняем пользователя в базу данных
	_, err = userCollection.InsertOne(ctx, user)
	if err != nil {
		return nil, err
	}
	
	return user, nil
}

// AuthenticateUser аутентифицирует пользователя
func AuthenticateUser(ctx context.Context, req LoginRequest) (*User, error) {
	var user User
	err := userCollection.FindOne(ctx, bson.M{"username": req.Username}).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, errors.New("Неверное имя пользователя или пароль")
		}
		return nil, err
	}
	
	// Проверяем, активен ли пользователь
	if !user.IsActive {
		return nil, errors.New("Учетная запись отключена")
	}
	
	// Проверяем пароль
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password))
	if err != nil {
		return nil, errors.New("Неверное имя пользователя или пароль")
	}
	
	// Обновляем время последнего входа
	update := bson.M{
		"$set": bson.M{
			"last_login": time.Now(),
			"updated_at": time.Now(),
		},
	}
	
	_, err = userCollection.UpdateOne(ctx, bson.M{"_id": user.ID}, update)
	if err != nil {
		return nil, err
	}
	
	return &user, nil
}

// GenerateTokens генерирует пару JWT токенов (access и refresh)
func GenerateTokens(user *User) (TokenResponse, error) {
	// Создаем access token
	expirationTime := time.Now().Add(AccessTokenDuration)
	claims := &Claims{
		UserID:   user.ID.Hex(),
		Username: user.Username,
		Role:     user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Issuer:    "mvp-auth-service",
			Subject:   user.ID.Hex(),
		},
	}
	
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(JWTSecret)
	if err != nil {
		return TokenResponse{}, err
	}
	
	// Генерируем refresh token (в реальном проекте лучше хранить в Redis или базе данных)
	refreshToken, err := generateRandomString(32)
	if err != nil {
		return TokenResponse{}, err
	}
	
	return TokenResponse{
		Token:        tokenString,
		RefreshToken: refreshToken,
		ExpiresIn:    int64(AccessTokenDuration.Seconds()),
		UserID:       user.ID.Hex(),
		Username:     user.Username,
		Role:         user.Role,
	}, nil
}

// ValidateToken проверяет JWT токен
func ValidateToken(tokenString string) (*Claims, error) {
	claims := &Claims{}
	
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return JWTSecret, nil
	})
	
	if err != nil {
		return nil, err
	}
	
	if !token.Valid {
		return nil, errors.New("Invalid token")
	}
	
	return claims, nil
}

// UpdateUserRole обновляет роль пользователя
func UpdateUserRole(ctx context.Context, userID string, newRole string) error {
	id, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return err
	}
	
	update := bson.M{
		"$set": bson.M{
			"role":       newRole,
			"updated_at": time.Now(),
		},
	}
	
	result, err := userCollection.UpdateOne(ctx, bson.M{"_id": id}, update)
	if err != nil {
		return err
	}
	
	if result.MatchedCount == 0 {
		return errors.New("Пользователь не найден")
	}
	
	return nil
}

// FindUserByID находит пользователя по ID
func FindUserByID(ctx context.Context, userID string) (*User, error) {
	id, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, err
	}
	
	var user User
	err = userCollection.FindOne(ctx, bson.M{"_id": id}).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, errors.New("Пользователь не найден")
		}
		return nil, err
	}
	
	return &user, nil
}

// Вспомогательные функции

// generateRandomString генерирует случайную строку заданной длины
func generateRandomString(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(bytes)[:length], nil
}
