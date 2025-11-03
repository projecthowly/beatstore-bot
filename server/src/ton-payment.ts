/**
 * TON Payment Service
 * Сервис для работы с TON платежами
 */

// TODO: Установить @ton/ton для работы с TON blockchain
// npm install @ton/ton @ton/core

/**
 * Ваш TON адрес для получения платежей
 */
export const PAYMENT_WALLET_ADDRESS = "UQCwrZrG7sMEJPXUdQG2FSW4tK8cy-y7pS9gw-DPz2ZXpbqQ";

/**
 * Проверить транзакцию подписки в TON blockchain через TonAPI
 * (деньги должны прийти на PAYMENT_WALLET_ADDRESS)
 */
export async function verifyTonTransaction(
  transactionHash: string,
  expectedAmount: number,
  senderAddress: string
): Promise<boolean> {
  try {
    console.log("🔍 Проверка TON транзакции:", {
      hash: transactionHash,
      expectedAmount,
      sender: senderAddress,
    });

    // Проверяем что все параметры переданы
    if (!transactionHash || !expectedAmount || !senderAddress) {
      console.error("❌ Отсутствуют обязательные параметры для верификации");
      return false;
    }

    // Используем TonAPI для получения информации о транзакции
    const response = await fetch(
      `https://tonapi.io/v2/blockchain/transactions/${transactionHash}`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error(`❌ TonAPI вернул ошибку: ${response.status}`);
      return false;
    }

    const txData = await response.json();
    console.log("📦 Данные транзакции из TonAPI:", txData);

    // Проверяем что транзакция успешна
    if (!txData.success) {
      console.error("❌ Транзакция не успешна");
      return false;
    }

    // Проверяем получателя (out_msgs должен содержать наш адрес)
    const outMessages = txData.out_msgs || [];
    let foundPayment = false;
    let receivedAmount = 0;

    for (const msg of outMessages) {
      if (msg.destination?.address === PAYMENT_WALLET_ADDRESS) {
        // Сумма в nanotons, конвертируем в TON
        receivedAmount = parseInt(msg.value || "0") / 1e9;
        foundPayment = true;
        break;
      }
    }

    if (!foundPayment) {
      console.error("❌ Платеж не найден на наш адрес:", PAYMENT_WALLET_ADDRESS);
      return false;
    }

    // Проверяем отправителя
    const actualSender = txData.account?.address;
    if (actualSender !== senderAddress) {
      console.error(`❌ Неверный отправитель. Ожидался: ${senderAddress}, получен: ${actualSender}`);
      return false;
    }

    // Проверяем сумму (с небольшой погрешностью из-за комиссий)
    const tolerance = 0.01; // 1% погрешность
    const minAmount = expectedAmount * (1 - tolerance);
    const maxAmount = expectedAmount * (1 + tolerance);

    if (receivedAmount < minAmount || receivedAmount > maxAmount) {
      console.error(`❌ Неверная сумма. Ожидалось: ${expectedAmount} TON, получено: ${receivedAmount} TON`);
      return false;
    }

    console.log(`✅ Транзакция верифицирована успешно! Получено ${receivedAmount} TON от ${actualSender}`);
    return true;
  } catch (error) {
    console.error("❌ Ошибка проверки TON транзакции:", error);
    return false;
  }
}

/**
 * Проверить транзакцию покупки бита в TON blockchain через TonAPI
 * (деньги должны прийти продавцу бита - sellerAddress)
 */
