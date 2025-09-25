import { VStack, Text, Button } from '@chakra-ui/react';
import { useApp } from '../store';

export default function AccountView() {
  const { seller } = useApp();
  return (
    <VStack align="stretch" spacing="12px">
      <Text fontWeight="semibold">Аккаунт</Text>
      <Text>Ник: {seller.username || '—'}</Text>
      <Text>План: {seller.plan}</Text>
      <Button variant="outline">Изменить ник / Store name</Button>
      <Button variant="outline">Обновить план</Button>
      <Button variant="outline">Язык: RU / EN</Button>
    </VStack>
  );
}
