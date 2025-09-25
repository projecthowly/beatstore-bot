import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../store';

export default function BottomTabs() {
  const { session, seller } = useApp();
  const isListener = session.role === 'listener';
  const nav = useNavigate();
  const loc = useLocation();

  const active = (path: string) => loc.pathname === path;

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-bg/80 backdrop-blur border-t border-white/10">
      <div className="max-w-screen-sm mx-auto grid grid-cols-3">
        <Tab label="Битстор" active={active('/')} onClick={() => nav('/')} />
        {!isListener && (
          <Tab
            label="Аналитика"
            active={active('/analytics')}
            onClick={() => seller.plan === 'free' ? alert('Доступно c Basic') : nav('/analytics')}
            disabled={seller.plan === 'free'}
          />
        )}
        <Tab label="Аккаунт" active={active('/account')} onClick={() => nav('/account')} />
      </div>
      <div className="h-2" />
    </nav>
  );
}

function Tab({ label, active, onClick, disabled=false }:{
  label: string; active: boolean; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button
      className={`py-3 text-sm w-full ${active ? 'text-white' : 'text-white/65'} ${disabled ? 'opacity-50' : ''}`}
      onClick={!disabled ? onClick : () => {}}
    >
      {label}
    </button>
  );
}
