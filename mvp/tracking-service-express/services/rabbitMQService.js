const amqp = require("amqplib");
const Equipment = require("../models/Equipment");
const { logger } = require("../middleware/logger");
const { registerInBlockchain } = require("./blockchainService");

// Константы для RabbitMQ
const EXCHANGE_NAME = "warehouse_exchange";
const EQUIPMENT_CREATED_KEY = "equipment.created";
const EQUIPMENT_CREATED_QUEUE = "equipment_created_queue";

const TRANSFER_EXCHANGE = "tracking_exchange";
const TRANSFER_KEY = "equipment.transferred";
const TRANSFER_QUEUE = "equipment_transferred_queue";

let connection = null;
let channel = null;

/**
 * Инициализация соединения с RabbitMQ
 */
const initRabbitMQ = async () => {
  try {
    // Получаем URI из переменной окружения или используем значение по умолчанию
    const rabbitURI =
      process.env.RABBITMQ_URI || "amqp://guest:guest@localhost:5672/";

    // Подключение к RabbitMQ
    connection = await amqp.connect(rabbitURI);
    logger.info(`Connected to RabbitMQ at ${rabbitURI}`);

    // Создание канала
    channel = await connection.createChannel();

    // Настройка для получения сообщений о создании оборудования
    await channel.assertExchange(EXCHANGE_NAME, "direct", { durable: true });
    await channel.assertQueue(EQUIPMENT_CREATED_QUEUE, { durable: true });
    await channel.bindQueue(
      EQUIPMENT_CREATED_QUEUE,
      EXCHANGE_NAME,
      EQUIPMENT_CREATED_KEY
    );

    // Настройка для публикации сообщений о передаче оборудования
    await channel.assertExchange(TRANSFER_EXCHANGE, "direct", {
      durable: true,
    });
    await channel.assertQueue(TRANSFER_QUEUE, { durable: true });
    await channel.bindQueue(TRANSFER_QUEUE, TRANSFER_EXCHANGE, TRANSFER_KEY);

    // Слушаем сообщения о создании оборудования
    await consumeEquipmentCreatedMessages();

    logger.info("RabbitMQ initialization completed");
    return true;
  } catch (error) {
    logger.error(`Failed to initialize RabbitMQ: ${error.message}`);
    return false;
  }
};

/**
 * Потребитель сообщений о создании оборудования
 */
const consumeEquipmentCreatedMessages = async () => {
  if (!channel) {
    logger.warn("RabbitMQ channel is not initialized");
    return;
  }

  try {
    await channel.consume(EQUIPMENT_CREATED_QUEUE, async (msg) => {
      if (msg) {
        try {
          const content = JSON.parse(msg.content.toString());
          logger.info(`Received equipment created message: ${content.id}`);

          // Проверяем, существует ли оборудование с таким serial_number
          const existingEquipment = await Equipment.findOne({
            serialNumber: content.serial_number,
          });

          if (!existingEquipment) {
            // Создаем новое оборудование в tracking-service
            const newEquipment = new Equipment({
              name: content.name,
              serialNumber: content.serial_number,
              category: content.category,
              description: content.description || "",
              manufacturer: content.manufacturer,
              purchaseDate: content.purchase_date,
              warrantyExpiry: content.warranty_expiry,
              // Map "available" status to "active" since it's not in the allowed enum values
              status:
                content.status === "available"
                  ? "active"
                  : content.status || "active",
              location: content.location || "Warehouse",
              // Если current_holder_id пуст или не указан, то это склад (null)
              currentHolderId: content.current_holder_id
                ? content.current_holder_id
                : null,
            });

            await newEquipment.save();
            logger.info(
              `Created new equipment from message: ${newEquipment._id}`
            );

            // Регистрируем в блокчейне, как в equipmentController
            try {
              const blockchainId = await registerInBlockchain(
                newEquipment.name,
                newEquipment.serialNumber,
                newEquipment.currentHolderId // Передаем ID начального владельца
              );

              if (blockchainId) {
                newEquipment.blockchainId = blockchainId;
                await newEquipment.save();
                logger.info(
                  `Equipment registered in blockchain with ID: ${blockchainId}`
                );
              } else {
                logger.warn("Blockchain registration returned null ID");
              }
            } catch (error) {
              // Не прерываем процесс, если регистрация в блокчейне не удалась
              logger.error("Blockchain registration failed:", error.message);
              if (error.code) {
                logger.error("Error code:", error.code);
              }
              if (error.reason) {
                logger.error("Error reason:", error.reason);
              }
            }
          } else {
            logger.info(
              `Equipment with serial number ${content.serial_number} already exists`
            );
          }

          // Подтверждаем обработку сообщения
          channel.ack(msg);
        } catch (error) {
          logger.error(
            `Error processing equipment created message: ${error.message}`
          );

          // Определяем, является ли ошибка неисправимой (например, валидация схемы)
          const isUnrecoverableError =
            error.name === "ValidationError" ||
            error.name === "MongoServerError";

          if (isUnrecoverableError) {
            logger.warn(
              `Discarding unrecoverable message due to: ${error.name}`
            );
            // Если ошибка неисправимая (например, проблема с валидацией),
            // подтверждаем сообщение, чтобы предотвратить бесконечные повторы
            channel.ack(msg);
          } else {
            // Для других ошибок (например, временные проблемы с подключением)
            // возвращаем сообщение в очередь для повторной обработки
            channel.nack(msg, false, true);
          }
        }
      }
    });

    logger.info(
      `Listening for equipment created messages on queue: ${EQUIPMENT_CREATED_QUEUE}`
    );
  } catch (error) {
    logger.error(`Failed to consume messages: ${error.message}`);
  }
};

/**
 * Публикация сообщения о передаче оборудования
 * @param {Object} transfer - Объект передачи оборудования
 * @param {Object} equipment - Объект оборудования
 */
const publishTransferMessage = async (transfer, equipment) => {
  if (!channel) {
    logger.warn("RabbitMQ channel is not initialized");
    return;
  }

  try {
    const message = {
      transfer_id: transfer._id.toString(),
      equipment_id: equipment._id.toString(),
      equipment_name: equipment.name,
      serial_number: equipment.serialNumber,
      from_holder_id: transfer.fromHolderId,
      to_holder_id: transfer.toHolderId,
      transfer_date: transfer.transferDate,
      transfer_reason: transfer.transferReason,
      blockchain_tx_id: transfer.blockchainTxId,
    };

    await channel.publish(
      TRANSFER_EXCHANGE,
      TRANSFER_KEY,
      Buffer.from(JSON.stringify(message)),
      { contentType: "application/json" }
    );

    logger.info(`Published transfer message for equipment: ${equipment._id}`);
    return true;
  } catch (error) {
    logger.error(`Failed to publish transfer message: ${error.message}`);
    return false;
  }
};

/**
 * Закрытие соединения с RabbitMQ
 */
const closeRabbitMQ = async () => {
  try {
    if (channel) {
      await channel.close();
    }
    if (connection) {
      await connection.close();
    }
    logger.info("RabbitMQ connection closed");
  } catch (error) {
    logger.error(`Error closing RabbitMQ connection: ${error.message}`);
  }
};

/**
 * Проверка соединения с RabbitMQ
 * @returns {boolean} Статус соединения
 */
const isConnected = () => {
  return connection !== null && connection.connection.serverProperties !== null;
};

module.exports = {
  initRabbitMQ,
  publishTransferMessage,
  closeRabbitMQ,
  isConnected,
};
