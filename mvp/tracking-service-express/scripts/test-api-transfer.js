// Script to test equipment transfer from warehouse via API
const axios = require("axios");
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

// Configuration
const API_BASE_URL = "http://localhost:8002"; // Tracking service URL
const AUTH_TOKEN = "your-auth-token"; // Replace with your actual auth token if needed

// Helper function to read contract details for blockchain verification
const loadContractInfo = () => {
  const addressPath = path.join(__dirname, "../contracts/contract-address.txt");
  const abiPath = path.join(__dirname, "../contracts/EquipmentTracking.json");

  if (!fs.existsSync(addressPath) || !fs.existsSync(abiPath)) {
    console.error("Contract address or ABI file not found");
    return null;
  }

  return {
    address: fs.readFileSync(addressPath, "utf8").trim(),
    abi: JSON.parse(fs.readFileSync(abiPath, "utf8")),
  };
};

// Helper to check equipment in blockchain
const checkEquipmentInBlockchain = async (blockchainId) => {
  // Connect to Ethereum node
  const nodeUrl = process.env.ETH_NODE_URL || "http://localhost:8545";
  const provider = new ethers.providers.JsonRpcProvider(nodeUrl);

  // Load contract info
  const contractInfo = loadContractInfo();
  if (!contractInfo) return null;

  // Create contract instance
  const contract = new ethers.Contract(
    contractInfo.address,
    contractInfo.abi,
    provider
  );

  // Get current holder
  try {
    const currentHolder = await contract.getCurrentHolder(blockchainId);
    console.log(
      `Current holder in blockchain for equipment ${blockchainId}: ${currentHolder}`
    );
    return currentHolder;
  } catch (error) {
    console.error(
      `Failed to get current holder from blockchain: ${error.message}`
    );
    return null;
  }
};

