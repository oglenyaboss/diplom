// Основная точка входа для Notification Service
package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"
)

// Структура уведомления
type Notification struct {
    ID        string    `json:"id"`
    UserID    string    `json:"user_id"`
    Type      string    `json:"type"`
    Message   string    `json:"message"`
    RelatedTo string    `json:"related_to,omitempty"`
    IsRead    bool      `json:"is_read"`
    CreatedAt time.Time `json:"created_at"`
}

// Хранилище уведомлений (в реальной системе будет использоваться MongoDB)
var notifications = []Notification{}

// CORS middleware
func corsMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Access-Control-Allow-Origin", "*")
        w.Header().Set("Access-Control-Allow-Credentials", "true")
        w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
        w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

        if r.Method == "OPTIONS" {
            w.WriteHeader(204)
            return
        }

        next.ServeHTTP(w, r)
    })
}

func main() {
    fmt.Println("Notification Service started on :8003")

    // Инициализация тестовых данных
    initTestData()
    
    // Инициализация RabbitMQ
    err := initRabbitMQ()
    if err != nil {
        log.Printf("Warning: Failed to initialize RabbitMQ: %v", err)
        // Продолжаем работу даже если RabbitMQ недоступен
    }
    // Закрываем соединение с RabbitMQ при завершении работы
    defer closeRabbitMQ()

    // Создание мультиплексора для маршрутизации
    mux := http.NewServeMux()

    // Настройка маршрутов API
    mux.HandleFunc("/ping", func(w http.ResponseWriter, r *http.Request) {
        response := map[string]string{
            "status":  "ok",
            "service": "notification-service",
            "time":    time.Now().Format(time.RFC3339),
        }
        w.Header().Set("Content-Type", "application/json")
        w.WriteHeader(http.StatusOK)
        json.NewEncoder(w).Encode(response)
    })
    mux.HandleFunc("/api/notifications/user/", getUserNotifications)
    mux.HandleFunc("/api/notifications/count", getUnreadCount)
    mux.HandleFunc("/api/notifications/mark-read", markAsRead)
    mux.HandleFunc("/api/notifications/create", createNotification)

    // Применение CORS middleware
    handler := corsMiddleware(mux)

    // Запуск сервера
    log.Fatal(http.ListenAndServe(":8003", handler))
}

// Инициализация тестовых данных для MVP
func initTestData() {
    notifications = []Notification{
        {
            ID:        "1",
            UserID:    "1",
            Type:      "warning",
            Message:   "Заканчивается на складе: Фильтры для насосов ФН-102",
            RelatedTo: "item-35",
            IsRead:    false,
            CreatedAt: time.Now().Add(-2 * time.Hour),
        },
        {
            ID:        "2",
            UserID:    "1",
            Type:      "info",
            Message:   "Поступила партия расходометров РС-100",
            RelatedTo: "item-42",
            IsRead:    true,
            CreatedAt: time.Now().Add(-24 * time.Hour),
        },
        {
            ID:        "3",
            UserID:    "2",
            Type:      "warning",
            Message:   "Просрочено возвращение: Анализатор газа АГ-95",
            RelatedTo: "equipment-17",
            IsRead:    false,
            CreatedAt: time.Now().Add(-12 * time.Hour),
        },
        {
            ID:        "4",
            UserID:    "3",
            Type:      "success",
            Message:   "Успешно завершено техническое обслуживание Насоса НЦ-50",
            RelatedTo: "equipment-1",
            IsRead:    false,
            CreatedAt: time.Now().Add(-30 * time.Minute),
        },
        {
            ID:        "5",
            UserID:    "all",
            Type:      "info",
            Message:   "Плановая проверка склада состоится 10.05.2025",
            IsRead:    false,
            CreatedAt: time.Now().Add(-48 * time.Hour),
        },
    }
}

// Обработчик для получения уведомлений пользователя
func getUserNotifications(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodGet {
        http.Error(w, "Метод не поддерживается", http.StatusMethodNotAllowed)
        return
    }

    // Извлечение ID пользователя из URL
    userID := r.URL.Path[len("/api/notifications/user/"):]
    if userID == "" || userID == "undefined" {
        // Возвращаем пустой массив вместо ошибки
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode([]Notification{})
        return
    }

    // Фильтрация уведомлений для пользователя
    var userNotifications []Notification
    for _, notification := range notifications {
        if notification.UserID == userID || notification.UserID == "all" {
            userNotifications = append(userNotifications, notification)
        }
    }

    // Сортировка по времени создания (в реальной системе будет делать MongoDB)
    // ...

    // Отправка JSON-ответа
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(userNotifications)
}

// Обработчик для получения количества непрочитанных уведомлений
func getUnreadCount(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodGet {
        http.Error(w, "Метод не поддерживается", http.StatusMethodNotAllowed)
        return
    }

    // Получение ID пользователя из параметра запроса
    userID := r.URL.Query().Get("userId")
    if userID == "" || userID == "undefined" {
        // Возвращаем ноль вместо ошибки
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(map[string]int{"count": 0})
        return
    }

    // Подсчет непрочитанных уведомлений
    count := 0
    for _, notification := range notifications {
        if (notification.UserID == userID || notification.UserID == "all") && !notification.IsRead {
            count++
        }
    }

    // Отправка ответа
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]int{"count": count})
}

// Обработчик для пометки уведомлений как прочитанных
func markAsRead(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost {
        http.Error(w, "Метод не поддерживается", http.StatusMethodNotAllowed)
        return
    }

    // Декодирование запроса
    var request struct {
        NotificationID string `json:"notification_id"`
        UserID         string `json:"user_id"`
    }

    if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
        http.Error(w, "Неверный формат запроса", http.StatusBadRequest)
        return
    }
    
    // Проверка на undefined или пустой userID
    if request.UserID == "undefined" || request.UserID == "" {
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(map[string]bool{"success": false})
        return
    }

    // Обновление статуса уведомления
    updated := false
    for i := range notifications {
        if notifications[i].ID == request.NotificationID && 
          (notifications[i].UserID == request.UserID || notifications[i].UserID == "all") {
            notifications[i].IsRead = true
            updated = true
            break
        }
    }

    // Отправка ответа
    w.Header().Set("Content-Type", "application/json")
    if updated {
        json.NewEncoder(w).Encode(map[string]bool{"success": true})
    } else {
        json.NewEncoder(w).Encode(map[string]bool{"success": false})
    }
}

// Обработчик для создания нового уведомления
func createNotification(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost {
        http.Error(w, "Метод не поддерживается", http.StatusMethodNotAllowed)
        return
    }

    // Декодирование запроса
    var notification Notification
    if err := json.NewDecoder(r.Body).Decode(&notification); err != nil {
        http.Error(w, "Неверный формат запроса", http.StatusBadRequest)
        return
    }

    // Валидация данных
    if notification.UserID == "" || notification.UserID == "undefined" || notification.Message == "" {
        http.Error(w, "Не указаны обязательные поля", http.StatusBadRequest)
        return
    }

    // Установка дополнительных полей
    notification.ID = fmt.Sprintf("%d", time.Now().UnixNano())
    notification.CreatedAt = time.Now()
    notification.IsRead = false

    // Добавление уведомления
    notifications = append(notifications, notification)

    // Отправка ответа
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(notification)
}