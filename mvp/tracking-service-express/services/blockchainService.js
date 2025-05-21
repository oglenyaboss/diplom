const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const { logger } = require("../middleware/logger");
const userService = require("./userService");

// Zero address constant
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// Функция для преобразования ID пользователя в Ethereum адрес
const getUserEthereumAddress = async (userId) => {
  // If userId is null, 0, or "0", return the zero address
  if (userId === null || userId === 0 || userId === "0") {
    logger.info(`Converting warehouse/null holder ID to zero address`);
    return ZERO_ADDRESS;
  }

  try {
    // Получаем адрес из сервиса пользователей (auth-service)
    const address = await userService.getUserEthereumAddress(userId);
    return address;
  } catch (error) {
    logger.error(
      `Error fetching Ethereum address for user ${userId}: ${error.message}`
    );
    logger.warn(`Using zero address as fallback for user ${userId}`);
    return ZERO_ADDRESS;
  }
};

// Load the contract address from file if it exists
const loadContractAddress = () => {
  try {
    const addressPath = path.join(
      __dirname,
      "../contracts/contract-address.txt"
    );
    if (fs.existsSync(addressPath)) {
      return fs.readFileSync(addressPath, "utf8").trim();
    }
    return null;
  } catch (error) {
    logger.error(`Failed to load contract address: ${error.message}`);
    return null;
  }
};

// Load the ABI from the contracts directory
const loadContractABI = () => {
  try {
    const abiPath = path.join(__dirname, "../contracts/EquipmentTracking.json");
    if (fs.existsSync(abiPath)) {
      // The JSON directly contains the ABI array rather than an object with an 'abi' property
      const abiContent = JSON.parse(fs.readFileSync(abiPath, "utf8"));
      logger.info(
        `ABI loaded successfully, contains ${abiContent.length} items`
      );
      return abiContent;
    }
    logger.error("Contract ABI file not found");
    return null;
  } catch (error) {
    logger.error(`Failed to load contract ABI: ${error.message}`);
    return null;
  }
};

