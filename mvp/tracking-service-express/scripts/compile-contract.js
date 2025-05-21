const fs = require("fs");
const path = require("path");
const solc = require("solc");

// Путь к контракту
const contractPath = path.join(
  __dirname,
  "..",
  "contracts",
  "EquipmentTracking.sol"
);
const contractSource = fs.readFileSync(contractPath, "utf8");

// Конфигурация для компиляции
const input = {
  language: "Solidity",
  sources: {
    "EquipmentTracking.sol": {
      content: contractSource,
    },
  },
  settings: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
    outputSelection: {
      "*": {
        "*": ["*"],
      },
    },
  },
};

console.log("Компиляция смарт-контракта...");
const output = JSON.parse(solc.compile(JSON.stringify(input)));

// Проверка ошибок компиляции
if (output.errors) {
  console.error("Ошибки компиляции:");
  output.errors.forEach((error) => {
    console.error(error.formattedMessage);
  });

  // Если есть критические ошибки, завершаем скрипт
  if (output.errors.some((error) => error.severity === "error")) {
    console.error("Компиляция не удалась из-за критических ошибок.");
    process.exit(1);
  }
}

// Получаем скомпилированный контракт
const contractOutput =
  output.contracts["EquipmentTracking.sol"]["EquipmentTracking"];

// Проверка наличия байткода
if (
  !contractOutput ||
  !contractOutput.evm ||
  !contractOutput.evm.bytecode ||
  !contractOutput.evm.bytecode.object ||
  contractOutput.evm.bytecode.object.length === 0
) {
  console.error(
    "Ошибка: байткод не сгенерирован. Проверьте исходный код и версию компилятора."
  );
  process.exit(1);
}

// Сохраняем ABI
const abiOutputPath = path.join(
  __dirname,
  "..",
  "contracts",
  "EquipmentTracking.json"
);
fs.writeFileSync(abiOutputPath, JSON.stringify(contractOutput.abi, null, 2));

// Сохраняем байткод
const binOutputPath = path.join(
  __dirname,
  "..",
  "contracts",
  "EquipmentTracking.bin"
);
fs.writeFileSync(binOutputPath, contractOutput.evm.bytecode.object);

console.log(`ABI сохранен в: ${abiOutputPath}`);
console.log(`Байткод сохранен в: ${binOutputPath}`);
console.log("Компиляция завершена успешно!");
