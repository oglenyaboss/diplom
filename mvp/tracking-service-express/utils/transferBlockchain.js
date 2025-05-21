// Обновленная функция transferInBlockchain для blockchainService.js

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
    const fromAddress = getUserEthereumAddress(fromHolderId);
    const toAddress = getUserEthereumAddress(toHolderId);

    logger.info(
      `Transferring equipment ${blockchainId} from ${fromAddress} to ${toAddress}`
    );

    // Запрашиваем текущего держателя из контракта для проверки
    try {
      const currentHolder = await contract.getCurrentHolder(blockchainId);
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

    // Call the contract's transferEquipment function
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
