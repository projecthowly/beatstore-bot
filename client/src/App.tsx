import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import TopBar from './components/TopBar';
import BottomTabs from './components/BottomTabs';
import Player from './components/Player';
import CatalogView from './views/CatalogView';
import AnalyticsView from './views/AnalyticsView';
import AccountView from './views/AccountView';
import BeatPage from './views/BeatPage';
import CartPage from './views/CartPage';
import { useApp } from './store';

export default function App() {
  const { initFromTelegram } = useApp();

  useEffect(() => { initFromTelegram(); }, [initFromTelegram]);

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col">
      <TopBar />
      <main className="flex-1 w-full max-w-screen-sm mx-auto px-3 pt-2 pb-[116px]">
        <Routes>
          <Route path="/" element={<CatalogView />} />
          <Route path="/beat/:id" element={<BeatPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/analytics" element={<AnalyticsView />} />
          <Route path="/account" element={<AccountView />} />
        </Routes>
      </main>
      <Player />
      <BottomTabs />
    </div>
  );
}
