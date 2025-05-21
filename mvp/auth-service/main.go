package main

import (
	"context"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	// Initialize MongoDB connection
	if err := initMongo(); err != nil {
		log.Fatalf("Failed to connect to MongoDB: %v", err)
	}
	
	// Создаем admin пользователя при первом запуске
	createDefaultAdmin()
	
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

	// Endpoint для проверки доступности сервиса
	r.GET("/ping", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status": "ok",
			"service": "auth-service",
			"time": time.Now().Format(time.RFC3339),
		})
	})

	// Публичные маршруты
	r.POST("/signup", signup)
	r.POST("/login", login)
	r.POST("/refresh", refreshToken)

	// Защищенные маршруты
   authorized := r.Group("/")
   authorized.Use(authMiddleware())
   {
       authorized.GET("/profile", getProfile)
       authorized.PUT("/profile", updateProfile)
       authorized.GET("/users", authorizationMiddleware([]string{RoleAdmin}), listUsers)
       authorized.GET("/users/:id", authorizationMiddleware([]string{RoleAdmin, RoleManager}), getUserByID)
       authorized.PUT("/users/:id/role", authorizationMiddleware([]string{RoleAdmin}), updateUserRole)
       authorized.PUT("/users/:id/status", authorizationMiddleware([]string{RoleAdmin}), updateUserStatus)
       authorized.POST("/users", authorizationMiddleware([]string{RoleAdmin}), createUserByAdmin)
   }

	log.Println("Starting auth service on port 8000...")
	r.Run(":8000")
}

// Создает пользователя admin при первом запуске
func createDefaultAdmin() {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	
	// Проверяем, есть ли хоть один пользователь с ролью admin
	count, err := userCollection.CountDocuments(ctx, bson.M{"role": RoleAdmin})
	if err != nil {
		log.Printf("Ошибка при проверке наличия admin пользователя: %v", err)
		return
	}
	
	if count == 0 {
		// Создаем пользователя admin
		adminUser := SignupRequest{
			Username:  "admin",
			Email:     "admin@example.com",
			Password:  "admin123",
			FirstName: "System",
			LastName:  "Administrator",
			Department: "IT",
			Position:  "Administrator",
			EthAddress: "0x1Be31A94361a391bBaFB2a4CCd704F57dc04d4bb",
		}
		
		user, err := CreateUser(ctx, adminUser, RoleAdmin)
		if err != nil {
			log.Printf("Ошибка при создании admin пользователя: %v", err)
			return
		}
		
		log.Printf("Создан пользователь admin с ID: %s", user.ID.Hex())
	}
}

// Middleware для проверки авторизации
func authMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header is required"})
			c.Abort()
			return
		}
		
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header format must be Bearer {token}"})
			c.Abort()
			return
		}
		
		tokenString := parts[1]
		claims, err := ValidateToken(tokenString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			c.Abort()
			return
		}
		
		// Проверяем, что пользователь существует и активен
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		
		user, err := FindUserByID(ctx, claims.UserID)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
			c.Abort()
			return
		}
		
		if !user.IsActive {
			c.JSON(http.StatusForbidden, gin.H{"error": "User account is disabled"})
			c.Abort()
			return
		}
		
		// Добавляем информацию о пользователе в контекст
		c.Set("userID", claims.UserID)
		c.Set("username", claims.Username)
		c.Set("role", claims.Role)
		
		c.Next()
	}
}

// Middleware для проверки роли пользователя
func authorizationMiddleware(roles []string) gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("role")
		if !exists {
			c.JSON(http.StatusForbidden, gin.H{"error": "Role information not found"})
			c.Abort()
			return
		}
		
		userRole := role.(string)
		for _, r := range roles {
			if r == userRole {
				c.Next()
				return
			}
		}
		
		c.JSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions"})
		c.Abort()
	}
}

// Handlers

