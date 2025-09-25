import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store';

export default function CartPage() {
  const { cart, beats, removeFromCart, clearCart } = useApp();
  const nav = useNavigate();

  const total = useMemo(
    () => cart.reduce((sum, i) => sum + i.price, 0),
    [cart]
  );

  return (
    <div className="pb-4">
      <button className="text-sm underline" onClick={() => nav(-1)}>← Назад</button>

      <h1 className="mt-3 text-lg font-semibold">Корзина</h1>

      <div className="mt-3 space-y-2">
        {cart.length === 0 && (
          <div className="text-white/60 text-sm">Пусто. Добавьте биты из каталога.</div>
        )}

        {cart.map((i, idx) => {
          const beat = beats.find(b => b.id === i.beatId);
          if (!beat) return null;
          return (
            <div key={idx} className="flex items-center gap-3 bg-white/5 rounded-lg p-3 border border-white/10">
              <img src={beat.coverUrl} className="h-12 w-12 rounded-md object-cover" />
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">{beat.title}</div>
                <div className="text-xs text-white/60">{i.license.toUpperCase()} • ${i.price}</div>
              </div>
              <button
                className="text-xs text-white/70 underline"
                onClick={() => removeFromCart(i.beatId, i.license)}
              >
                Удалить
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-4 border-t border-white/10 pt-3">
        <div className="flex items-center justify-between text-sm mb-2">
          <div className="text-white/60">Итого</div>
          <div className="font-semibold">${total.toFixed(2)}</div>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-2 rounded-lg bg-white/10 text-sm border border-white/10" onClick={clearCart}>
            Очистить
          </button>
          <button className="flex-1 px-3 py-2 rounded-lg bg-primary text-primaryText text-sm"
            onClick={() => alert('Чекаут в разработке (TON / Stars)')}>
            Оформить
          </button>
        </div>
      </div>
    </div>
  );
}
