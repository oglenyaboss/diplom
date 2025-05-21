const mongoose = require("mongoose");

const transferSchema = mongoose.Schema(
  {
    equipmentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Equipment",
    },
    fromHolderId: {
      type: String,
    },
    toHolderId: {
      type: String,
      required: true,
    },
    transferDate: {
      type: Date,
      default: Date.now,
    },
    transferReason: {
      type: String,
      required: true,
    },
    blockchainTxId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Transfer", transferSchema);