// Initialize connection to Ethereum network
const initBlockchain = () => {
  try {
    // Get config from environment or use file-based config
    const nodeUrl = process.env.ETH_NODE_URL || "http://localhost:8545";
    const privateKey = process.env.ETH_PRIVATE_KEY;

    // Always prioritize file-based contract address for fresh deployments
    let contractAddress = loadContractAddress();

    // Fallback to environment variable only if file doesn't exist
    if (!contractAddress) {
      contractAddress = process.env.ETH_CONTRACT_ADDRESS;
      logger.info("Using contract address from environment variable");
    } else {
      logger.info("Using contract address from file");
    }

    if (!nodeUrl || !contractAddress || !privateKey) {
      logger.warn(
        `Blockchain integration disabled: Missing configuration - nodeUrl: ${!!nodeUrl}, contractAddress: ${!!contractAddress}, privateKey: ${!!privateKey}`
      );
      return null;
    }

    logger.info(`Attempting to connect to Ethereum node at: ${nodeUrl}`);
    logger.info(`Using contract address: ${contractAddress}`);

    // Load contract ABI
    const contractABI = loadContractABI();
    if (!contractABI) {
      logger.error("Failed to load contract ABI");
      return null;
    }

    // Create a provider and wallet
    const provider = new ethers.providers.JsonRpcProvider(nodeUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

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

// Initialize blockchain connection
let blockchainContext = null;

// Try to initialize blockchain connection on startup
const initializeBlockchain = async () => {
  try {
    logger.info("Initializing blockchain connection...");
    blockchainContext = initBlockchain();

    if (blockchainContext) {
      logger.info("Blockchain connection successfully initialized");
      // Try to verify the connection by calling a simple contract method
      try {
        const { contract } = blockchainContext;
        // Query the blockchain chain ID
        const chainId = await blockchainContext.provider
          .getNetwork()
          .then((n) => n.chainId);
        logger.info(
          `Connected to blockchain network with chain ID: ${chainId}`
        );
        return true;
      } catch (error) {
        logger.error(
          `Failed to verify blockchain connection: ${error.message}`
        );
        blockchainContext = null;
        return false;
      }
    } else {
      logger.warn("Failed to initialize blockchain context");
      return false;
    }
  } catch (error) {
    logger.error(`Error in blockchain initialization: ${error.message}`);
    blockchainContext = null;
    return false;
  }
};

// Register equipment in blockchain
const registerInBlockchain = async (
  name,
  serialNumber,
  initialHolderId = null
) => {
  try {
    if (!blockchainContext) {
      logger.warn("Blockchain integration disabled or not initialized");
      return null;
    }

    const { contract } = blockchainContext;

    logger.info(
      `Registering equipment in blockchain: "${name}" (S/N: ${serialNumber})`
    );

    // Call the contract's registerEquipment function
    const tx = await contract.registerEquipment(name, serialNumber, {
      gasLimit: 300000, // Явно задаем лимит газа
    });

    logger.info(
      `Transaction sent, waiting for confirmation. Tx hash: ${tx.hash}`
    );

    const receipt = await tx.wait();
    logger.info(`Transaction confirmed in block ${receipt.blockNumber}`);

    // Extract the equipment ID from the event logs
    const event = receipt.events?.find(
      (e) => e.event === "EquipmentRegistered"
    );
    if (!event) {
      logger.error(
        "Equipment registration event not found in transaction receipt"
      );
      logger.debug(
        `Transaction receipt events: ${JSON.stringify(receipt.events)}`
      );
      throw new Error("Equipment registration event not found");
    }

    // The first indexed parameter is the equipment ID
    const blockchainId = event.args[0].toString();

    logger.info(`Equipment registered in blockchain with ID: ${blockchainId}`);

    // If initial holder ID is provided, issue equipment to them
    if (initialHolderId) {
      try {
        // Convert to a proper Ethereum address using mapper
        const holderAddress = await getUserEthereumAddress(initialHolderId);

        // Call the contract's issueEquipment function
        logger.info(`Issuing equipment ${blockchainId} to ${holderAddress}`);
        const issueTx = await contract.issueEquipment(
          blockchainId,
          holderAddress,
          {
            gasLimit: 300000, // Явно задаем лимит газа
          }
        );

        const issueReceipt = await issueTx.wait();
        logger.info(
          `Equipment issued to ${holderAddress} in blockchain in block ${issueReceipt.blockNumber}`
        );
      } catch (issueError) {
        logger.error(
          `Failed to issue equipment to initial holder: ${issueError.message}`
        );
        // Don't fail the whole registration process if issuing fails
      }
    }

    return blockchainId;
  } catch (error) {
    logger.error(`Blockchain registration error: ${error.message}`);
    if (error.code) {
      logger.error(`Error code: ${error.code}`);
    }
    if (error.reason) {
      logger.error(`Error reason: ${error.reason}`);
    }
    throw error;
  }
};

// Transfer equipment in blockchain
const transferInBlockchain = async (
  blockchainId,
  fromHolderId,
  toHolderId,
  notes
) => {
  try {
    if (!blockchainContext) {
      logger.warn("Blockchain integration disabled or not initialized");
      return null;
    }

    const { contract } = blockchainContext;

    // Конвертируем ID пользователей в Ethereum адреса
    const fromAddress = await getUserEthereumAddress(fromHolderId);
    const toAddress = await getUserEthereumAddress(toHolderId);

    logger.info(
      `Transferring equipment ${blockchainId} from ${fromAddress} to ${toAddress}`
    );

    // Запрашиваем текущего держателя из контракта для проверки
    let currentHolder;
    try {
      currentHolder = await contract.getCurrentHolder(blockchainId);
      logger.info(
        `Current holder in blockchain for equipment ${blockchainId}: ${currentHolder}`
      );

      // Проверяем соответствие адресов
      if (currentHolder.toLowerCase() !== fromAddress.toLowerCase()) {
        logger.warn(
          `Addresses mismatch: expected ${fromAddress}, but found ${currentHolder} in blockchain`
        );
      }
    } catch (checkError) {
      logger.error(`Failed to check current holder: ${checkError.message}`);
    }

    // Явно задаем газовый лимит для транзакции
    const options = {
      gasLimit: 300000,
    };

    // Check if current holder is the zero address (warehouse)
    if (currentHolder === ethers.constants.AddressZero) {
      logger.info(
        `Current holder is the warehouse (zero address), using issueEquipment instead of transferEquipment`
      );
      // If the equipment is currently in warehouse (zero address), use issueEquipment instead
      const tx = await contract.issueEquipment(
        blockchainId,
        toAddress,
        options
      );

      logger.info(
        `Issue equipment transaction sent, waiting for confirmation. Tx hash: ${tx.hash}`
      );

      // Wait for transaction receipt
      const receipt = await tx.wait();
      logger.info(
        `Equipment issued in blockchain, tx hash: ${receipt.transactionHash}`
      );
      return receipt.transactionHash;
    }

    // If not from warehouse, use normal transfer
    const tx = await contract.transferEquipment(
      blockchainId,
      fromAddress,
      toAddress,
      notes,
      options
    );

    logger.info(
      `Transfer transaction sent, waiting for confirmation. Tx hash: ${tx.hash}`
    );

    const receipt = await tx.wait();

    logger.info(
      `Equipment transferred in blockchain, tx hash: ${receipt.transactionHash}`
    );
    return receipt.transactionHash;
  } catch (error) {
    logger.error(`Blockchain transfer error: ${error.message}`);
    if (error.code) {
      logger.error(`Error code: ${error.code}`);
    }
    if (error.reason) {
      logger.error(`Error reason: ${error.reason}`);
    }
    throw error;
  }
};

// Get blockchain history for equipment
const getBlockchainHistory = async (blockchainId) => {
  try {
    if (!blockchainContext) {
      logger.warn("Blockchain integration disabled or not initialized");
      return [];
    }

    const { contract } = blockchainContext;

    // Get the number of transfers
    const transferCount = await contract.getTransferCount(blockchainId);
    const count = transferCount.toNumber();

    // Get all transfers
    const history = [];
    for (let i = 0; i < count; i++) {
      const [from, to, timestamp, notes] = await contract.getTransfer(
        blockchainId,
        i
      );

      history.push({
        from,
        to,
        timestamp: timestamp.toNumber(),
        notes,
      });
    }

    return history;
  } catch (error) {
    logger.error(`Blockchain history error: ${error.message}`);
    throw error;
  }
};

// Initialize at module load time
initializeBlockchain().catch((error) => {
  logger.error(`Failed to initialize blockchain: ${error.message}`);
});

module.exports = {
  registerInBlockchain,
  transferInBlockchain,
  getBlockchainHistory,
};
