#!/usr/bin/env node

/**
 * Скрипт для проверки подключения к Ethereum ноде и баланса аккаунта
 */

const { ethers } = require("ethers");
require("dotenv").config();

async function checkEthereumConnection() {
  try {
    // Получение настроек из переменных окружения
    const nodeUrl = process.env.ETH_NODE_URL || "http://localhost:8545";
    const privateKey = process.env.ETH_PRIVATE_KEY;

    if (!privateKey) {
      throw new Error("ETH_PRIVATE_KEY не задан в переменных окружения");
    }

    console.log(`Подключение к Ethereum ноде: ${nodeUrl}`);
    const provider = new ethers.providers.JsonRpcProvider(nodeUrl);

    // Попытка получить информацию о сети
    const network = await provider.getNetwork();
    console.log(
      `Успешное подключение к сети: ${network.name} (chainId: ${network.chainId})`
    );

    // Проверка аккаунта
    const wallet = new ethers.Wallet(privateKey, provider);
    const address = await wallet.getAddress();
    console.log(`Адрес аккаунта: ${address}`);

    // Проверка баланса
    const balance = await provider.getBalance(address);
    console.log(`Баланс аккаунта: ${ethers.utils.formatEther(balance)} ETH`);

    // Проверка, достаточно ли баланса для деплоя контракта
    const minBalanceForDeploy = ethers.utils.parseEther("0.1"); // Минимум 0.1 ETH
    if (balance.lt(minBalanceForDeploy)) {
      console.warn(
        `ВНИМАНИЕ: На аккаунте может быть недостаточно средств для деплоя контракта. Требуется минимум 0.1 ETH.`
      );
    } else {
      console.log(`Баланс достаточен для деплоя контракта.`);
    }

    // Получение nonce аккаунта (количество транзакций)
    const nonce = await provider.getTransactionCount(address);
    console.log(`Nonce аккаунта: ${nonce}`);

    console.log("Проверка подключения завершена успешно!");
    return true;
  } catch (error) {
    console.error("Ошибка при проверке подключения к Ethereum:", error.message);
    return false;
  }
}

// Запуск функции проверки
checkEthereumConnection()
  .then((success) => {
    if (success) {
      console.log("Все проверки пройдены успешно.");
      process.exit(0);
    } else {
      console.error("Обнаружены проблемы с подключением.");
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error("Непредвиденная ошибка:", error);
    process.exit(1);
  });
