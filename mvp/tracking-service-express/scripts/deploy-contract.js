const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
require("dotenv").config();

// Чтение скомпилированных файлов
const abiPath = path.join(
  __dirname,
  "..",
  "contracts",
  "EquipmentTracking.json"
);
const binPath = path.join(
  __dirname,
  "..",
  "contracts",
  "EquipmentTracking.bin"
);

const abi = JSON.parse(fs.readFileSync(abiPath, "utf8"));
const bytecode = fs.readFileSync(binPath, "utf8");

// Подключение к блокчейну
async function deployContract() {
  try {
    // Получение настроек из переменных окружения
    const nodeUrl = process.env.ETH_NODE_URL || "http://localhost:8545";
    const privateKey =
      process.env.ETH_PRIVATE_KEY ||
      "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

    if (!privateKey) {
      throw new Error("ETH_PRIVATE_KEY не задан в переменных окружения");
    }

    console.log(`Подключение к Ethereum ноде: ${nodeUrl}`);
    const provider = new ethers.providers.JsonRpcProvider(nodeUrl);

    // Создание кошелька для подписи транзакций
    const wallet = new ethers.Wallet(privateKey, provider);
    const walletAddress = await wallet.getAddress();
    console.log(`Использую адрес: ${walletAddress}`);

    // Создание фабрики контракта и его деплой
    console.log("Деплой контракта...");
    const contractFactory = new ethers.ContractFactory(abi, bytecode, wallet);

    // Устанавливаем ручные параметры газа для решения проблемы
    const deployOptions = {
      gasLimit: 8000000, // Увеличиваем лимит газа
      gasPrice: ethers.utils.parseUnits("20", "gwei"), // Уменьшаем цену газа
    };

    console.log("Параметры деплоя:", deployOptions);
    const contract = await contractFactory.deploy(deployOptions);

    console.log("Ожидание подтверждения транзакции...");
    // Ожидание подтверждения транзакции
    await contract.deployed();

    // Сохранение адреса контракта
    const contractAddressPath = path.join(
      __dirname,
      "..",
      "contracts",
      "contract-address.txt"
    );
    fs.writeFileSync(contractAddressPath, contract.address);

    console.log(`Контракт успешно развернут по адресу: ${contract.address}`);
    console.log(`Адрес контракта сохранен в: ${contractAddressPath}`);

    return contract.address;
  } catch (error) {
    console.error("Ошибка при деплое контракта:", error.message);
    process.exit(1);
  }
}

// Если скрипт запущен напрямую (а не импортирован)
if (require.main === module) {
  deployContract()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = deployContract;
