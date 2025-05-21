// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract EquipmentTracking {
    // Структура для хранения информации об оборудовании
    struct Equipment {
        uint256 id;
        string name;
        string serialNumber;
        address currentHolder;
        bool exists;
    }
    
    // Структура для хранения информации о передаче
    struct Transfer {
        uint256 equipmentId;
        address from;
        address to;
        uint256 timestamp;
        string notes;
    }
    
    // Отображение ID оборудования в структуру Equipment
    mapping(uint256 => Equipment) public equipments;
    
    // Отображение ID оборудования в массив трансферов
    mapping(uint256 => Transfer[]) public transferHistory;
    
    // Счетчик для генерации ID оборудования
    uint256 public equipmentCount;
    
    // События для логирования действий
    event EquipmentRegistered(uint256 indexed id, string name, string serialNumber);
    event EquipmentTransferred(uint256 indexed id, address indexed from, address indexed to, string notes);
    
    // Регистрация нового оборудования
    function registerEquipment(string memory name, string memory serialNumber) public returns (uint256) {
        equipmentCount++;
        equipments[equipmentCount] = Equipment(equipmentCount, name, serialNumber, address(0), true);
        
        emit EquipmentRegistered(equipmentCount, name, serialNumber);
        
        return equipmentCount;
    }
    
    // Выдача оборудования со склада
    function issueEquipment(uint256 id, address to) public {
        require(equipments[id].exists, "Equipment does not exist");
        require(equipments[id].currentHolder == address(0), "Equipment already issued");
        
        // Обновляем текущего держателя
        equipments[id].currentHolder = to;
        
        // Добавляем запись в историю передач
        transferHistory[id].push(Transfer(id, address(0), to, block.timestamp, "Initial issue"));
        
        emit EquipmentTransferred(id, address(0), to, "Initial issue");
    }
    
    // Передача оборудования между сотрудниками
    function transferEquipment(uint256 id, address from, address to, string memory notes) public {
        require(equipments[id].exists, "Equipment does not exist");
        require(equipments[id].currentHolder == from, "Sender is not the current holder");
        
        // Обновляем текущего держателя
        equipments[id].currentHolder = to;
        
        // Добавляем запись в историю передач
        transferHistory[id].push(Transfer(id, from, to, block.timestamp, notes));
        
        emit EquipmentTransferred(id, from, to, notes);
    }
    
    // Возврат оборудования на склад
    function returnEquipment(uint256 id, address from) public {
        require(equipments[id].exists, "Equipment does not exist");
        require(equipments[id].currentHolder == from, "Sender is not the current holder");
        
        // Возвращаем на склад (представлен нулевым адресом)
        equipments[id].currentHolder = address(0);
        
        // Добавляем запись в историю передач
        transferHistory[id].push(Transfer(id, from, address(0), block.timestamp, "Returned to warehouse"));
        
        emit EquipmentTransferred(id, from, address(0), "Returned to warehouse");
    }
    
    // Получение текущего держателя оборудования
    function getCurrentHolder(uint256 id) public view returns (address) {
        require(equipments[id].exists, "Equipment does not exist");
        return equipments[id].currentHolder;
    }
    
    // Получение количества передач оборудования
    function getTransferCount(uint256 id) public view returns (uint256) {
        require(equipments[id].exists, "Equipment does not exist");
        return transferHistory[id].length;
    }
    
    // Получение информации о передаче
    function getTransfer(uint256 id, uint256 index) public view returns (address, address, uint256, string memory) {
        require(equipments[id].exists, "Equipment does not exist");
        require(index < transferHistory[id].length, "Transfer index out of bounds");
        
        Transfer memory transfer = transferHistory[id][index];
        return (transfer.from, transfer.to, transfer.timestamp, transfer.notes);
    }
}
