// Этот скрипт проверяет текущего владельца оборудования в блокчейне
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

// Загрузка адреса контракта
const addressPath = path.join(__dirname, "../contracts/contract-address.txt");
const contractAddress = fs.readFileSync(addressPath, "utf8").trim();

// Загрузка ABI контракта
const abiPath = path.join(__dirname, "../contracts/EquipmentTracking.json");
const contractABI = JSON.parse(fs.readFileSync(abiPath, "utf8"));

// Подключение к Ethereum ноде
const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");

// Проверка владельца для оборудования
async function checkCurrentHolder(equipmentId) {
  try {
    // Создание экземпляра контракта
    const contract = new ethers.Contract(
      contractAddress,
      contractABI,
      provider
    );

    // Получение информации о текущем держателе
    const currentHolder = await contract.getCurrentHolder(equipmentId);
    console.log(
      `Текущий держатель оборудования ID ${equipmentId}: ${currentHolder}`
    );

    // Получение информации об оборудовании
    const equipment = await contract.equipments(equipmentId);
    console.log("Информация об оборудовании:");
    console.log(`  ID: ${equipment.id}`);
    console.log(`  Название: ${equipment.name}`);
    console.log(`  Серийный номер: ${equipment.serialNumber}`);
    console.log(`  Текущий держатель: ${equipment.currentHolder}`);
    console.log(`  Существует: ${equipment.exists}`);

    // Получение истории передач
    const transferCount = await contract.getTransferCount(equipmentId);
    console.log(`\nИстория передач (всего ${transferCount}):`);

    for (let i = 0; i < transferCount; i++) {
      const [from, to, timestamp, notes] = await contract.getTransfer(
        equipmentId,
        i
      );
      console.log(`Передача #${i}:`);
      console.log(`  От: ${from}`);
      console.log(`  Кому: ${to}`);
      console.log(`  Время: ${new Date(timestamp * 1000).toISOString()}`);
      console.log(`  Примечания: ${notes}`);
    }

    return currentHolder;
  } catch (error) {
    console.error(`Ошибка при проверке держателя: ${error.message}`);
    return null;
  }
}

// Проверка всех зарегистрированных единиц оборудования
async function checkAllEquipment() {
  try {
    const contract = new ethers.Contract(
      contractAddress,
      contractABI,
      provider
    );
    const equipmentCount = await contract.equipmentCount();
    console.log(`Всего зарегистрировано оборудования: ${equipmentCount}`);

    for (let i = 1; i <= equipmentCount; i++) {
      console.log(`\n=== Оборудование #${i} ===`);
      await checkCurrentHolder(i);
    }
  } catch (error) {
    console.error(`Ошибка при проверке оборудования: ${error.message}`);
  }
}

// Запуск скрипта
checkAllEquipment();
