import { useApp } from '../store';

export default function BottomTabs() {
  const { tab, setTab, session, seller } = useApp();
  const isListener = session.role === 'listener';
  return (
    <div className="fixed bottom-0 inset-x-0 bg-bg/80 backdrop-blur border-t border-white/10">
      <div className="grid grid-cols-3">
        <TabButton label="Битстор" active={tab==='catalog'} onClick={() => setTab('catalog')} />
        {!isListener && (
          <TabButton
            label="Аналитика"
            active={tab==='analytics'}
            onClick={() => setTab('analytics')}
            disabled={seller.plan === 'free'}
          />
        )}
        <TabButton label="Аккаунт" active={tab==='account'} onClick={() => setTab('account')} />
      </div>
      <div className="h-2" />
    </div>
  );
}

function TabButton({
  label,
  active,
  onClick,
  disabled=false
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      className={`py-3 text-sm ${active ? 'text-white' : 'text-white/60'} ${disabled ? 'opacity-50' : ''}`}
      onClick={!disabled ? onClick : () => alert('Доступно с тарифом Basic')}
    >
      {label}
    </button>
  );
}
