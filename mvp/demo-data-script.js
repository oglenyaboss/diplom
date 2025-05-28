#!/usr/bin/env node

/**
 * Скрипт для заполнения демо данными системы управления складом
 * Использует API эндпоинты для создания пользователей, оборудования, транзакций и накладных
 */

const axios = require("axios");

// Конфигурация API эндпоинтов
const API_CONFIG = {
  auth: "http://localhost:8000",
  warehouse: "http://localhost:8001",
  tracking: "http://localhost:8002",
  notification: "http://localhost:8003",
};

// Глобальная переменная для хранения токена аутентификации
let authToken = "";
let adminUserId = "";

// Массивы для хранения созданных данных
let createdUsers = [];
let createdItems = [];
let createdEquipment = [];
let createdTransactions = [];

/**
 * Функция задержки для избежания нагрузки на сервер
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Логирование с временной меткой
 */
const log = (message, type = "INFO") => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${type}] ${message}`);
};

/**
 * Функция для HTTP запросов с обработкой ошибок
 */
const makeRequest = async (method, url, data = null, headers = {}) => {
  try {
    const config = {
      method,
      url,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  } catch (error) {
    log(
      `Ошибка запроса ${method} ${url}: ${
        error.response?.data?.error || error.message
      }`,
      "ERROR"
    );
    throw error;
  }
};

/**
 * Проверка доступности всех сервисов
 */
const checkServices = async () => {
  log("Проверка доступности сервисов...");

  const services = [
    { name: "Auth Service", url: `${API_CONFIG.auth}/ping` },
    { name: "Warehouse Service", url: `${API_CONFIG.warehouse}/ping` },
    { name: "Tracking Service", url: `${API_CONFIG.tracking}/ping` },
    { name: "Notification Service", url: `${API_CONFIG.notification}/ping` },
  ];

  for (const service of services) {
    try {
      await makeRequest("GET", service.url);
      log(`✓ ${service.name} доступен`);
    } catch (error) {
      log(`✗ ${service.name} недоступен`, "ERROR");
      throw new Error(`Сервис ${service.name} недоступен`);
    }
  }
};

/**
 * Создание администратора и получение токена
 */
const createAdminUser = async () => {
  log("Создание администратора...");

  const adminData = {
    username: "admin",
    email: "admin@warehouse.local",
    password: "admin123",
    first_name: "Системный",
    last_name: "Администратор",
    department: "IT",
    position: "Системный администратор",
  };

  try {
    await makeRequest("POST", `${API_CONFIG.auth}/signup`, adminData);
    log("✓ Администратор создан");
  } catch (error) {
    if (error.response?.status === 409) {
      log("Администратор уже существует, продолжаем...");
    } else {
      throw error;
    }
  }

  // Авторизация
  const loginData = await makeRequest("POST", `${API_CONFIG.auth}/login`, {
    username: adminData.username,
    password: adminData.password,
  });

  authToken = loginData.token;
  adminUserId = loginData.user.id || loginData.user._id;
  log("✓ Авторизация успешна");
};

/**
 * Создание демо пользователей
 */
const createDemoUsers = async () => {
  log("Создание демо пользователей...");

  const users = [
    {
      username: "warehouse_manager",
      email: "manager@warehouse.local",
      password: "manager123",
      first_name: "Петр",
      last_name: "Складов",
      department: "Склад",
      position: "Менеджер склада",
    },
    {
      username: "engineer_petrov",
      email: "petrov@warehouse.local",
      password: "engineer123",
      first_name: "Иван",
      last_name: "Петров",
      department: "Инженерный",
      position: "Инженер-технолог",
    },
    {
      username: "operator_sidorov",
      email: "sidorov@warehouse.local",
      password: "operator123",
      first_name: "Алексей",
      last_name: "Сидоров",
      department: "Производство",
      position: "Оператор",
    },
    {
      username: "analyst_kozlova",
      email: "kozlova@warehouse.local",
      password: "analyst123",
      first_name: "Мария",
      last_name: "Козлова",
      department: "Аналитика",
      position: "Аналитик",
    },
  ];

  for (const userData of users) {
    try {
      const user = await makeRequest(
        "POST",
        `${API_CONFIG.auth}/users`,
        userData,
        {
          Authorization: `Bearer ${authToken}`,
        }
      );
      createdUsers.push({ ...userData, id: user.id || user._id });
      log(`✓ Пользователь ${userData.username} создан`);
      await sleep(500);
    } catch (error) {
      if (error.response?.status === 409) {
        log(`Пользователь ${userData.username} уже существует`);
      } else {
        log(`Ошибка создания пользователя ${userData.username}`, "ERROR");
      }
    }
  }
};

/**
 * Создание оборудования на складе
 */
const createWarehouseItems = async () => {
  log("Создание оборудования на складе...");

  const items = [
    {
      name: "Ноутбук Dell XPS 13",
      serial_number: "DLL-XPS-13-2024-001",
      category: "computers",
      description: "13-дюймовый ультрабук для офисной работы",
      manufacturer: "Dell Inc.",
      price: 125000.5,
      quantity: 15,
      min_quantity: 3,
      location: "Склад А-1, Стеллаж 2-3",
      purchase_date: new Date("2024-03-15").toISOString(),
      warranty_expiry: new Date("2027-03-15").toISOString(),
      status: "available",
    },
    {
      name: "Газоанализатор ГА-200",
      serial_number: "GA200-12345",
      category: "measuring_equipment",
      description: "Портативный газоанализатор для нефтегазовой промышленности",
      manufacturer: "ГазТех",
      price: 185000.0,
      quantity: 8,
      min_quantity: 2,
      location: "Склад Б-2, Стеллаж 1-1",
      purchase_date: new Date("2024-01-20").toISOString(),
      warranty_expiry: new Date("2026-01-20").toISOString(),
      status: "available",
    },
    {
      name: "Промышленный сканер Honeywell",
      serial_number: "HNW-SCN-2024-001",
      category: "scanners",
      description: "Беспроводной 2D сканер штрих-кодов",
      manufacturer: "Honeywell International Inc.",
      price: 25000.0,
      quantity: 12,
      min_quantity: 4,
      location: "Склад А-1, Стеллаж 1-2",
      purchase_date: new Date("2024-02-10").toISOString(),
      warranty_expiry: new Date("2026-02-10").toISOString(),
      status: "available",
    },
    {
      name: "Планшет Samsung Galaxy Tab",
      serial_number: "SMG-TAB-2024-001",
      category: "tablets",
      description: "Планшет для мобильных рабочих мест",
      manufacturer: "Samsung Electronics",
      price: 45000.0,
      quantity: 10,
      min_quantity: 3,
      location: "Склад А-2, Стеллаж 3-1",
      purchase_date: new Date("2024-04-05").toISOString(),
      warranty_expiry: new Date("2026-04-05").toISOString(),
      status: "available",
    },
    {
      name: "Тепловизор FLIR E8",
      serial_number: "FLIR-E8-2024-001",
      category: "thermal_cameras",
      description: "Профессиональный тепловизор для диагностики",
      manufacturer: "FLIR Systems",
      price: 320000.0,
      quantity: 3,
      min_quantity: 1,
      location: "Склад Б-1, Стеллаж 2-4",
      purchase_date: new Date("2024-05-15").toISOString(),
      warranty_expiry: new Date("2027-05-15").toISOString(),
      status: "available",
    },
  ];

  for (const itemData of items) {
    try {
      const item = await makeRequest(
        "POST",
        `${API_CONFIG.warehouse}/items`,
        itemData,
        {
          Authorization: `Bearer ${authToken}`,
        }
      );
      createdItems.push({ ...itemData, id: item.id || item._id });
      log(`✓ Оборудование "${itemData.name}" создано`);
      await sleep(1000); // Пауза для обработки RabbitMQ сообщений
    } catch (error) {
      log(`Ошибка создания оборудования ${itemData.name}`, "ERROR");
    }
  }
};

/**
 * Создание транзакций (приход оборудования)
 */
const createTransactions = async () => {
  log("Создание транзакций прихода оборудования...");

  for (const item of createdItems) {
    try {
      const transactionData = {
        item_id: item.id,
        transaction_type: "intake",
        quantity: Math.floor(item.quantity / 2), // Добавляем половину от общего количества
        responsible_user: "admin",
        reason: "Первоначальное поступление на склад",
        notes: `Поставка оборудования ${item.name} от ${item.manufacturer}`,
      };

      const transaction = await makeRequest(
        "POST",
        `${API_CONFIG.warehouse}/transactions`,
        transactionData,
        {
          Authorization: `Bearer ${authToken}`,
        }
      );

      createdTransactions.push({
        ...transactionData,
        id: transaction.id || transaction._id,
      });
      log(`✓ Транзакция прихода для "${item.name}" создана`);
      await sleep(500);
    } catch (error) {
      log(`Ошибка создания транзакции для ${item.name}`, "ERROR");
    }
  }
};

/**
 * Создание накладных
 */
const createInvoices = async () => {
  log("Создание приходных накладных...");

  // Группируем транзакции по несколько штук для создания накладных
  const transactionChunks = [];
  for (let i = 0; i < createdTransactions.length; i += 2) {
    transactionChunks.push(createdTransactions.slice(i, i + 2));
  }

  for (let i = 0; i < transactionChunks.length; i++) {
    const chunk = transactionChunks[i];
    try {
      const invoiceData = {
        type: "receipt",
        supplier: `ООО "Поставщик оборудования ${i + 1}"`,
        supplier_contact: `+7(495)${String(
          Math.floor(Math.random() * 900) + 100
        )}-${String(Math.floor(Math.random() * 90) + 10)}-${String(
          Math.floor(Math.random() * 90) + 10
        )}`,
        responsible_person: "admin",
        transaction_ids: chunk.map((t) => t.id),
        notes: `Поставка согласно договору №2024-SUP-${String(i + 1).padStart(
          3,
          "0"
        )}`,
      };

      const invoice = await makeRequest(
        "POST",
        `${API_CONFIG.warehouse}/invoices`,
        invoiceData,
        {
          Authorization: `Bearer ${authToken}`,
        }
      );

      log(`✓ Приходная накладная №${i + 1} создана`);
      await sleep(500);
    } catch (error) {
      log(`Ошибка создания накладной №${i + 1}`, "ERROR");
    }
  }
};

/**
 * Регистрация оборудования в tracking service
 */
const registerEquipmentForTracking = async () => {
  log("Регистрация оборудования для отслеживания...");

  // Ждем, пока RabbitMQ обработает сообщения от warehouse service
  await sleep(3000);

  // Проверяем, какое оборудование уже зарегистрировано
  try {
    const existingEquipment = await makeRequest(
      "GET",
      `${API_CONFIG.tracking}/equipment`,
      null,
      {
        Authorization: `Bearer ${authToken}`,
      }
    );

    log(
      `Найдено ${existingEquipment.length} единиц оборудования для отслеживания`
    );

    if (existingEquipment.length === 0) {
      log(
        "Оборудование не было автоматически зарегистрировано, создаем вручную..."
      );

      // Создаем оборудование вручную
      for (const item of createdItems.slice(0, 3)) {
        // Регистрируем только первые 3 для демо
        try {
          const equipmentData = {
            name: item.name,
            serialNumber: item.serial_number,
            category: item.category,
            description: item.description,
            manufacturer: item.manufacturer,
            purchaseDate: item.purchase_date,
            warrantyExpiry: item.warranty_expiry,
            location: item.location,
          };

          const equipment = await makeRequest(
            "POST",
            `${API_CONFIG.tracking}/equipment`,
            equipmentData,
            {
              Authorization: `Bearer ${authToken}`,
            }
          );

          createdEquipment.push({
            ...equipmentData,
            id: equipment.id || equipment._id,
          });
          log(
            `✓ Оборудование "${item.name}" зарегистрировано для отслеживания`
          );
          await sleep(2000); // Пауза для блокчейн операций
        } catch (error) {
          log(
            `Ошибка регистрации оборудования ${item.name} для отслеживания`,
            "ERROR"
          );
        }
      }
    } else {
      createdEquipment = existingEquipment;
      log("Используем уже зарегистрированное оборудование");
    }
  } catch (error) {
    log("Ошибка получения списка оборудования для отслеживания", "ERROR");
  }
};

/**
 * Создание передач оборудования
 */
const createTransfers = async () => {
  log("Создание передач оборудования...");

  if (createdEquipment.length === 0) {
    log("Нет оборудования для создания передач", "WARNING");
    return;
  }

  const recipients = ["engineer_petrov", "operator_sidorov", "analyst_kozlova"];

  for (
    let i = 0;
    i < Math.min(createdEquipment.length, recipients.length);
    i++
  ) {
    const equipment = createdEquipment[i];
    const recipient = recipients[i];

    try {
      const transferData = {
        equipmentId: equipment.id || equipment._id,
        toHolderId: recipient,
        transferReason: `Выдача оборудования сотруднику ${recipient} для выполнения рабочих задач`,
        notes: `Плановая выдача оборудования ${
          equipment.name || equipment.serialNumber
        }`,
      };

      await makeRequest(
        "POST",
        `${API_CONFIG.tracking}/transfer`,
        transferData,
        {
          Authorization: `Bearer ${authToken}`,
        }
      );

      log(
        `✓ Передача оборудования "${
          equipment.name || equipment.serialNumber
        }" пользователю ${recipient}`
      );
      await sleep(3000); // Пауза для блокчейн операций
    } catch (error) {
      log(
        `Ошибка передачи оборудования ${
          equipment.name || equipment.serialNumber
        }`,
        "ERROR"
      );
    }
  }
};

