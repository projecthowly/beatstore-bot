/**
 * Monkey-patch localStorage для использования Telegram CloudStorage
 * Это должно быть выполнено ДО инициализации TonConnect
 */

/// <reference path="../types/telegram-webapp.d.ts" />

// Сохраняем оригинальный localStorage
const originalLocalStorage = { ...window.localStorage };

// ОТКЛЮЧАЕМ CloudStorage - он не поддерживает ключи с двоеточиями которые использует TonConnect
// CloudStorage выдает ошибки STORAGE_KEY_INVALID для ключей типа "ton-connect-storage_wallet"
const isCloudStorageAvailable = false;

console.log('ℹ️ CloudStorage отключён для TonConnect - используем обычный localStorage');

// Кэш для синхронных операций (общий для всех)
const cache: Record<string, string> = {};

if (isCloudStorageAvailable) {
  console.log('🔧 Переопределяем localStorage на Telegram CloudStorage для TonConnect');

  // Переопределяем методы localStorage
  const cloudStorageAdapter = {
    getItem(key: string): string | null {
      // Сначала проверяем кэш (синхронно)
      if (key in cache) {
        return cache[key];
      }

      // Пытаемся загрузить из оригинального localStorage как fallback
      return originalLocalStorage.getItem?.(key) || null;
    },

    setItem(key: string, value: string): void {
      // Сохраняем в кэш синхронно
      cache[key] = value;

      // Также сохраняем в обычный localStorage как fallback
      try {
        originalLocalStorage.setItem?.(key, value);
      } catch (e) {
        console.warn('localStorage fallback failed:', e);
      }

      // Асинхронно сохраняем в CloudStorage
      window.Telegram!.WebApp.CloudStorage.setItem(
        key,
        value,
        (error: Error | null, success: boolean) => {
          if (error) {
            console.warn('CloudStorage setItem error:', error, 'key:', key);
            // Ошибка CloudStorage не критична, т.к. есть кэш и localStorage fallback
          } else if (success) {
            console.log(`✅ CloudStorage: сохранено ${key}`);
          }
        }
      );
    },

    removeItem(key: string): void {
      // Удаляем из кэша синхронно
      delete cache[key];

      // Также удаляем из обычного localStorage
      try {
        originalLocalStorage.removeItem?.(key);
      } catch (e) {
        console.warn('localStorage fallback failed:', e);
      }

      // Асинхронно удаляем из CloudStorage
      window.Telegram!.WebApp.CloudStorage.removeItem(
        key,
        (error: Error | null, success: boolean) => {
          if (error) {
            console.warn('CloudStorage removeItem error:', error, 'key:', key);
            // Ошибка CloudStorage не критична
          } else if (success) {
            console.log(`✅ CloudStorage: удалено ${key}`);
          }
        }
      );
    },

    clear(): void {
      // Очищаем кэш
      for (const key in cache) {
        delete cache[key];
      }

      // CloudStorage не имеет метода clear, поэтому используем оригинальный
      originalLocalStorage.clear?.();
    },

    key(index: number): string | null {
      const keys = Object.keys(cache);
      return keys[index] || null;
    },

    get length(): number {
      return Object.keys(cache).length;
    },
  };

  // Применяем патч
  Object.defineProperty(window, 'localStorage', {
    value: cloudStorageAdapter,
    writable: false,
    configurable: true,
  });
} else {
  console.warn('⚠️ Telegram CloudStorage недоступен, используем обычный localStorage');
}

/**
 * Предзагрузка данных из CloudStorage
 * ВАЖНО: Эта функция должна быть вызвана и дождаться завершения ДО инициализации TonConnect!
 */
export async function preloadFromCloudStorage(): Promise<void> {
  if (!isCloudStorageAvailable) {
    console.log('⏭️ CloudStorage недоступен, пропускаем предзагрузку');
    return;
  }

  console.log('⏳ Предзагрузка данных TonConnect из CloudStorage...');

  const tonConnectKeys = [
    'ton-connect-storage_http-bridge-gateway',
    'ton-connect-storage_bridge-connection',
    'ton-connect-storage_wallet',
    'ton-connect-ui_last-selected-wallet-info',
    'ton-connect-ui_preferred-wallet',
  ];

  // Загружаем все ключи параллельно
  const promises = tonConnectKeys.map((key) => {
    return new Promise<void>((resolve) => {
      window.Telegram!.WebApp.CloudStorage.getItem(
        key,
        (error: Error | null, value: string | null) => {
          if (!error && value) {
            cache[key] = value;
            console.log(`✅ Предзагружено из CloudStorage: ${key} = ${value.substring(0, 50)}...`);
          } else if (error) {
            console.warn(`⚠️ Ошибка загрузки ${key}:`, error);
          }
          resolve();
        }
      );
    });
  });

  await Promise.all(promises);
  console.log('✅ Предзагрузка из CloudStorage завершена. Кэш:', Object.keys(cache));
}