// Регистрация нового пользователя
func signup(c *gin.Context) {
	var req SignupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	
	// По умолчанию новый пользователь получает роль employee
	user, err := CreateUser(ctx, req, RoleEmployee)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusCreated, gin.H{
		"message": "User registered successfully",
		"user": UserResponse{
			ID:         user.ID.Hex(),
			Username:   user.Username,
			Email:      user.Email,
			FirstName:  user.FirstName,
			LastName:   user.LastName,
			Role:       user.Role,
			Department: user.Department,
			Position:   user.Position,
			EthAddress: user.EthAddress,
			IsActive:   user.IsActive,
			CreatedAt:  user.CreatedAt,
		},
	})
}

// Вход в систему
func login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	
	user, err := AuthenticateUser(ctx, req)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}
	
	tokenResponse, err := GenerateTokens(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}
	
	c.JSON(http.StatusOK, tokenResponse)
}

// Обновление токена
func refreshToken(c *gin.Context) {
	var req RefreshTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	// В MVP версии просто проверяем, что refresh token не пустой
	// В реальном проекте нужно хранить refresh tokens в базе данных или Redis
	if req.RefreshToken == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid refresh token"})
		return
	}
	
	// Получаем информацию о пользователе из заголовка Authorization
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header is required"})
		return
	}
	
	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header format must be Bearer {token}"})
		return
	}
	
	oldToken := parts[1]
	claims, err := ValidateToken(oldToken)
	
	// Даже если токен просрочен, мы все равно пытаемся извлечь из него Claims
	// В реальной системе здесь будет другая логика проверки refresh token
	var userID string
	if err == nil {
		userID = claims.UserID
	} else {
		// Извлекаем ID пользователя из просроченного токена
		token, _ := jwt.ParseWithClaims(oldToken, &Claims{}, func(token *jwt.Token) (interface{}, error) {
			return JWTSecret, nil
		})
		
		if token != nil {
			if claims, ok := token.Claims.(*Claims); ok {
				userID = claims.UserID
			}
		}
	}
	
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Could not extract user information from token"})
		return
	}
	
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	
	user, err := FindUserByID(ctx, userID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}
	
	tokenResponse, err := GenerateTokens(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}
	
	c.JSON(http.StatusOK, tokenResponse)
}

// Получение профиля текущего пользователя
func getProfile(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	
	user, err := FindUserByID(ctx, userID.(string))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}
	
	c.JSON(http.StatusOK, UserResponse{
		ID:         user.ID.Hex(),
		Username:   user.Username,
		Email:      user.Email,
		FirstName:  user.FirstName,
		LastName:   user.LastName,
		Role:       user.Role,
		Department: user.Department,
		Position:   user.Position,
		EthAddress: user.EthAddress,
		IsActive:   user.IsActive,
		LastLogin:  user.LastLogin,
		CreatedAt:  user.CreatedAt,
	})
}

// Обновление профиля пользователя
func updateProfile(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	
	var updateData map[string]interface{}
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	// Не позволяем изменять критичные поля через этот endpoint
	delete(updateData, "role")
	delete(updateData, "is_active")
	delete(updateData, "password_hash")
	delete(updateData, "username")
	
	// Если пришел новый пароль, хешируем его
	if password, ok := updateData["password"].(string); ok {
		// TODO: добавить проверку сложности пароля
		delete(updateData, "password")
		
		hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
			return
		}
		
		updateData["password_hash"] = string(hash)
	}
	
	// Добавляем поле updated_at
	updateData["updated_at"] = time.Now()
	
	// Обновляем данные пользователя
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	
	id, err := primitive.ObjectIDFromHex(userID.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}
	
	result, err := userCollection.UpdateOne(ctx, bson.M{"_id": id}, bson.M{"$set": updateData})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile"})
		return
	}
	
	if result.MatchedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"message": "Profile updated successfully"})
}