/**
 * Создание расходных транзакций
 */
const createIssueTransactions = async () => {
  log("Создание расходных транзакций...");

  const recipients = ["engineer_petrov", "operator_sidorov", "analyst_kozlova"];

  for (let i = 0; i < Math.min(createdItems.length, recipients.length); i++) {
    const item = createdItems[i];
    const recipient = recipients[i];

    try {
      const transactionData = {
        item_id: item.id,
        transaction_type: "issue",
        quantity: 1,
        responsible_user: "warehouse_manager",
        destination_user: recipient,
        reason: "Выдача для работы",
        notes: `Выдано сотруднику ${recipient} для выполнения рабочих задач`,
      };

      await makeRequest(
        "POST",
        `${API_CONFIG.warehouse}/transactions`,
        transactionData,
        {
          Authorization: `Bearer ${authToken}`,
        }
      );

      log(`✓ Расходная транзакция для "${item.name}" создана`);
      await sleep(500);
    } catch (error) {
      log(`Ошибка создания расходной транзакции для ${item.name}`, "ERROR");
    }
  }
};

/**
 * Создание уведомлений
 */
const createNotifications = async () => {
  log("Создание демо уведомлений...");

  const notifications = [
    {
      userId: "admin",
      title: "Система запущена",
      message: "Система управления складом успешно запущена и готова к работе",
      type: "info",
    },
    {
      userId: "warehouse_manager",
      title: "Низкий остаток оборудования",
      message:
        "Остаток газоанализаторов ГА-200 приближается к минимальному уровню",
      type: "warning",
    },
    {
      userId: "engineer_petrov",
      title: "Оборудование выдано",
      message: "Вам выдан ноутбук Dell XPS 13 для выполнения рабочих задач",
      type: "success",
    },
  ];

  for (const notificationData of notifications) {
    try {
      await makeRequest(
        "POST",
        `${API_CONFIG.notification}/api/notifications/create`,
        notificationData,
        {
          Authorization: `Bearer ${authToken}`,
        }
      );

      log(`✓ Уведомление для ${notificationData.userId} создано`);
      await sleep(300);
    } catch (error) {
      log(
        `Ошибка создания уведомления для ${notificationData.userId}`,
        "ERROR"
      );
    }
  }
};

