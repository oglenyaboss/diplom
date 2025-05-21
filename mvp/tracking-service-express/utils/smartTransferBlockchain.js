// Улучшенная функция transferInBlockchain, которая автоматически определяет,
// нужно ли выдавать оборудование со склада или передавать между пользователями
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
    
    // Получаем информацию о текущем владельце из блокчейна
    let currentHolder;
    try {
      currentHolder = await contract.getCurrentHolder(blockchainId);
      logger.info(`Current holder in blockchain for equipment ${blockchainId}: ${currentHolder}`);
    } catch (checkError) {
      logger.error(`Failed to check current holder: ${checkError.message}`);
      throw new Error(`Failed to get current holder: ${checkError.message}`);
    }
    
    // Преобразуем holderId в адреса
    const toAddress = toHolderId.startsWith('0x') && toHolderId.length === 42 
      ? toHolderId 
      : "0xabcdef1234567890abcdef1234567890abcdef12"; // тестовый адрес получателя
    
    // Определяем, нужно ли выдавать со склада или передавать между пользователями
    const isIssuingFromWarehouse = currentHolder === "0x0000000000000000000000000000000000000000";
    
    if (isIssuingFromWarehouse) {
      // Это выдача со склада - используем issueEquipment
      logger.info(`Issuing equipment ${blockchainId} from warehouse to ${toAddress}`);
      
      const tx = await contract.issueEquipment(blockchainId, toAddress, {
        gasLimit: 300000
      });
      
      logger.info(`Issue transaction sent, hash: ${tx.hash}`);
      const receipt = await tx.wait();
      
      logger.info(`Equipment issued from warehouse in blockchain, tx hash: ${receipt.transactionHash}`);
      return receipt.transactionHash;
    } else {
      // Это передача между пользователями - используем transferEquipment
      // Для передачи fromAddress должен совпадать с текущим владельцем в блокчейне
      logger.info(`Transferring equipment ${blockchainId} from ${currentHolder} to ${toAddress}`);
      
      const tx = await contract.transferEquipment(
        blockchainId,
        currentHolder, // Важно: используем текущего владельца из блокчейна
        toAddress,
        notes,
        { gasLimit: 300000 }
      );
      
      logger.info(`Transfer transaction sent, hash: ${tx.hash}`);
      const receipt = await tx.wait();
      
      logger.info(`Equipment transferred in blockchain, tx hash: ${receipt.transactionHash}`);
      return receipt.transactionHash;
    }
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
