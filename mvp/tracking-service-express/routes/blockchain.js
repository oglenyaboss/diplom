const express = require("express");
const router = express.Router();
const {
  registerEquipmentInBlockchain,
  getBlockchainHistoryForEquipment,
} = require("../controllers/blockchainController");

router.post("/register", registerEquipmentInBlockchain);
router.get("/history/:equipment_id", getBlockchainHistoryForEquipment);

module.exports = router;