/**
 * Создание графиков технического обслуживания
 */
const createMaintenanceSchedules = async () => {
  log("Создание графиков технического обслуживания...");

  // Если нет зарегистрированного оборудования, используем демо данные
  if (createdEquipment.length === 0) {
    log("Оборудование для отслеживания не найдено, создаем демо графики...");

    // Получаем список существующего оборудования
    try {
      const existingEquipment = await makeRequest(
        "GET",
        `${API_CONFIG.tracking}/equipment`,
        null,
        {
          Authorization: `Bearer ${authToken}`,
        }
      );

      if (existingEquipment.length === 0) {
        log(
          "Нет доступного оборудования для создания графиков обслуживания",
          "WARN"
        );
        return;
      }

      // Создаем графики для первых 3 единиц оборудования
      const equipmentToSchedule = existingEquipment.slice(0, 3);

      for (let i = 0; i < equipmentToSchedule.length; i++) {
        const equipment = equipmentToSchedule[i];

        // Создаем различные типы обслуживания
        const maintenanceTypes = [
          {
            maintenance_type: "preventive",
            description: "Профилактическое техническое обслуживание",
            priority: "medium",
            scheduled_days_ahead: 14,
          },
          {
            maintenance_type: "calibration",
            description: "Калибровка и настройка оборудования",
            priority: "high",
            scheduled_days_ahead: 7,
          },
          {
            maintenance_type: "corrective",
            description: "Плановый ремонт и замена изношенных деталей",
            priority: "low",
            scheduled_days_ahead: 30,
          },
        ];

        for (let j = 0; j < maintenanceTypes.length; j++) {
          const maintenanceType = maintenanceTypes[j];

          try {
            const scheduledDate = new Date();
            scheduledDate.setDate(
              scheduledDate.getDate() + maintenanceType.scheduled_days_ahead
            );

            const maintenanceData = {
              equipment_id: equipment._id || equipment.id,
              maintenance_type: maintenanceType.maintenance_type,
              description: maintenanceType.description,
              scheduled_date: scheduledDate.toISOString(),
              status: "scheduled",
              responsible_technician: "Техник Иванов И.И.",
              estimated_duration_hours: 2 + Math.floor(Math.random() * 4),
              priority: maintenanceType.priority,
              cost_estimate: 1000 + Math.floor(Math.random() * 5000),
              notes: `Автоматически созданный график обслуживания для ${equipment.name}`,
              parts_required: [
                {
                  part_name: "Фильтр воздушный",
                  quantity: 1,
                  estimated_cost: 150,
                },
                {
                  part_name: "Смазочное масло",
                  quantity: 2,
                  estimated_cost: 200,
                },
              ],
              checklist: [
                {
                  task: "Визуальный осмотр корпуса",
                  completed: false,
                },
                {
                  task: "Проверка электрических соединений",
                  completed: false,
                },
                {
                  task: "Смазка движущихся частей",
                  completed: false,
                },
                {
                  task: "Тестирование функциональности",
                  completed: false,
                },
                {
                  task: "Обновление документации",
                  completed: false,
                },
              ],
              created_by: "demo_script",
            };

            const schedule = await makeRequest(
              "POST",
              `${API_CONFIG.tracking}/maintenance-schedules`,
              maintenanceData,
              {
                Authorization: `Bearer ${authToken}`,
              }
            );

            log(
              `✓ График обслуживания создан: ${maintenanceType.maintenance_type} для ${equipment.name}`
            );
            await sleep(1000);
          } catch (error) {
            log(
              `Ошибка создания графика обслуживания для ${equipment.name}: ${error.message}`,
              "ERROR"
            );
          }
        }
      }

      // Создаем несколько уже завершенных обслуживаний
      for (let i = 0; i < Math.min(2, equipmentToSchedule.length); i++) {
        const equipment = equipmentToSchedule[i];

        try {
          const completedDate = new Date();
          completedDate.setDate(completedDate.getDate() - 15); // 15 дней назад

          const completedMaintenanceData = {
            equipment_id: equipment._id || equipment.id,
            maintenance_type: "preventive",
            description: "Завершенное профилактическое обслуживание",
            scheduled_date: completedDate.toISOString(),
            completed_date: completedDate.toISOString(),
            status: "completed",
            responsible_technician: "Техник Петров П.П.",
            estimated_duration_hours: 3,
            actual_duration_hours: 2.5,
            priority: "medium",
            cost_estimate: 2000,
            actual_cost: 1800,
            notes: "Обслуживание выполнено в срок, замены не требовались",
            parts_required: [
              {
                part_name: "Расходные материалы",
                quantity: 1,
                estimated_cost: 100,
              },
            ],
            checklist: [
              {
                task: "Визуальный осмотр корпуса",
                completed: true,
                completed_by: "Техник Петров П.П.",
                completed_at: completedDate.toISOString(),
              },
              {
                task: "Проверка электрических соединений",
                completed: true,
                completed_by: "Техник Петров П.П.",
                completed_at: completedDate.toISOString(),
              },
              {
                task: "Обновление документации",
                completed: true,
                completed_by: "Техник Петров П.П.",
                completed_at: completedDate.toISOString(),
              },
            ],
            created_by: "demo_script",
          };

          await makeRequest(
            "POST",
            `${API_CONFIG.tracking}/maintenance-schedules`,
            completedMaintenanceData,
            {
              Authorization: `Bearer ${authToken}`,
            }
          );

          log(`✓ Завершенное обслуживание создано для ${equipment.name}`);
          await sleep(1000);
        } catch (error) {
          log(
            `Ошибка создания завершенного обслуживания для ${equipment.name}: ${error.message}`,
            "ERROR"
          );
        }
      }

      log(
        `🔧 Создано графиков обслуживания: ${
          equipmentToSchedule.length * 3 + 2
        }`
      );
    } catch (error) {
      log(
        `Ошибка при получении списка оборудования: ${error.message}`,
        "ERROR"
      );
    }
  }
};

