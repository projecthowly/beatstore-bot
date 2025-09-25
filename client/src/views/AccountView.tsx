import { useApp } from '../store';

export default function AccountView() {
  const { seller, setSellerName, setSellerSlug, setPlan, session } = useApp();
  const link = `https://t.me/<имя_твоего_бота>/app?startapp=${seller.slug || ''}`;

  return (
    <div className="p-4 pb-28 space-y-4">
      <section className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
        <h3 className="font-semibold">Профиль магазина</h3>

        <label className="text-sm text-white/70">Store Name</label>
        <input
          className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 outline-none"
          placeholder="Например: PhaseG"
          value={seller.storeName}
          onChange={(e) => setSellerName(e.target.value)}
        />

        <label className="text-sm text-white/70 mt-2">Slug (для диплинка)</label>
        <input
          className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 outline-none"
          placeholder="Например: phaseg"
          value={seller.slug}
          onChange={(e) => setSellerSlug(e.target.value)}
        />

        <div className="text-xs text-white/60">Диплинк:</div>
        <div className="text-xs break-all bg-black/30 p-2 rounded-lg border border-white/10">{link}</div>
      </section>

      <section className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
        <h3 className="font-semibold">Тариф</h3>
        <div className="flex gap-2">
          <PlanButton label="Free" v="free" />
          <PlanButton label="Basic" v="basic" />
          <PlanButton label="Pro" v="pro" />
        </div>
      </section>

      <section className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
        <h3 className="font-semibold">Язык</h3>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 rounded-lg bg-white/10 text-sm">RU</button>
          <button className="px-3 py-1.5 rounded-lg bg-white/10 text-sm opacity-60">EN</button>
        </div>
        <div className="text-xs text-white/60">Сохранение языка локально (позже — в профиле).</div>
      </section>

      {session.role === 'listener' && (
        <div className="text-xs text-white/50">Вы просматриваете витрину по диплинку как покупатель.</div>
      )}
    </div>
  );

  function PlanButton({ label, v }: { label: string; v: 'free' | 'basic' | 'pro' }) {
    return (
      <button
        className={`px-3 py-1.5 rounded-lg text-sm border ${
          seller.plan === v
            ? 'bg-primary text-primaryText border-transparent'
            : 'bg-white/10 border-white/10'
        }`}
        onClick={() => setPlan(v)}
      >
        {label}
      </button>
    );
  }
}
