const express = require("express");
const router = express.Router();
const { getRecentOperations } = require("../controllers/operationsController");

router.get("/recent", getRecentOperations);

module.exports = router;
