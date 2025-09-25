import { VStack, Text, Box } from '@chakra-ui/react';

export default function AnalyticsView() {
  return (
    <VStack align="stretch" spacing="12px">
      <Text fontWeight="semibold">Аналитика</Text>
      <Box opacity={0.7} fontSize="sm">Доступно на Basic и выше. Скоро здесь будут графики прослушиваний и скачиваний.</Box>
    </VStack>
  );
}
