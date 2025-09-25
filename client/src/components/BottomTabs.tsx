import { Box, Container, Grid, Button } from '@chakra-ui/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../store';

export default function BottomTabs() {
  const { session, seller } = useApp();
  const isListener = session.role === 'listener';
  const nav = useNavigate();
  const loc = useLocation();
  const active = (p: string) => loc.pathname === p;

  return (
    <Box position="fixed" bottom="0" left="0" right="0" borderTop="1px solid rgba(255,255,255,.1)" bg="rgba(0,0,0,.25)" backdropFilter="blur(8px)">
      <Container maxW="container.sm" px={2}>
        <Grid templateColumns="repeat(3, 1fr)">
          <Tab label="Битстор" active={active('/')} onClick={() => nav('/')} />
          {!isListener && (
            <Tab
              label="Аналитика"
              active={active('/analytics')}
              onClick={() => seller.plan === 'free' ? alert('Доступно с Basic') : nav('/analytics')}
              disabled={seller.plan === 'free'}
            />
          )}
          <Tab label="Аккаунт" active={active('/account')} onClick={() => nav('/account')} />
        </Grid>
      </Container>
      <Box h="8px" />
    </Box>
  );
}

function Tab({ label, active, onClick, disabled=false }:{
  label: string; active: boolean; onClick: () => void; disabled?: boolean;
}) {
  return (
    <Button
      variant="ghost"
      onClick={!disabled ? onClick : undefined}
      opacity={disabled ? 0.5 : 1}
      color={active ? 'white' : 'rgba(255,255,255,.7)'}
      py={3}
    >
      {label}
    </Button>
  );
}
