import { useEffect } from 'react';
import TopBar from './components/TopBar';
import BottomTabs from './components/BottomTabs';
import Player from './components/Player';
import CatalogView from './views/CatalogView';
import AnalyticsView from './views/AnalyticsView';
import AccountView from './views/AccountView';
import BeatDetail from './views/BeatDetail';
import { useApp } from './store';

export default function App() {
  const { tab, session, initFromTelegram, selectedBeatId } = useApp();

  useEffect(() => { initFromTelegram(); }, [initFromTelegram]);

  return (
    <div className="min-h-screen bg-bg text-text">
      <TopBar />

      {tab === 'catalog' && <CatalogView />}
      {tab === 'analytics' && session.role !== 'listener' && <AnalyticsView />}
      {tab === 'account' && <AccountView />}

      {/* Модалка деталей бита поверх контента */}
      {selectedBeatId && <BeatDetail />}

      <Player />
      <BottomTabs />
    </div>
  );
}
