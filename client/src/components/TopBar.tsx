import { useNavigate } from 'react-router-dom';
import { useApp } from '../store';

export default function TopBar() {
  const { seller, cart } = useApp();
  const nav = useNavigate();

  return (
    <header className="sticky top-0 z-10 bg-bg/80 backdrop-blur border-b border-white/10">
      <div className="max-w-screen-sm mx-auto px-3 py-3 flex items-center justify-between">
        <div className="h-8 w-8 rounded-full bg-white/10" />
        <div className="text-sm font-medium opacity-90 select-none">
          {seller.storeName || 'Store'} <span className="opacity-70">Store</span>
        </div>
        <button
          className="relative px-3 py-1.5 rounded-xl bg-primary text-primaryText text-sm"
          onClick={() => nav('/cart')}
        >
          Cart
          {cart.length > 0 && (
            <span className="absolute -top-2 -right-2 text-[10px] bg-red-600 text-white rounded-full px-1.5 py-0.5">
              {cart.length}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
