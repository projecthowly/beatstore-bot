import { useApp } from '../store';

export default function TopBar() {
  const { seller, cart } = useApp();
  const onCart = () => {
    alert('Корзина в разработке (следующий шаг).');
  };
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-bg/80 backdrop-blur border-b border-white/10">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-white/10" />
      </div>
      <div className="text-sm font-medium opacity-90">
        {seller.storeName || 'Store'} <span className="opacity-70">Store</span>
      </div>
      <div className="relative">
        <button className="px-3 py-1.5 rounded-xl bg-primary text-primaryText text-sm" onClick={onCart}>Cart</button>
        {cart.length > 0 && (
          <span className="absolute -top-2 -right-2 text-xs bg-red-600 text-white rounded-full px-1.5 py-0.5">
            {cart.length}
          </span>
        )}
      </div>
    </div>
  );
}
