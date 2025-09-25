import { Box, Button, HStack, Text, VStack } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store';

export default function CartPage() {
  const nav = useNavigate();
  const { cart, beats, removeFromCart, clearCart } = useApp();

  const items = cart.map(c => {
    const b = beats.find(x => x.id === c.beatId)!;
    return { ...c, beat: b, price: b.prices[c.license] || 0 };
  });
  const total = items.reduce((s, i) => s + i.price, 0);

  return (
    <VStack align="stretch" spacing="12px">
      <Button variant="ghost" onClick={() => nav(-1)}>← Назад</Button>

      <Text fontWeight="semibold">Корзина</Text>

      {items.length === 0 && <Text color="rgba(255,255,255,.7)">Пусто.</Text>}

      {items.map((it, idx) => (
        <HStack key={idx} p="12px" border="1px solid rgba(255,255,255,.1)" borderRadius="12px" bg="rgba(255,255,255,.05)" justify="space-between">
          <Box>
            <Text fontSize="sm" fontWeight="semibold">{it.beat.title}</Text>
            <Text fontSize="xs" color="rgba(255,255,255,.7)">{it.license.toUpperCase()} — ${it.price}</Text>
          </Box>
          <Button size="sm" variant="outline" onClick={() => removeFromCart(it.beatId, it.license)}>Удалить</Button>
        </HStack>
      ))}

      {items.length > 0 && (
        <VStack align="stretch" spacing="10px" mt="4">
          <HStack justify="space-between">
            <Text>Итого:</Text>
            <Text fontWeight="semibold">${total}</Text>
          </HStack>
          <HStack>
            <Button variant="outline" onClick={clearCart}>Очистить</Button>
            <Button color="var(--tg-button-text-color,#fff)" flex="1">Оплатить</Button>
          </HStack>
        </VStack>
      )}
    </VStack>
  );
}
