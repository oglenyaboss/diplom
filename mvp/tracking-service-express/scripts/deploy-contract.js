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
// Читаем байткод и гарантируем наличие префикса 0x
let bytecode = fs.readFileSync(binPath, "utf8")
  .replace(/[\r\n\s]+/g, '')  // Удаляем все переносы строк и пробелы
  .trim();

// Удаляем префикс '0x' если он есть, а затем добавляем заново
// Это гарантирует, что у нас будет только один префикс 0x
if (bytecode.startsWith("0x")) {
  bytecode = bytecode.substring(2);
}
bytecode = "0x" + bytecode;

console.log(`Длина байткода: ${bytecode.length}`);
console.log(`Байткод начинается с: ${bytecode.substring(0, 10)}...`);

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
    console.log("Подготовка деплоя контракта...");
    console.log(`Тип байткода: ${typeof bytecode}`);

    // Проверка, что байткод - это действительно шестнадцатеричная строка с префиксом 0x
    if (!bytecode.startsWith("0x")) {
      console.error("Ошибка: Байткод не имеет префикса 0x");
      bytecode = "0x" + bytecode; // Попытка исправить
      console.log("Добавлен префикс 0x");
    }
    
    // Проверяем валидность шестнадцатеричной строки после префикса
    const hexPart = bytecode.substring(2);
    if (!/^[0-9a-fA-F]+$/.test(hexPart)) {
      console.error("Ошибка: Байткод содержит недопустимые символы");
      console.error(`Первые 20 символов байткода: ${bytecode.substring(0, 22)}`);
      
      // Попытка очистить байткод от недопустимых символов
      const cleanedHex = hexPart.replace(/[^0-9a-fA-F]/g, '');
      if (cleanedHex.length < hexPart.length) {
        console.log(`Удалено ${hexPart.length - cleanedHex.length} недопустимых символов`);
        bytecode = "0x" + cleanedHex;
      } else {
        throw new Error("Неверный формат байткода. Должен быть шестнадцатеричной строкой с префиксом 0x");
      }
    }

    console.log("Создание фабрики контракта...");
    
    // Проверка минимальной длины валидного байткода
    if (bytecode.length < 10) {
      throw new Error("Байткод слишком короткий, возможно файл поврежден");
    }
    
    let contractFactory;
    try {
      contractFactory = new ethers.ContractFactory(abi, bytecode, wallet);
      console.log("Фабрика контракта успешно создана");
    } catch (error) {
      console.error(`Ошибка при создании фабрики контракта: ${error.message}`);
      if (error.message.includes("toBuffer")) {
        console.error("Ошибка преобразования байткода в буфер. Запись отладочной информации:");
        console.error(`Длина байткода: ${bytecode.length}`);
        console.error(`Начало байткода: ${bytecode.substring(0, 30)}...`);
        console.error(`Конец байткода: ...${bytecode.substring(bytecode.length - 30)}`);
        throw new Error("Неверный формат байткода для ethers.js. Проверьте формат EquipmentTracking.bin");
      }
      throw error;
    }

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
    console.error("Ошибка при деплое контракта:", error);
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
