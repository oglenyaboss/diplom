const asyncHandler = require("express-async-handler");
const Equipment = require("../models/Equipment");
const { registerInBlockchain } = require("../services/blockchainService");

// @desc    Register new equipment
// @route   POST /equipment
// @access  Private
const registerEquipment = asyncHandler(async (req, res) => {
  const {
    name,
    serial_number,
    category,
    description,
    manufacturer,
    purchase_date,
    warranty_expiry,
    location,
    current_holder_id,
  } = req.body;

  // Check if equipment already exists
  const equipmentExists = await Equipment.findOne({
    serialNumber: serial_number,
  });
  if (equipmentExists) {
    res.status(400);
    throw new Error("Equipment with this serial number already exists");
  }

  // Create equipment in database
  const equipment = await Equipment.create({
    name,
    serialNumber: serial_number,
    category,
    description,
    manufacturer,
    purchaseDate: purchase_date,
    warrantyExpiry: warranty_expiry,
    status: "active",
    location,
    currentHolderId: current_holder_id,
  });

  // Try to register in blockchain if available
  let blockchainId = null;
  try {
    blockchainId = await registerInBlockchain(
      equipment.name,
      equipment.serialNumber,
      equipment.currentHolderId // Передаем ID начального владельца
    );
    if (blockchainId) {
      equipment.blockchainId = blockchainId;
      await equipment.save();
      console.log(
        `Equipment registered in blockchain with ID: ${blockchainId}`
      );
    } else {
      console.warn("Blockchain registration returned null ID");
    }
  } catch (error) {
    // Don't fail if blockchain registration fails
    console.error("Blockchain registration failed:", error.message);
    if (error.code) {
      console.error("Error code:", error.code);
    }
    if (error.reason) {
      console.error("Error reason:", error.reason);
    }
  }

  res.status(201).json({
    message: "Equipment registered successfully",
    equipment: {
      id: equipment._id,
      name: equipment.name,
      serial_number: equipment.serialNumber,
      category: equipment.category,
      description: equipment.description,
      manufacturer: equipment.manufacturer,
      purchase_date: equipment.purchaseDate,
      warranty_expiry: equipment.warrantyExpiry,
      status: equipment.status,
      location: equipment.location,
      current_holder_id: equipment.currentHolderId,
      created_at: equipment.createdAt,
      updated_at: equipment.updatedAt,
      blockchain_id: equipment.blockchainId,
    },
  });
});

// @desc    Get equipment by ID
// @route   GET /equipment/:id
// @access  Private
const getEquipment = asyncHandler(async (req, res) => {
  const equipment = await Equipment.findById(req.params.id);

  if (!equipment) {
    res.status(404);
    throw new Error("Equipment not found");
  }

  res.status(200).json({
    id: equipment._id,
    name: equipment.name,
    serial_number: equipment.serialNumber,
    category: equipment.category,
    description: equipment.description,
    manufacturer: equipment.manufacturer,
    purchase_date: equipment.purchaseDate,
    warranty_expiry: equipment.warrantyExpiry,
    status: equipment.status,
    location: equipment.location,
    current_holder_id: equipment.currentHolderId,
    created_at: equipment.createdAt,
    updated_at: equipment.updatedAt,
    blockchain_id: equipment.blockchainId,
  });
});

// @desc    List all equipment with optional filters
// @route   GET /equipment
// @access  Private
const listEquipment = asyncHandler(async (req, res) => {
  const { category, location, holder } = req.query;

  // Build filter object
  const filter = {};
  if (category) filter.category = category;
  if (location) filter.location = location;
  if (holder) filter.currentHolderId = holder;

  const equipment = await Equipment.find(filter);

  const items = equipment.map((item) => ({
    id: item._id,
    name: item.name,
    serial_number: item.serialNumber,
    category: item.category,
    description: item.description,
    manufacturer: item.manufacturer,
    status: item.status,
    location: item.location,
    current_holder_id: item.currentHolderId,
    blockchain_id: item.blockchainId,
  }));

  res.status(200).json({
    items,
  });
});

// @desc    Update equipment
// @route   PUT /equipment/:id
// @access  Private
const updateEquipment = asyncHandler(async (req, res) => {
  const equipment = await Equipment.findById(req.params.id);

  if (!equipment) {
    res.status(404);
    throw new Error("Equipment not found");
  }

  // Convert snake_case to camelCase
  const updateData = {};
  if (req.body.name) updateData.name = req.body.name;
  if (req.body.serial_number) updateData.serialNumber = req.body.serial_number;
  if (req.body.category) updateData.category = req.body.category;
  if (req.body.description) updateData.description = req.body.description;
  if (req.body.manufacturer) updateData.manufacturer = req.body.manufacturer;
  if (req.body.purchase_date) updateData.purchaseDate = req.body.purchase_date;
  if (req.body.warranty_expiry)
    updateData.warrantyExpiry = req.body.warranty_expiry;
  if (req.body.status) updateData.status = req.body.status;
  if (req.body.location) updateData.location = req.body.location;
  if (req.body.current_holder_id)
    updateData.currentHolderId = req.body.current_holder_id;

  const updatedEquipment = await Equipment.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  );

  res.status(200).json({
    message: "Equipment updated successfully",
  });
});

// @desc    Delete equipment
// @route   DELETE /equipment/:id
// @access  Private
const deleteEquipment = asyncHandler(async (req, res) => {
  const equipment = await Equipment.findById(req.params.id);

  if (!equipment) {
    res.status(404);
    throw new Error("Equipment not found");
  }

  await equipment.remove();

  res.status(200).json({
    message: "Equipment deleted successfully",
  });
});

module.exports = {
  registerEquipment,
  getEquipment,
  listEquipment,
  updateEquipment,
  deleteEquipment,
};
