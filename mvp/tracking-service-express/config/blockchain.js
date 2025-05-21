const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const { logger } = require("../middleware/logger");

// Load the ABI from the contracts directory
const loadContractABI = () => {
  try {
    const abiPath = path.join(__dirname, "../contracts/EquipmentTracking.json");
    const contractJson = JSON.parse(fs.readFileSync(abiPath, "utf8"));
    return contractJson.abi;
  } catch (error) {
    logger.error(`Failed to load contract ABI: ${error.message}`);
    throw new Error("Failed to load contract ABI");
  }
};

// Initialize connection to Ethereum network
const initBlockchain = () => {
  try {
    const nodeUrl = process.env.ETH_NODE_URL;
    const contractAddress = process.env.ETH_CONTRACT_ADDRESS;
    const privateKey = process.env.ETH_PRIVATE_KEY;

    if (!nodeUrl || !contractAddress || !privateKey) {
      logger.warn("Blockchain integration disabled: Missing configuration");
      return null;
    }

    // Create a provider and wallet
    const provider = new ethers.providers.JsonRpcProvider(nodeUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    // Load contract ABI
    const contractABI = loadContractABI();

    // Create contract instance
    const contract = new ethers.Contract(contractAddress, contractABI, wallet);

    logger.info(`Blockchain connection initialized: ${nodeUrl}`);
    logger.info(`Using contract at address: ${contractAddress}`);

    return { provider, wallet, contract };
  } catch (error) {
    logger.error(`Failed to initialize blockchain: ${error.message}`);
    return null;
  }
};

module.exports = { initBlockchain };
