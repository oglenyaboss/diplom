const mongoose = require("mongoose");

const maintenanceScheduleSchema = mongoose.Schema(
  {
    equipment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Equipment",
      required: [true, "Please add equipment ID"],
    },
    maintenance_type: {
      type: String,
      required: [true, "Please add maintenance type"],
      enum: ["preventive", "corrective", "emergency", "calibration"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Please add description"],
      trim: true,
    },
    scheduled_date: {
      type: Date,
      required: [true, "Please add scheduled date"],
    },
    next_maintenance_date: {
      type: Date,
    },
    completed_date: {
      type: Date,
    },
    status: {
      type: String,
      required: true,
      enum: ["scheduled", "in_progress", "completed", "cancelled", "overdue"],
      default: "scheduled",
    },
    responsible_technician: {
      type: String,
      required: [true, "Please add responsible technician"],
      trim: true,
    },
    estimated_duration_hours: {
      type: Number,
      min: [0.5, "Duration must be at least 0.5 hours"],
      max: [168, "Duration cannot exceed 168 hours (1 week)"],
    },
    actual_duration_hours: {
      type: Number,
      min: [0, "Actual duration cannot be negative"],
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    cost_estimate: {
      type: Number,
      min: [0, "Cost estimate cannot be negative"],
    },
    actual_cost: {
      type: Number,
      min: [0, "Actual cost cannot be negative"],
    },
    notes: {
      type: String,
      trim: true,
    },
    parts_required: [
      {
        part_name: {
          type: String,
          required: true,
          trim: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: [1, "Quantity must be at least 1"],
        },
        estimated_cost: {
          type: Number,
          min: [0, "Cost cannot be negative"],
        },
      },
    ],
    checklist: [
      {
        task: {
          type: String,
          required: true,
          trim: true,
        },
        completed: {
          type: Boolean,
          default: false,
        },
        completed_by: {
          type: String,
          trim: true,
        },
        completed_at: {
          type: Date,
        },
        notes: {
          type: String,
          trim: true,
        },
      },
    ],
    created_by: {
      type: String,
      required: [true, "Please add creator"],
      trim: true,
    },
    updated_by: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Индексы для оптимизации производительности
maintenanceScheduleSchema.index({ equipment_id: 1, scheduled_date: 1 });
maintenanceScheduleSchema.index({ status: 1 });
maintenanceScheduleSchema.index({ responsible_technician: 1 });
maintenanceScheduleSchema.index({ next_maintenance_date: 1 });
maintenanceScheduleSchema.index({ priority: 1, status: 1 });

// Middleware для обновления статуса на "overdue"
maintenanceScheduleSchema.pre("find", function () {
  const currentDate = new Date();
  this.updateMany(
    {
      scheduled_date: { $lt: currentDate },
      status: "scheduled",
    },
    {
      $set: { status: "overdue" },
    }
  );
});

// Middleware для автоматического вычисления следующей даты обслуживания
maintenanceScheduleSchema.pre("save", function (next) {
  if (this.completed_date && this.maintenance_type === "preventive") {
    // Для профилактического обслуживания устанавливаем следующую дату через 6 месяцев
    const nextDate = new Date(this.completed_date);
    nextDate.setMonth(nextDate.getMonth() + 6);
    this.next_maintenance_date = nextDate;
  }
  next();
});

// Виртуальное поле для проверки просроченности
maintenanceScheduleSchema.virtual("is_overdue").get(function () {
  if (this.status === "completed" || this.status === "cancelled") {
    return false;
  }
  return new Date() > this.scheduled_date;
});

// Виртуальное поле для получения дней до обслуживания
maintenanceScheduleSchema.virtual("days_until_maintenance").get(function () {
  if (this.status === "completed" || this.status === "cancelled") {
    return null;
  }
  const diffTime = this.scheduled_date.getTime() - new Date().getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Включаем виртуальные поля в JSON
maintenanceScheduleSchema.set("toJSON", { virtuals: true });
maintenanceScheduleSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model(
  "MaintenanceSchedule",
  maintenanceScheduleSchema
);
