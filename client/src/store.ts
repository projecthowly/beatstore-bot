import { create } from 'zustand';
import type { Beat, LicenseType, Seller, Session, Plan } from './types';

type CartItem = { beatId: string; license: LicenseType; price: number };
type Tab = 'catalog' | 'analytics' | 'account';

type AppState = {
  session: Session;
  seller: Seller;
  beats: Beat[];
  cart: CartItem[];
  tab: Tab;

  playingBeatId?: string;
  isPlaying: boolean;

  selectedBeatId?: string;

  setTab: (t: Tab) => void;
  initFromTelegram: () => void;

  setSellerName: (name: string) => void;
  setSellerSlug: (slug: string) => void;
  setPlan: (plan: Plan) => void;

  addToCart: (beatId: string, license: LicenseType) => void;
  removeFromCart: (beatId: string, license: LicenseType) => void;
  clearCart: () => void;

  openDetail: (beatId: string) => void;
  closeDetail: () => void;

  play: (beatId: string) => void;
  pause: () => void;
  togglePlay: (beatId: string) => void;
};

const defaultSeller: Seller = {
  id: 'me',
  storeName: 'My',
  slug: 'mystore',
  plan: 'free'
};

// демо mp3
const DEMO_MP3 = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';

const mockBeats: Beat[] = [
  {
    id: 'b1',
    title: 'Midnight Drive',
    key: 'Am',
    bpm: 140,
    coverUrl: 'https://picsum.photos/seed/beat1/600/600',
    files: { mp3: DEMO_MP3, wav: '' },
    prices: { mp3: 30, wav: 60 }
  },
  {
    id: 'b2',
    title: 'Neon Runner',
    key: 'Cm',
    bpm: 150,
    coverUrl: 'https://picsum.photos/seed/beat2/600/600',
    files: { mp3: DEMO_MP3, wav: '', stems: '' },
    prices: { mp3: 35, wav: 70, stems: 120 }
  },
  {
    id: 'b3',
    title: 'Cold Wave',
    key: 'F#m',
    bpm: 128,
    coverUrl: 'https://picsum.photos/seed/beat3/600/600',
    files: { mp3: DEMO_MP3 },
    prices: { mp3: 25 }
  }
];

export const useApp = create<AppState>((set, get) => ({
  session: { role: 'maker' },
  seller: defaultSeller,
  beats: mockBeats,
  cart: [],
  tab: 'catalog',

  playingBeatId: undefined,
  isPlaying: false,

  selectedBeatId: undefined,

  setTab: (t) => set({ tab: t }),

  initFromTelegram: () => {
    const tg: any = (window as any).Telegram?.WebApp;
    if (tg) {
      tg.expand && tg.expand();
      tg.ready && tg.ready();

      const sp = tg.initDataUnsafe?.start_param as string | undefined;
      const user = tg.initDataUnsafe?.user;
      const colorScheme = tg.colorScheme;
      const themeParams = tg.themeParams || {};

      const root = document.documentElement;
      const map: Record<string, string> = {
        '--tg-bg-color': themeParams.bg_color,
        '--tg-text-color': themeParams.text_color,
        '--tg-button-color': themeParams.button_color,
        '--tg-button-text-color': themeParams.button_text_color
      };
      Object.entries(map).forEach(([k, v]) => v && root.style.setProperty(k, v));
      if (!themeParams.bg_color) {
        if (colorScheme === 'dark') root.style.setProperty('--tg-bg-color', '#0f1115');
      }

      if (sp) {
        const seller: Seller = {
          id: `seller:${sp}`,
          storeName: sp,
          slug: sp,
          plan: 'basic'
        };
        set({
          session: { role: 'listener', currentSellerSlug: sp, tgUser: user },
          seller
        });
      } else {
        const stored = localStorage.getItem('my-seller');
        const my = stored ? (JSON.parse(stored) as Seller) : defaultSeller;
        set({
          session: { role: 'maker', tgUser: user },
          seller: my
        });
      }
    } else {
      const stored = localStorage.getItem('my-seller');
      const my = stored ? (JSON.parse(stored) as Seller) : defaultSeller;
      set({ session: { role: 'maker' }, seller: my });
    }
  },

  setSellerName: (name) => {
    const s = { ...get().seller, storeName: name };
    set({ seller: s });
    if (get().session.role === 'maker') localStorage.setItem('my-seller', JSON.stringify(s));
  },
  setSellerSlug: (slug) => {
    const s = { ...get().seller, slug };
    set({ seller: s });
    if (get().session.role === 'maker') localStorage.setItem('my-seller', JSON.stringify(s));
  },
  setPlan: (plan) => {
    const s = { ...get().seller, plan };
    set({ seller: s });
    if (get().session.role === 'maker') localStorage.setItem('my-seller', JSON.stringify(s));
  },

  addToCart: (beatId, license) => {
    const beat = get().beats.find(b => b.id === beatId);
    if (!beat) return;
    const price = (beat.prices as any)[license] as number | undefined;
    if (!price) return;
    const item: CartItem = { beatId, license, price };
    set({ cart: [...get().cart, item] });
  },
  removeFromCart: (beatId, license) => {
    set({ cart: get().cart.filter(i => !(i.beatId === beatId && i.license === license)) });
  },
  clearCart: () => set({ cart: [] }),

  openDetail: (beatId) => set({ selectedBeatId: beatId }),
  closeDetail: () => set({ selectedBeatId: undefined }),

  play: (beatId) => set({ playingBeatId: beatId, isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  togglePlay: (beatId) => {
    const { playingBeatId, isPlaying } = get();
    if (playingBeatId === beatId) {
      set({ isPlaying: !isPlaying });
    } else {
      set({ playingBeatId: beatId, isPlaying: true });
    }
  }
}));
