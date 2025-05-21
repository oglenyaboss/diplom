const fs = require("fs");
const path = require("path");
let ethers;

try {
  ethers = require("ethers");
} catch (error) {
  console.error("Ошибка при загрузке ethers:", error.message);
  console.error("Устанавливаем ethers...");
  require("child_process").execSync("npm install --no-save ethers@^5.7.2");
  ethers = require("ethers");
}

// Попытка загрузки dotenv
try {
  require("dotenv").config();
} catch (error) {
  console.log("dotenv не найден, используем переменные окружения");
}

// Проверяем и создаем директорию contracts
const contractsDir = path.join(__dirname, "..", "contracts");
if (!fs.existsSync(contractsDir)) {
  console.log("Создаем директорию для контрактов");
  fs.mkdirSync(contractsDir, { recursive: true });
}

// Чтение файла с адресом контракта
const contractAddressPath = path.join(contractsDir, "contract-address.txt");
const abiPath = path.join(contractsDir, "EquipmentTracking.json");

async function checkContract() {
  try {
    // Получение настроек из переменных окружения
    const nodeUrl = process.env.ETH_NODE_URL || "http://localhost:8545";

    console.log(`Подключение к Ethereum ноде: ${nodeUrl}`);
    let provider;
    try {
      provider = new ethers.providers.JsonRpcProvider(nodeUrl);
    } catch (error) {
      // Попытка использовать новый формат для ethers.js v6+
      try {
        provider = new ethers.JsonRpcProvider(nodeUrl);
      } catch (innerError) {
        console.error("Ошибка при создании провайдера:", innerError.message);
        return false;
      }
    }

    // Проверяем доступность ноды
    try {
      const blockNumber = await provider.getBlockNumber();
      console.log(`Текущий номер блока: ${blockNumber}`);
    } catch (error) {
      console.error("Ошибка при подключении к Ethereum ноде:", error.message);
      return false;
    }

    // Проверяем существование файла с адресом контракта
    if (!fs.existsSync(contractAddressPath)) {
      console.error("Файл с адресом контракта не найден:", contractAddressPath);
      return false;
    }

    // Чтение адреса контракта
    const contractAddress = fs.readFileSync(contractAddressPath, "utf8").trim();
    console.log(`Адрес контракта: ${contractAddress}`);

    // Проверяем наличие кода по адресу контракта
    const code = await provider.getCode(contractAddress);

    if (code === "0x") {
      console.error("По указанному адресу нет кода контракта");
      return false;
    }

    // Проверяем интерфейс контракта, если есть ABI
    if (fs.existsSync(abiPath)) {
      try {
        const abi = JSON.parse(fs.readFileSync(abiPath, "utf8"));
        const contract = new ethers.Contract(contractAddress, abi, provider);

        // Пытаемся вызвать метод owner(), который должен быть в контракте
        try {
          const owner = await contract.owner();
          console.log(`Владелец контракта: ${owner}`);
        } catch (error) {
          console.log("Метод owner() не найден, проверяем другой метод");
          // Пытаемся проверить другие методы, если owner() не существует
          const functions = Object.keys(contract.functions);
          if (functions.length > 0) {
            console.log(`Доступные функции: ${functions.join(", ")}`);
            console.log("Контракт имеет методы, считаем его валидным");
            return true;
          }
        }

        console.log("Контракт существует и функционирует корректно");
        return true;
      } catch (error) {
        console.error("Ошибка при взаимодействии с контрактом:", error.message);
        return false;
      }
    } else {
      console.log("ABI контракта не найден, но код по адресу существует");
      return true;
    }
  } catch (error) {
    console.error("Ошибка при проверке контракта:", error.message);
    return false;
  }
}

// Если скрипт запущен напрямую (а не импортирован)
if (require.main === module) {
  checkContract()
    .then((isValid) => {
      if (isValid) {
        console.log("✅ Контракт валиден");
        process.exit(0);
      } else {
        console.log("❌ Контракт невалиден или отсутствует");
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = checkContract;
