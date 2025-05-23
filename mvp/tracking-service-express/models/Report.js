const mongoose = require("mongoose");

// Схема элемента отчета о передвижении (перемещении) оборудования
const reportTransferItemSchema = mongoose.Schema({
  equipmentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Equipment",
  },
  equipmentName: {
    type: String,
    required: true,
  },
  serialNumber: {
    type: String,
    required: true,
  },
  category: {
    type: String,
  },
  fromHolder: {
    id: {
      type: String,
      default: null,
    },
    name: {
      type: String,
      required: true,
    },
    position: {
      type: String,
    },
  },
  toHolder: {
    id: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    position: {
      type: String,
    },
  },
  transferDate: {
    type: Date,
    required: true,
  },
  transferReason: {
    type: String,
    required: true,
  },
  blockchainTxId: {
    type: String,
    default: null,
  },
});

// Основная схема отчета
const reportSchema = mongoose.Schema(
  {
    number: {
      type: String,
      required: true,
      unique: true,
    },
    title: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["individual", "department", "period"],
    },
    status: {
      type: String,
      required: true,
      enum: ["draft", "final"],
      default: "final",
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    createdBy: {
      id: {
        type: String,
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
      position: {
        type: String,
      },
    },
    transfers: [reportTransferItemSchema],
    notes: {
      type: String,
    },
    equipmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Equipment",
    },
    departmentId: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Report", reportSchema);
