import { useState, useEffect } from "react";
import { authApi } from "@/api/auth";
import { User } from "@/types/user";

// Кэш пользователей, чтобы не загружать одни и те же данные многократно
const usersCache: Record<string, User> = {};
// Кэш для быстрого поиска пользователя по Ethereum-адресу
const ethAddressCache: Record<string, User> = {};
// Флаг, показывающий, загружены ли все пользователи для поиска по адресу
let allUsersLoaded = false;

/**
 * Хук для получения информации о пользователе по его ID
 */
export const useUserInfo = (userId: string | null | undefined) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Очищаем состояние при изменении userId
    if (!userId) {
      setUser(null);
      setError(null);
      return;
    }

    // Если пользователь уже в кэше, используем его
    if (usersCache[userId]) {
      setUser(usersCache[userId]);
      return;
    }

    // Загружаем информацию о пользователе
    const fetchUserInfo = async () => {
      try {
        setLoading(true);
        const userData = await authApi.getUser(userId);
        usersCache[userId] = userData; // Сохраняем в кэш
        setUser(userData);
        setError(null);
      } catch (err) {
        console.error("Error fetching user info:", err);
        setError("Не удалось загрузить информацию о пользователе");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
  }, [userId]);

  return { user, loading, error };
};

/**
 * Вспомогательная функция для форматирования имени пользователя
 */
export const getUserFullName = (user: User | null) => {
  if (!user) return "Неизвестный пользователь";
  return `${user.first_name} ${user.last_name}`;
};

/**
 * Хук для получения форматированного имени пользователя по его ID
 */
export const useUserFullName = (userId: string | null | undefined) => {
  const { user, loading, error } = useUserInfo(userId);

  const fullName = userId
    ? user
      ? getUserFullName(user)
      : loading
      ? "Загрузка..."
      : "Пользователь не найден"
    : "Склад";

  return { fullName, loading, error, user };
};

/**
 * Функция для поиска пользователя по Ethereum-адресу
 */
export const findUserByEthAddress = async (ethAddress: string): Promise<User | null> => {
  if (!ethAddress) return null;
  
  // Проверяем кэш
  const lowerCaseAddress = ethAddress.toLowerCase();
  if (ethAddressCache[lowerCaseAddress]) {
    return ethAddressCache[lowerCaseAddress];
  }
  
  // Если все пользователи еще не были загружены - загружаем их
  if (!allUsersLoaded) {
    try {
      const { users } = await authApi.getUsers();
      // Заполняем кэш пользователей по ethereum-адресу
      users.forEach(user => {
        if (user.eth_address) {
          ethAddressCache[user.eth_address.toLowerCase()] = user;
          // Заодно добавляем в обычный кэш по ID
          usersCache[user.id] = user;
        }
      });
      allUsersLoaded = true;
    } catch (err) {
      console.error("Error fetching users for eth address:", err);
      return null;
    }
  }
  
  // Проверяем кэш еще раз после загрузки
  return ethAddressCache[lowerCaseAddress] || null;
};

/**
 * Форматирует отображение Ethereum-адреса, добавляя ФИО пользователя если оно найдено
 */
export const formatEthAddressWithName = async (ethAddress: string | null | undefined): Promise<string> => {
  if (!ethAddress) return "Склад";
  
  try {
    const user = await findUserByEthAddress(ethAddress);
    if (user) {
      return `${ethAddress} (${user.first_name} ${user.last_name})`;
    }
    return ethAddress;
  } catch (error) {
    console.error("Error formatting eth address with name:", error);
    return ethAddress;
  }
};
