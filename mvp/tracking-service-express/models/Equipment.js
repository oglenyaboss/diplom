const mongoose = require("mongoose");

const equipmentSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please add a name"],
      trim: true,
    },
    serialNumber: {
      type: String,
      required: [true, "Please add a serial number"],
      unique: true,
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Please add a category"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    manufacturer: {
      type: String,
      required: [true, "Please add a manufacturer"],
      trim: true,
    },
    purchaseDate: {
      type: Date,
      required: [true, "Please add a purchase date"],
    },
    warrantyExpiry: {
      type: Date,
    },
    status: {
      type: String,
      required: true,
      enum: ["active", "maintenance", "decommissioned"],
      default: "active",
    },
    location: {
      type: String,
      required: [true, "Please add a location"],
      trim: true,
    },
    currentHolderId: {
      type: String,
      default: null,
    },
    blockchainId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Equipment", equipmentSchema);
