package main

import (
	"crypto/ecdsa"
	"crypto/rand"
	"fmt"
	"log"

	"github.com/ethereum/go-ethereum/common/hexutil"
	"github.com/ethereum/go-ethereum/crypto"
)

// GenerateEthereumAccount генерирует новый приватный ключ и соответствующий Ethereum адрес
func GenerateEthereumAccount() (privateKeyHex string, addressHex string, err error) {
	// Генерируем новый приватный ключ
	privateKey, err := ecdsa.GenerateKey(crypto.S256(), rand.Reader)
	if err != nil {
		log.Println("Ошибка генерации приватного ключа:", err)
		return "", "", err
	}

	// Получаем приватный ключ в виде массива байтов
	privateKeyBytes := crypto.FromECDSA(privateKey)
	privateKeyHex = hexutil.Encode(privateKeyBytes)

	// Получаем публичный ключ
	publicKey := privateKey.Public()
	publicKeyECDSA, ok := publicKey.(*ecdsa.PublicKey)
	if !ok {
		return "", "", fmt.Errorf("ошибка приведения типа публичного ключа")
	}

	// Получаем Ethereum адрес из публичного ключа
	address := crypto.PubkeyToAddress(*publicKeyECDSA)
	addressHex = address.Hex()

	return privateKeyHex, addressHex, nil
}
