const express = require("express");
const router = express.Router();
const {
  registerEquipment,
  getEquipment,
  listEquipment,
  updateEquipment,
  deleteEquipment,
} = require("../controllers/equipmentController");

router.post("/", registerEquipment);
router.get("/:id", getEquipment);
router.get("/", listEquipment);
router.put("/:id", updateEquipment);
router.delete("/:id", deleteEquipment);

module.exports = router;