/**
 * Вывод итогового отчета
 */
const printSummary = async () => {
  log("=".repeat(50));
  log("ИТОГОВЫЙ ОТЧЕТ ПО СОЗДАННЫМ ДЕМО ДАННЫМ");
  log("=".repeat(50));

  try {
    // Статистика пользователей
    const users = await makeRequest("GET", `${API_CONFIG.auth}/users`, null, {
      Authorization: `Bearer ${authToken}`,
    });
    log(`👥 Пользователи: ${users.length} (включая админа)`);

    // Статистика оборудования
    const items = await makeRequest(
      "GET",
      `${API_CONFIG.warehouse}/items`,
      null,
      {
        Authorization: `Bearer ${authToken}`,
      }
    );
    log(`📦 Оборудование на складе: ${items.length}`);

    // Статистика транзакций
    const transactions = await makeRequest(
      "GET",
      `${API_CONFIG.warehouse}/transactions`,
      null,
      {
        Authorization: `Bearer ${authToken}`,
      }
    );
    log(`🔄 Транзакции: ${transactions.length}`);

    // Статистика накладных
    const invoices = await makeRequest(
      "GET",
      `${API_CONFIG.warehouse}/invoices`,
      null,
      {
        Authorization: `Bearer ${authToken}`,
      }
    );
    log(`📋 Накладные: ${invoices.length}`);

    // Статистика отслеживания
    const equipment = await makeRequest(
      "GET",
      `${API_CONFIG.tracking}/equipment`,
      null,
      {
        Authorization: `Bearer ${authToken}`,
      }
    );
    log(`🏷️  Оборудование для отслеживания: ${equipment.length}`);
  } catch (error) {
    log("Ошибка получения статистики", "ERROR");
  }

  log("=".repeat(50));
  log("ДЕМО ДАННЫЕ УСПЕШНО СОЗДАНЫ!");
  log("=".repeat(50));
  log("");
  log("Для доступа к системе используйте:");
  log("👤 Администратор: admin / admin123");
  log("👤 Менеджер склада: warehouse_manager / manager123");
  log("👤 Инженер: engineer_petrov / engineer123");
  log("👤 Оператор: operator_sidorov / operator123");
  log("👤 Аналитик: analyst_kozlova / analyst123");
  log("");
  log("🌐 Frontend: http://localhost");
  log("📚 API Docs: http://localhost:8000/swagger (если доступно)");
};

/**
 * Основная функция
 */
const main = async () => {
  try {
    log("🚀 Запуск скрипта создания демо данных...");

    await checkServices();
    await createAdminUser();
    await createDemoUsers();
    await createWarehouseItems();
    await createTransactions();
    await createInvoices();
    await registerEquipmentForTracking();
    await createTransfers();
    await createIssueTransactions();
    await createNotifications();
    await createMaintenanceSchedules();
    await printSummary();
  } catch (error) {
    log(`Критическая ошибка: ${error.message}`, "ERROR");
    process.exit(1);
  }
};

// Запуск скрипта
if (require.main === module) {
  main();
}

module.exports = {
  main,
  createAdminUser,
  createDemoUsers,
  createWarehouseItems,
  createTransactions,
  createInvoices,
  registerEquipmentForTracking,
  createTransfers,
  createIssueTransactions,
  createNotifications,
  createMaintenanceSchedules,
};
