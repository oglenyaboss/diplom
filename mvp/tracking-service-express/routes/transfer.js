const express = require("express");
const router = express.Router();
const {
  transferEquipment,
  getTransferHistory,
} = require("../controllers/transferController");

router.post("/", transferEquipment);
router.get("/history/:equipment_id", getTransferHistory);

module.exports = router;
