import { Box, Container, HStack, Text, Button } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store';

export default function TopBar() {
  const { seller, cart } = useApp();
  const nav = useNavigate();

  return (
    <Box position="sticky" top="0" zIndex="10" borderBottom="1px solid rgba(255,255,255,.1)" bg="rgba(0,0,0,.25)" backdropFilter="blur(8px)">
      <Container maxW="container.sm">
        <HStack justify="space-between" py={3}>
          <Box w="32px" h="32px" borderRadius="full" bg="rgba(255,255,255,.09)" />
          <Text fontSize="sm" fontWeight="semibold" opacity={0.95} noOfLines={1}>
            {seller.storeName || 'Store'} <Text as="span" opacity={0.7}>Store</Text>
          </Text>
          <Button size="sm" color="var(--tg-button-text-color,#fff)" onClick={() => nav('/cart')}>
            Cart{cart.length ? ` (${cart.length})` : ''}
          </Button>
        </HStack>
      </Container>
    </Box>
  );
}
