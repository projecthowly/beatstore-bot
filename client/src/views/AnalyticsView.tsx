import { useApp } from '../store';

export default function AnalyticsView() {
  const { seller } = useApp();
  if (seller.plan === 'free') {
    return (
      <div className="p-6 pb-28">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="text-lg font-semibold mb-2">Аналитика недоступна</div>
          <div className="text-white/70 text-sm">
            Подключите тариф Basic или Pro, чтобы видеть прослушивания и скачивания.
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="p-6 pb-28">
      <div className="grid gap-3">
        <Card title="Прослушивания сегодня" value="— (моки позже)" />
        <Card title="За неделю" value="— (моки позже)" />
        <Card title="За месяц" value="— (моки позже)" />
      </div>
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className="text-sm text-white/70">{title}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </div>
  );
}