// Main test function
const testApiTransfer = async () => {
  try {
    console.log("=== Testing equipment transfer through API endpoints ===\n");

    // Step 1: Register new equipment
    console.log("Step 1: Registering new equipment...");
    // Format dates as strings in YYYY-MM-DD format for API compatibility
    const currentDate = new Date();
    const warrantyDate = new Date(currentDate);
    warrantyDate.setFullYear(currentDate.getFullYear() + 1); // Add 1 year

    const formatDate = (date) => {
      return date.toISOString().split("T")[0]; // Format as YYYY-MM-DD
    };

    const serialNumber = `API-TEST-${Date.now()}`;
    console.log(`Using serial number: ${serialNumber}`);

    const newEquipment = {
      name: "API Test Equipment",
      serial_number: serialNumber,
      category: "Test Equipment",
      description: "Equipment created for API transfer testing",
      manufacturer: "Test Manufacturer",
      purchase_date: formatDate(currentDate),
      warrantyExpiry: formatDate(warrantyDate),
      status: "active",
      location: "Test Location",
    };

    const registerResponse = await axios.post(
      `${API_BASE_URL}/equipment`,
      newEquipment,
      {
        headers: AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {},
      }
    );

    if (
      !registerResponse.data.equipment ||
      !registerResponse.data.equipment.id
    ) {
      throw new Error("Failed to register equipment: Invalid response");
    }

    const equipmentId = registerResponse.data.equipment.id;
    const blockchainId = registerResponse.data.equipment.blockchain_id;

    console.log(`Equipment registered successfully!`);
    console.log(`Equipment ID: ${equipmentId}`);
    console.log(
      `Blockchain ID: ${blockchainId || "Not registered in blockchain yet"}`
    );

    // Step 2: Verify equipment is in warehouse
    console.log("\nStep 2: Verifying initial state (warehouse holding)...");

    const getResponse = await axios.get(
      `${API_BASE_URL}/equipment/${equipmentId}`,
      {
        headers: AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {},
      }
    );

    console.log(getResponse.data);

    console.log(
      `Current holder in DB: ${
        getResponse.data.current_holder_id || "null (warehouse)"
      }`
    );

    if (blockchainId) {
      const currentHolder = await checkEquipmentInBlockchain(blockchainId);
      if (currentHolder === ethers.constants.AddressZero) {
        console.log(
          "✅ Verified: Equipment is held by the warehouse in blockchain"
        );
      } else {
        console.log(
          `⚠️ Warning: Equipment is not held by warehouse in blockchain. Current holder: ${currentHolder}`
        );
      }
    } else {
      console.log(
        "⚠️ Note: Equipment not yet registered in blockchain. This is normal if blockchain integration happens asynchronously."
      );
    }

    // Step 3: Transfer equipment from warehouse to a user
    console.log("\nStep 3: Transferring equipment from warehouse to user...");

    const transferPayload = {
      equipment_id: equipmentId,
      from_holder_id: null, // null indicates warehouse/zero address
      to_holder_id: "1", // Transfer to user with ID 1
      transfer_reason: "API test transfer from warehouse",
    };

    console.log("Transfer payload:", JSON.stringify(transferPayload, null, 2));

    const transferResponse = await axios.post(
      `${API_BASE_URL}/transfer`,
      transferPayload,
      {
        headers: AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {},
      }
    );

    console.log(
      "Transfer response:",
      JSON.stringify(transferResponse.data, null, 2)
    );

    // Step 4: Verify transfer was successful
    console.log("\nStep 4: Verifying transfer was successful...");

    const getAfterTransferResponse = await axios.get(
      `${API_BASE_URL}/equipment/${equipmentId}`,
      {
        headers: AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {},
      }
    );

    const currentHolderId = getAfterTransferResponse.data.current_holder_id;
    console.log(`Current holder in DB after transfer: ${currentHolderId}`);

    if (currentHolderId === "1") {
      console.log(
        "✅ Verified: Equipment successfully transferred to user 1 in DB"
      );
    } else {
      console.log(
        `❌ Error: Equipment not transferred to user 1. Current holder: ${currentHolderId}`
      );
    }

    // Step 5: Transfer equipment from user 1 to user 2
    console.log("\nStep 5: Transferring equipment from user 1 to user 2...");

    const userToUserTransferPayload = {
      equipment_id: equipmentId,
      from_holder_id: "1", // From user with ID 1
      to_holder_id: "2", // To user with ID 2
      transfer_reason: "API test transfer between users",
    };

    console.log(
      "Transfer payload:",
      JSON.stringify(userToUserTransferPayload, null, 2)
    );

    const userToUserTransferResponse = await axios.post(
      `${API_BASE_URL}/transfer`,
      userToUserTransferPayload,
      {
        headers: AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {},
      }
    );

    console.log(
      "Transfer response:",
      JSON.stringify(userToUserTransferResponse.data, null, 2)
    );

    // Step 6: Verify user-to-user transfer was successful
    console.log("\nStep 6: Verifying user-to-user transfer was successful...");

    const getAfterSecondTransferResponse = await axios.get(
      `${API_BASE_URL}/equipment/${equipmentId}`,
      {
        headers: AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {},
      }
    );

    const finalHolderId = getAfterSecondTransferResponse.data.current_holder_id;
    console.log(`Current holder in DB after second transfer: ${finalHolderId}`);

    if (finalHolderId === "2") {
      console.log(
        "✅ Verified: Equipment successfully transferred to user 2 in DB"
      );
    } else {
      console.log(
        `❌ Error: Equipment not transferred to user 2. Current holder: ${finalHolderId}`
      );
    }

    // Check blockchain state if available
    if (blockchainId) {
      const currentBlockchainHolder = await checkEquipmentInBlockchain(
        blockchainId
      );
      console.log(
        `Current holder in blockchain after transfers: ${currentBlockchainHolder}`
      );

      // Get transfer history
      console.log("\nStep 7: Getting transfer history...");
      const historyResponse = await axios.get(
        `${API_BASE_URL}/transfer/history/${equipmentId}`,
        {
          headers: AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {},
        }
      );

      console.log(
        "Transfer history:",
        JSON.stringify(historyResponse.data, null, 2)
      );

      // Get blockchain history if endpoint exists
      try {
        const blockchainHistoryResponse = await axios.get(
          `${API_BASE_URL}/blockchain/history/${equipmentId}`,
          {
            headers: AUTH_TOKEN
              ? { Authorization: `Bearer ${AUTH_TOKEN}` }
              : {},
          }
        );

        console.log(
          "Blockchain history:",
          JSON.stringify(blockchainHistoryResponse.data, null, 2)
        );
      } catch (error) {
        console.log(
          "Blockchain history endpoint not available or returned error"
        );
      }
    } else {
      console.log(
        "\nStep 7: Getting transfer history (blockchain data not available)..."
      );

      // Still get the regular transfer history
      const historyResponse = await axios.get(
        `${API_BASE_URL}/transfer/history/${equipmentId}`,
        {
          headers: AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {},
        }
      );

      console.log(
        "Transfer history:",
        JSON.stringify(historyResponse.data, null, 2)
      );

      console.log(
        "Note: Equipment was not registered in blockchain, so no blockchain history is available."
      );
    }

    console.log("\n=== Test completed successfully! ===");
  } catch (error) {
    console.error("\n❌ Test failed:");

    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error(`Status: ${error.response.status}`);
      console.error("Response data:", error.response.data);
      console.error("Headers:", error.response.headers);
    } else if (error.request) {
      // The request was made but no response was received
      console.error("No response received:", error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error("Error message:", error.message);
    }

    console.error("Error config:", error.config);
  }
};

// Run the test
testApiTransfer();
