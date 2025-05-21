// Этот скрипт выдает оборудование определенному держателю
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

// Загрузка адреса контракта
const addressPath = path.join(__dirname, "../contracts/contract-address.txt");
const contractAddress = fs.readFileSync(addressPath, "utf8").trim();

// Загрузка ABI контракта
const abiPath = path.join(__dirname, "../contracts/EquipmentTracking.json");
const contractABI = JSON.parse(fs.readFileSync(abiPath, "utf8"));

// Настройки подключения к Ethereum
const nodeUrl = "http://localhost:8545";
const privateKey =
  "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

// Правильные Ethereum адреса (длина 42 символа включая префикс 0x)
const ADDRESSES = {
  1: "0x1234567890abcdef1234567890abcdef12345678",
  2: "0xabcdef1234567890abcdef1234567890abcdef12",
  default: "0x1234567890abcdef1234567890abcdef12345678",
};

// Выдача оборудования определенному держателю
async function issueEquipmentToHolder(equipmentId, holderId) {
  try {
    // Подключение к Ethereum
    const provider = new ethers.providers.JsonRpcProvider(nodeUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    // Создание экземпляра контракта
    const contract = new ethers.Contract(contractAddress, contractABI, wallet);

    // Определение адреса держателя
    let holderAddress = ADDRESSES[holderId];
    if (!holderAddress) {
      holderAddress = ADDRESSES.default;
      console.log(
        `Адрес для держателя ID ${holderId} не найден, используем адрес по умолчанию: ${holderAddress}`
      );
    }

    console.log(
      `Выдаем оборудование ID ${equipmentId} держателю с адресом ${holderAddress}...`
    );

    // Выдача оборудования
    const tx = await contract.issueEquipment(equipmentId, holderAddress, {
      gasLimit: 300000, // Явно задаем лимит газа
    });

    console.log(
      `Транзакция отправлена, ожидаем подтверждения... Хеш: ${tx.hash}`
    );
    const receipt = await tx.wait();

    console.log(
      `Транзакция успешно подтверждена в блоке ${receipt.blockNumber}`
    );
    console.log(
      `Оборудование ID ${equipmentId} успешно выдано держателю ${holderAddress}`
    );

    return receipt;
  } catch (error) {
    console.error(`Ошибка при выдаче оборудования: ${error.message}`);
    if (error.reason) {
      console.error(`Причина: ${error.reason}`);
    }
    return null;
  }
}

// Выдача всего оборудования держателям
async function issueAllEquipment() {
  try {
    // Подключение к Ethereum
    const provider = new ethers.providers.JsonRpcProvider(nodeUrl);
    const contract = new ethers.Contract(
      contractAddress,
      contractABI,
      provider
    );

    // Получение количества оборудования
    const equipmentCount = await contract.equipmentCount();
    console.log(`Всего зарегистрировано оборудования: ${equipmentCount}`);

    // Выдача каждой единицы оборудования
    for (let i = 1; i <= equipmentCount; i++) {
      const equipment = await contract.equipments(i);

      // Выдаем только оборудование, которое еще не имеет держателя
      if (
        equipment.currentHolder === "0x0000000000000000000000000000000000000000"
      ) {
        console.log(`\n=== Оборудование #${i} (${equipment.name}) ===`);
        // Выдаем оборудование держателю с ID "1"
        await issueEquipmentToHolder(i, "1");
      } else {
        console.log(
          `\n=== Оборудование #${i} (${equipment.name}) уже имеет держателя: ${equipment.currentHolder} ===`
        );
      }
    }

    console.log("\nВыдача оборудования завершена!");
  } catch (error) {
    console.error(`Ошибка при обработке оборудования: ${error.message}`);
  }
}

// Запуск скрипта
issueAllEquipment();
