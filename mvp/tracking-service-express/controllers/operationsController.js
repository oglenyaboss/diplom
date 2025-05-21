const asyncHandler = require("express-async-handler");
const Transfer = require("../models/Transfer");

// @desc    Get recent operations
// @route   GET /operations/recent
// @access  Private
const getRecentOperations = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 5;

  // Get recent transfers
  const recentTransfers = await Transfer.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate({
      path: "equipmentId",
      select: "name serialNumber category",
    });

  const operations = recentTransfers.map((transfer) => ({
    id: transfer._id,
    equipment_id: transfer.equipmentId._id,
    equipment_name: transfer.equipmentId.name,
    equipment_serial: transfer.equipmentId.serialNumber,
    from_holder_id: transfer.fromHolderId,
    to_holder_id: transfer.toHolderId,
    transfer_date: transfer.transferDate,
    transfer_reason: transfer.transferReason,
    blockchain_tx_id: transfer.blockchainTxId,
  }));

  res.status(200).json({
    operations,
  });
});

module.exports = {
  getRecentOperations,
};