// Получение списка всех пользователей (только для администраторов)
func listUsers(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	
	findOptions := options.Find()
	findOptions.SetSort(bson.M{"created_at": -1})
	
	cursor, err := userCollection.Find(ctx, bson.M{}, findOptions)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
		return
	}
	defer cursor.Close(ctx)
	
	var users []User
	if err := cursor.All(ctx, &users); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode users"})
		return
	}
	
	// Преобразуем в UserResponse, чтобы не отправлять пароли
	var usersResponse []UserResponse
	for _, user := range users {
		usersResponse = append(usersResponse, UserResponse{
			ID:         user.ID.Hex(),
			Username:   user.Username,
			Email:      user.Email,
			FirstName:  user.FirstName,
			LastName:   user.LastName,
			Role:       user.Role,
			Department: user.Department,
			Position:   user.Position,
			EthAddress: user.EthAddress,
			IsActive:   user.IsActive,
			LastLogin:  user.LastLogin,
			CreatedAt:  user.CreatedAt,
		})
	}
	
	c.JSON(http.StatusOK, gin.H{"users": usersResponse})
}

// Получение информации о пользователе по ID
func getUserByID(c *gin.Context) {
	userID := c.Param("id")
	
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	
	user, err := FindUserByID(ctx, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}
	
	c.JSON(http.StatusOK, UserResponse{
		ID:         user.ID.Hex(),
		Username:   user.Username,
		Email:      user.Email,
		FirstName:  user.FirstName,
		LastName:   user.LastName,
		Role:       user.Role,
		Department: user.Department,
		Position:   user.Position,
		EthAddress: user.EthAddress,
		IsActive:   user.IsActive,
		LastLogin:  user.LastLogin,
		CreatedAt:  user.CreatedAt,
	})
}

// Обновление роли пользователя (только для администраторов)
func updateUserRole(c *gin.Context) {
	userID := c.Param("id")
	
	var requestData struct {
		Role string `json:"role" binding:"required"`
	}
	
	if err := c.ShouldBindJSON(&requestData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	// Проверяем, что роль допустимая
	validRoles := []string{RoleAdmin, RoleManager, RoleWarehouse, RoleEmployee}
	isValidRole := false
	for _, role := range validRoles {
		if role == requestData.Role {
			isValidRole = true
			break
		}
	}
	
	if !isValidRole {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role"})
		return
	}
	
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	
	if err := UpdateUserRole(ctx, userID, requestData.Role); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"message": "User role updated successfully"})
}

// Обновление статуса пользователя (активация/деактивация)
func updateUserStatus(c *gin.Context) {
	userID := c.Param("id")
	
	var requestData struct {
		IsActive bool `json:"is_active" binding:"required"`
	}
	
	if err := c.ShouldBindJSON(&requestData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	
	id, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}
	
	update := bson.M{
		"$set": bson.M{
			"is_active":  requestData.IsActive,
			"updated_at": time.Now(),
		},
	}
	
	result, err := userCollection.UpdateOne(ctx, bson.M{"_id": id}, update)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user status"})
		return
	}
	
	if result.MatchedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"message": "User status updated successfully"})
}

// Создание пользователя с любой ролью и статусом (только для администратора)
func createUserByAdmin(c *gin.Context) {
   var req SignupRequest
   if err := c.ShouldBindJSON(&req); err != nil {
       c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
       return
   }

   // Получаем роль и статус из тела запроса, если есть
   role := req.Role
   if role == "" {
       role = RoleEmployee
   }

   isActive := true
   if req.IsActive != nil && *req.IsActive == false {
       isActive = false
   }

   ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
   defer cancel()

   user, err := CreateUser(ctx, req, role)
   if err != nil {
       c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
       return
   }

   // Обновляем статус, если нужно (CreateUser всегда создаёт активного)
   if user.IsActive != isActive {
       id := user.ID
       _, _ = userCollection.UpdateOne(ctx, bson.M{"_id": id}, bson.M{"$set": bson.M{"is_active": isActive, "updated_at": time.Now()}})
       user.IsActive = isActive
   }

   c.JSON(http.StatusCreated, gin.H{
       "message": "User created successfully",
       "user": UserResponse{
           ID:         user.ID.Hex(),
           Username:   user.Username,
           Email:      user.Email,
           FirstName:  user.FirstName,
           LastName:   user.LastName,
           Role:       user.Role,
           Department: user.Department,
           Position:   user.Position,
           IsActive:   user.IsActive,
           CreatedAt:  user.CreatedAt,
       },
   })
}