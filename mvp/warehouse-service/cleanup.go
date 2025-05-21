package main

import (
	// Явно импортируйте только из одного пути
	_ "github.com/ugorji/go/codec"
)

// Эта функция нужна только для резолвинга зависимостей
func _cleanup() {}
