const asyncHandler = require("express-async-handler");
const Equipment = require("../models/Equipment");
const Transfer = require("../models/Transfer");
const { transferInBlockchain } = require("../services/blockchainService");
const { publishTransferMessage } = require("../services/rabbitMQService");
const { logger } = require("../middleware/logger");

// @desc    Transfer equipment to new holder
// @route   POST /transfer
// @access  Private
const transferEquipment = asyncHandler(async (req, res) => {
  const { equipment_id, from_holder_id, to_holder_id, transfer_reason } =
    req.body;

  // Check if equipment exists
  const equipment = await Equipment.findById(equipment_id);
  if (!equipment) {
    res.status(404);
    throw new Error("Equipment not found");
  }

  // Special case for warehouse (address 0)
  // If the equipment is held in warehouse, indicated by null or "0" holder ID
  if (
    (from_holder_id === null ||
      from_holder_id === "0" ||
      from_holder_id === 0) &&
    (equipment.currentHolderId === null ||
      equipment.currentHolderId === "0" ||
      equipment.currentHolderId === 0)
  ) {
    logger.info(
      `Equipment is in warehouse, proceeding with transfer to ${to_holder_id}`
    );
  }
  // Verify current holder for non-warehouse transfers
  else if (equipment.currentHolderId !== from_holder_id) {
    res.status(400);
    throw new Error("From holder is not the current holder of this equipment");
  }

  // Create transfer record
  const transfer = await Transfer.create({
    equipmentId: equipment_id,
    fromHolderId: from_holder_id,
    toHolderId: to_holder_id,
    transferReason: transfer_reason,
    transferDate: new Date(),
  });

  // Update equipment current holder
  equipment.currentHolderId = to_holder_id;
  equipment.updatedAt = new Date();
  await equipment.save();

  // Try to record transfer in blockchain if available
  let blockchainTxId = null;
  try {
    if (equipment.blockchainId) {
      console.log(
        `Attempting blockchain transfer for equipment ID: ${equipment.blockchainId}`
      );
      logger.info(`Blockchain transfer details:
        - Equipment ID: ${equipment_id}
        - Blockchain ID: ${equipment.blockchainId}
        - From holder: ${from_holder_id}
        - To holder: ${to_holder_id}
        - Current holder in DB: ${equipment.currentHolderId}
        - Reason: ${transfer_reason}
      `);

      blockchainTxId = await transferInBlockchain(
        equipment.blockchainId,
        from_holder_id,
        to_holder_id,
        transfer_reason
      );

      if (blockchainTxId) {
        transfer.blockchainTxId = blockchainTxId;
        await transfer.save();
        console.log(
          `Equipment transfer recorded in blockchain, tx: ${blockchainTxId}`
        );
        logger.info(
          `Blockchain transaction completed successfully: ${blockchainTxId}`
        );
      } else {
        console.warn("Blockchain transfer returned null transaction ID");
        logger.warn("Blockchain transfer returned null transaction ID");
      }
    } else {
      console.warn(
        `Equipment ${equipment_id} does not have a blockchain ID, skipping blockchain transfer`
      );
    }
  } catch (error) {
    // Don't fail if blockchain transfer fails
    logger.error(`Blockchain transfer failed: ${error.message}`);
    if (error.code) {
      logger.error(`Error code: ${error.code}`);
    }
    if (error.reason) {
      logger.error(`Error reason: ${error.reason}`);
    }
  }

  // Публикуем сообщение в RabbitMQ
  try {
    await publishTransferMessage(transfer, equipment);
  } catch (error) {
    logger.error(
      `Failed to publish transfer message to RabbitMQ: ${error.message}`
    );
    // Продолжаем работу даже если не удалось отправить сообщение
  }

  res.status(200).json({
    message: "Equipment transferred successfully",
    transfer: {
      id: transfer._id,
      equipment_id: transfer.equipmentId,
      from_holder_id: transfer.fromHolderId,
      to_holder_id: transfer.toHolderId,
      transfer_date: transfer.transferDate,
      transfer_reason: transfer.transferReason,
      blockchain_tx_id: transfer.blockchainTxId,
    },
  });
});

// @desc    Get transfer history for an equipment
// @route   GET /transfer/history/:equipment_id
// @access  Private
const getTransferHistory = asyncHandler(async (req, res) => {
  const equipmentId = req.params.equipment_id;

  // Check if equipment exists
  const equipment = await Equipment.findById(equipmentId);
  if (!equipment) {
    res.status(404);
    throw new Error("Equipment not found");
  }

  // Get transfer history
  const transfers = await Transfer.find({ equipmentId }).sort({
    transferDate: -1,
  });

  const history = transfers.map((transfer) => ({
    id: transfer._id,
    equipment_id: transfer.equipmentId,
    from_holder_id: transfer.fromHolderId,
    to_holder_id: transfer.toHolderId,
    transfer_date: transfer.transferDate,
    transfer_reason: transfer.transferReason,
    blockchain_tx_id: transfer.blockchainTxId,
  }));

  res.status(200).json({
    history,
  });
});

module.exports = {
  transferEquipment,
  getTransferHistory,
};
