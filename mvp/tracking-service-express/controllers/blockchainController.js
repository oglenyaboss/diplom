const asyncHandler = require("express-async-handler");
const Equipment = require("../models/Equipment");
const {
  registerInBlockchain,
  getBlockchainHistory,
} = require("../services/blockchainService");

// @desc    Register equipment in blockchain
// @route   POST /blockchain/register
// @access  Private
const registerEquipmentInBlockchain = asyncHandler(async (req, res) => {
  const { equipment_id } = req.body;

  // Check if equipment exists
  const equipment = await Equipment.findById(equipment_id);
  if (!equipment) {
    res.status(404);
    throw new Error("Equipment not found");
  }

  // Check if equipment already registered in blockchain
  if (equipment.blockchainId) {
    res.status(400);
    throw new Error("Equipment already registered in blockchain");
  }

  // Register equipment in blockchain
  const blockchainId = await registerInBlockchain(
    equipment.name,
    equipment.serialNumber
  );

  if (!blockchainId) {
    res.status(500);
    throw new Error("Failed to register equipment in blockchain");
  }

  // Update equipment with blockchain ID
  equipment.blockchainId = blockchainId;
  await equipment.save();

  res.status(200).json({
    message: "Equipment successfully registered in blockchain",
    equipment_id: equipment._id,
    blockchain_id: blockchainId,
  });
});

// @desc    Get blockchain history for equipment
// @route   GET /blockchain/history/:equipment_id
// @access  Private
const getBlockchainHistoryForEquipment = asyncHandler(async (req, res) => {
  const equipmentId = req.params.equipment_id;

  // Check if equipment exists
  const equipment = await Equipment.findById(equipmentId);
  if (!equipment) {
    res.status(404);
    throw new Error("Equipment not found");
  }

  // Check if equipment is registered in blockchain
  if (!equipment.blockchainId) {
    res.status(400);
    throw new Error("Equipment not registered in blockchain");
  }

  // Get blockchain history
  const history = await getBlockchainHistory(equipment.blockchainId);

  res.status(200).json({
    equipment_id: equipment._id,
    blockchain_id: equipment.blockchainId,
    blockchain_history: history,
  });
});

module.exports = {
  registerEquipmentInBlockchain,
  getBlockchainHistoryForEquipment,
};