export async function verifyBeatPurchaseTransaction(
  transactionHash: string,
  expectedAmount: number,
  senderAddress: string,
  sellerAddress: string
): Promise<boolean> {
  try {
    console.log("🔍 Проверка TON транзакции покупки бита:", {
      hash: transactionHash,
      expectedAmount,
      sender: senderAddress,
      seller: sellerAddress,
    });

    // Проверяем что все параметры переданы
    if (!transactionHash || !expectedAmount || !senderAddress || !sellerAddress) {
      console.error("❌ Отсутствуют обязательные параметры для верификации");
      return false;
    }

    // Используем TonAPI для получения информации о транзакции
    const response = await fetch(
      `https://tonapi.io/v2/blockchain/transactions/${transactionHash}`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error(`❌ TonAPI вернул ошибку: ${response.status}`);
      return false;
    }

    const txData = await response.json();
    console.log("📦 Данные транзакции из TonAPI:", JSON.stringify(txData, null, 2));

    // Проверяем что транзакция успешна
    if (!txData.success) {
      console.error("❌ Транзакция не успешна");
      return false;
    }

    // Проверяем получателя (out_msgs должен содержать адрес продавца)
    const outMessages = txData.out_msgs || [];
    let foundPayment = false;
    let receivedAmount = 0;

    // Сначала проверяем out_msgs (обычный случай)
    for (const msg of outMessages) {
      const destinationAddress = msg.destination?.address;
      console.log(`📨 Проверяем out_msg: destination=${destinationAddress}, value=${msg.value}`);

      // Сравниваем адреса (могут быть в разных форматах)
      if (destinationAddress === sellerAddress ||
          destinationAddress?.toLowerCase() === sellerAddress?.toLowerCase()) {
        // Сумма в nanotons, конвертируем в TON
        receivedAmount = parseInt(msg.value || "0") / 1e9;
        foundPayment = true;
        console.log(`✅ Найден платеж продавцу в out_msgs: ${receivedAmount} TON`);
        break;
      }
    }

    // Если out_msgs пустой, проверяем in_msg (случай отправки самому себе)
    if (!foundPayment && outMessages.length === 0 && txData.in_msg) {
      const inMsg = txData.in_msg;
      const inDestination = inMsg.destination?.address;
      const inSource = inMsg.source?.address;
      console.log(`📨 out_msgs пуст, проверяем in_msg: source=${inSource}, destination=${inDestination}, value=${inMsg.value}`);

      // Если отправитель и получатель совпадают (отправка самому себе)
      if (inSource === senderAddress && inDestination === sellerAddress && inSource === inDestination) {
        receivedAmount = parseInt(inMsg.value || "0") / 1e9;
        foundPayment = true;
        console.log(`✅ Обнаружена отправка самому себе (тестовый режим): ${receivedAmount} TON`);
      }
    }

    if (!foundPayment) {
      console.error("❌ Платеж не найден на адрес продавца:", sellerAddress);
      console.error("📋 Все out_msgs:", JSON.stringify(outMessages, null, 2));
      console.error("📋 in_msg:", JSON.stringify(txData.in_msg, null, 2));
      return false;
    }

    // Проверяем отправителя
    const actualSender = txData.account?.address;
    console.log(`📤 Отправитель: expected=${senderAddress}, actual=${actualSender}`);

    // Сравниваем адреса (могут быть в разных форматах)
    if (actualSender !== senderAddress &&
        actualSender?.toLowerCase() !== senderAddress?.toLowerCase()) {
      console.error(`❌ Неверный отправитель. Ожидался: ${senderAddress}, получен: ${actualSender}`);
      return false;
    }

    // Проверяем сумму (с небольшой погрешностью из-за комиссий)
    const tolerance = 0.05; // 5% погрешность (больше чем для подписки, т.к. могут быть комиссии)
    const minAmount = expectedAmount * (1 - tolerance);
    const maxAmount = expectedAmount * (1 + tolerance);

    console.log(`💰 Проверка суммы: expected=${expectedAmount} TON, received=${receivedAmount} TON, range=[${minAmount}, ${maxAmount}]`);

    if (receivedAmount < minAmount || receivedAmount > maxAmount) {
      console.error(`❌ Неверная сумма. Ожидалось: ${expectedAmount} TON, получено: ${receivedAmount} TON`);
      return false;
    }

    console.log(`✅ Транзакция покупки бита верифицирована успешно! Получено ${receivedAmount} TON от ${actualSender} для продавца ${sellerAddress}`);
    return true;
  } catch (error) {
    console.error("❌ Ошибка проверки TON транзакции покупки бита:", error);
    return false;
  }
}

/**
 * Получить текущий курс TON/USD
 */
export async function getTonUsdRate(): Promise<number> {
  try {
    const response = await fetch("https://tonapi.io/v2/rates?tokens=ton&currencies=usd");
    const data = await response.json();

    if (data.rates && data.rates.TON && data.rates.TON.prices) {
      return data.rates.TON.prices.USD || 5.5;
    }

    return 5.5; // Fallback
  } catch (error) {
    console.error("Ошибка получения курса TON/USD:", error);
    return 5.5; // Fallback
  }
}
