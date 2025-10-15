import { create } from "zustand";
import type { Beat, LicenseType, Plan, Session, Seller } from "./types";

/* ========= API base ========= */
const API_BASE =
  (import.meta as any)?.env?.VITE_API_URL?.replace(/\/+$/, "") ||
  "http://localhost:8080";

/* ========= Telegram Data ========= */
// Получаем данные из URL параметров (переданных ботом) или из Telegram Web App SDK
function getTelegramDataFromUrl(): {
  telegramId: number | null;
  username: string | null;
  role: "producer" | "artist" | null;
  isNewUser: boolean;
} {
  try {
    // Пытаемся получить данные из URL параметров
    const params = new URLSearchParams(window.location.search);
    const tgId = params.get("tgId");
    const username = params.get("username");
    const role = params.get("role");
    const isNew = params.get("isNew");

    // Если данных нет в URL, пытаемся получить из Telegram Web App SDK
    let telegramId: number | null = tgId ? parseInt(tgId, 10) : null;
    let usernameResult: string | null = username || null;

    if (!telegramId && (window as any).Telegram?.WebApp?.initDataUnsafe?.user) {
      const tgUser = (window as any).Telegram.WebApp.initDataUnsafe.user;
      telegramId = tgUser.id || null;
      usernameResult = tgUser.username || tgUser.first_name || null;
      console.log("📱 Данные получены из Telegram Web App SDK:", tgUser);
    }

    console.log("🔍 getTelegramDataFromUrl:", {
      url: window.location.href,
      urlParams: { tgId, username, role, isNew },
      fromSDK: !tgId && telegramId ? true : false,
      finalData: { telegramId, username: usernameResult, role, isNew },
      parsedIsNew: isNew === "1",
    });

    return {
      telegramId,
      username: usernameResult,
      role: role === "producer" || role === "artist" ? role : null,
      isNewUser: isNew === "1",
    };
  } catch (e) {
    console.error("❌ Ошибка при получении Telegram данных:", e);
    return { telegramId: null, username: null, role: null, isNewUser: true };
  }
}

const telegramData = getTelegramDataFromUrl();

/* ========= helpers: абсолютные URL для /uploads/* ========= */
function absolutize(url: string): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/uploads/")) return `${API_BASE}${url}`;
  return url;
}
function normalizeBeat(b: Beat): Beat {
  return {
    ...b,
    coverUrl: absolutize(b.coverUrl),
    files: {
      mp3: absolutize(b.files?.mp3 || ""),
      wav: absolutize(b.files?.wav || ""),
      stems: absolutize(b.files?.stems || ""),
    },
  };
}

/* ========= localStorage (только для сессии) ========= */
const LS_SESSION = "gb:session:v1"; // <— роль и флаг нового пользователя (только для быстрой загрузки)
const OLD_KEYS = ["gb:beats", "gb_beats_v1", "gb:beats:v2", "gb:profile:v1"]; // Очищаем старые ключи

function saveSessionToLS(s: Session) {
  try {
    localStorage.setItem(LS_SESSION, JSON.stringify(s));
  } catch {}
}

/* ========= единый <audio> ========= */
const audio = new Audio();
audio.preload = "none";
audio.crossOrigin = "anonymous";

/* ========= типы ========= */
type Prices = { [licenseId: string]: number | null };
type UploadPayload = {
  title: string;
  key: string;
  bpm: number;
  prices: Prices;
  files: {
    cover: File | null;
    mp3: File | null;
    wav: File | null;
    stems: File | null;
  };
};
type CartItem = { beatId: string; license: LicenseType };

export type License = {
  id: string;
  name: string;
  defaultPrice: number | null;
};

type AppState = {
  beats: Beat[];
  seller: Seller;
  me: Seller;
  session: Session;
  viewingOwnerId: string | null;
  telegramId: number | null; // ID пользователя из Telegram
  userInitialized: boolean; // Завершена ли проверка/создание пользователя

  playingBeatId: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  lastBeatUrl: string | null;
  volume: number;

  cart: CartItem[];

  // Лицензии пользователя
  licenses: License[];
  loadLicenses: () => Promise<void>;
  updateLicense: (licenseId: string, updates: Partial<License>) => Promise<void>;
  addLicense: (license: Omit<License, "id">) => Promise<void>;
  deleteLicense: (licenseId: string) => Promise<void>;

  playerCollapsed: boolean;
  setPlayerCollapsed: (collapsed: boolean) => void;
  togglePlayerCollapsed: () => void;

  // Переключение между глобальным и личным битстором
  viewingGlobalStore: boolean; // true = глобальный битстор, false = личный битстор
  storeSwapAnimating: boolean; // true во время анимации переключения
  pendingStoreView: boolean | null; // новое значение viewingGlobalStore, которое применится после fade-out
  setViewingGlobalStore: (viewing: boolean) => void;
  setStoreSwapAnimating: (animating: boolean) => void;
  setPendingStoreView: (pending: boolean | null) => void;
  toggleStoreView: () => void; // переключает между глобальным и личным

  _bootDone: boolean;
  initFromUrl: () => void;
  bootstrap: () => Promise<void>;
  isOwnStore: () => boolean;
  goToOwnStore: () => void;

  playBeat: (id: string) => void;
  togglePlay: (id: string) => void;
  pause: () => void;
  stopPlaying: () => void;
  seekTo: (sec: number) => void;
  setVolume: (v: number) => void;
  playPrev: () => void;
  playNext: () => void;

  addToCart: (beatId: string, license: LicenseType) => void;
  removeFromCart: (beatId: string, license: LicenseType) => void;
  clearCart: () => void;

  uploadBeat: (payload: UploadPayload) => Promise<void>;

  /** обновление ника (сохраняет в БД) */
  updateNickname: (next: string) => Promise<void>;

  /** обновление цен лицензий для конкретного бита (сохраняет в БД) */
  updateBeatPrices: (beatId: string, prices: Prices) => Promise<void>;

  /** выбор роли для нового пользователя */
  selectRole: (role: "producer" | "artist") => void;

  /** смена роли (только artist → producer) */
  changeRole: (role: "producer") => void;
};

export const useApp = create<AppState>((set, get) => {
  try {
    OLD_KEYS.forEach((k) => localStorage.removeItem(k));
  } catch {}

  // Временные данные до загрузки из БД
  const initialMe: Seller = {
    id: telegramData.telegramId ? `user:${telegramData.telegramId}` : "temp-user",
    slug: telegramData.username || "user",
    storeName: telegramData.username || "User",
    plan: "free" as Plan,
  };

  audio.addEventListener("timeupdate", () =>
    set({ currentTime: audio.currentTime }),
  );
  audio.addEventListener("durationchange", () =>
    set({ duration: Number.isFinite(audio.duration) ? audio.duration : 0 }),
  );
  audio.addEventListener("ended", () => set({ isPlaying: false }));

  // Начальная сессия (будет обновлена асинхронно из БД)
  let initialSession: Session;
  if (telegramData.role) {
    // Данные пришли от бота через URL
    initialSession = {
      role: telegramData.role,
      isNewUser: telegramData.isNewUser,
    };
    console.log("✅ Сессия загружена из URL:", initialSession);
  } else {
    // Временная сессия - будет обновлена из БД асинхронно (см. блок выше)
    initialSession = { role: "artist", isNewUser: true };
    console.log("⏳ Начальная сессия (будет обновлена из БД):", initialSession);
  }

  return {
    beats: [], // Биты загружаются из БД в bootstrap()
    seller: initialMe,
    me: initialMe,
    session: initialSession,
    viewingOwnerId: initialMe.id,
    telegramId: telegramData.telegramId,
    userInitialized: false, // Изначально false, станет true после проверки БД

    playingBeatId: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    lastBeatUrl: null,
    volume: 0.8,

    cart: [],

    // Дефолтные лицензии (будут загружены из БД)
    licenses: [
      { id: "mp3", name: "MP3", defaultPrice: null },
      { id: "wav", name: "WAV", defaultPrice: null },
      { id: "stems", name: "STEMS", defaultPrice: null },
    ],

    playerCollapsed: false,
    viewingGlobalStore: false, // по умолчанию личный битстор
    storeSwapAnimating: false,
    pendingStoreView: null,
    _bootDone: false,

    async initFromUrl() {
      const url = new URL(window.location.href);
      const mode = url.searchParams.get("mode");
      const sellerParam = url.searchParams.get("seller");
      if (mode === "link" && sellerParam) {
        // Загружаем данные продюсера по username из БД
        try {
          const response = await fetch(`${API_BASE}/api/users/byUsername/${sellerParam}`);
          if (response.ok) {
            const data = await response.json();
            const foreignSeller: Seller = {
              id: `user:${data.user.telegram_id}`,
              slug: data.user.username,
              storeName: data.user.store_name || data.user.username,
              plan: data.user.plan || "free",
            };
            set({
              session: { role: "artist", isNewUser: get().session.isNewUser },
              seller: foreignSeller,
              viewingOwnerId: foreignSeller.id,
            });
            console.log("✅ Загружен продюсер из БД:", foreignSeller);
          } else {
            // Fallback если продюсер не найден
            const foreign: Seller = {
              id: `seller:${sellerParam}`,
              slug: sellerParam,
              storeName: sellerParam,
              plan: "free" as Plan,
            };
            set({
              session: { role: "artist", isNewUser: get().session.isNewUser },
              seller: foreign,
              viewingOwnerId: foreign.id,
            });
            console.warn("⚠️ Продюсер не найден в БД, используем временные данные");
          }
        } catch (e) {
          console.error("❌ Ошибка загрузки данных продюсера:", e);
        }
      } else {
        // используем профиль из LS
        set({
          session: { role: get().session.role, isNewUser: get().session.isNewUser },
          seller: get().me,
          viewingOwnerId: get().me.id,
        });
      }
    },

    async bootstrap() {
      if (get()._bootDone) return;
      try {
        console.log("📦 Загружаем биты из БД...");
        const res = await fetch(`${API_BASE}/api/beats`);
        const data = await res.json();
        const rawBeats: Beat[] = Array.isArray(data)
          ? (data as any)
          : Array.isArray(data?.beats)
            ? data.beats
            : Array.isArray(data?.list)
              ? data.list
              : [];
        const beats = rawBeats.map(normalizeBeat);
        set({ beats, _bootDone: true });
        console.log(`✅ Загружено ${beats.length} битов из БД`);
      } catch (e) {
        console.error("❌ Ошибка загрузки битов из БД:", e);
        set({ beats: [], _bootDone: true });
      }
    },

    isOwnStore() {
      return get().viewingOwnerId === get().me.id;
    },
    async goToOwnStore() {
      // Устанавливаем ник из Telegram, если он пустой (ограничение 15 символов)
      const currentMe = get().me;
      if (!currentMe.storeName || currentMe.storeName === "Howly") {
        const telegramUsername = telegramData.username || "Producer";
        const truncatedUsername = telegramUsername.slice(0, 15);
        const updatedMe: Seller = { ...currentMe, storeName: truncatedUsername };
        set({ me: updatedMe, seller: updatedMe });
        console.log("✅ Установлен ник из Telegram:", truncatedUsername);

        // Сохраняем в БД
        const telegramId = get().telegramId;
        if (telegramId) {
          try {
            await fetch(`${API_BASE}/api/users/${telegramId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ storeName: truncatedUsername }),
            });
            console.log("✅ Ник сохранен в БД");
          } catch (e) {
            console.error("❌ Ошибка при сохранении ника в БД:", e);
          }
        }
      }

      const newSession: Session = {
        role: "producer",
        isNewUser: false
      };
      set({
        session: newSession,
        seller: get().me,
        viewingOwnerId: get().me.id,
      });
      saveSessionToLS(newSession);  // ✅ Персистим в localStorage

      // Обновляем роль в БД
      const telegramId = get().telegramId;
      if (telegramId) {
        try {
          await fetch(`${API_BASE}/api/users/${telegramId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: "producer" }),
          });
          console.log("✅ Роль обновлена в БД: producer");
        } catch (e) {
          console.error("❌ Ошибка при обновлении роли в БД:", e);
        }
      }

      const url = new URL(window.location.href);
      url.searchParams.delete("mode");
      url.searchParams.delete("seller");
      window.history.replaceState({}, "", url.toString());
    },

    /* === ПЛЕЕР === */
    playBeat(id) {
      const { beats, lastBeatUrl } = get();
      const beat = beats.find((b) => b.id === id);
      const url = beat?.files?.mp3 || "";
      if (!url) return;

      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {}
      if (lastBeatUrl !== url) {
        audio.src = url;
        set({ lastBeatUrl: url, duration: 0, currentTime: 0 });
      }
      audio.volume = get().volume;
      audio
        .play()
        .then(() =>
          set({ playingBeatId: id, isPlaying: true, playerCollapsed: false }),
        )
        .catch(() => {});
    },

    togglePlay(id) {
      const { playingBeatId, isPlaying } = get();
      if (playingBeatId === id) {
        if (isPlaying) {
          audio.pause();
          set({ isPlaying: false });
        } else {
          audio
            .play()
            .then(() => set({ isPlaying: true }))
            .catch(() => {});
        }
      } else {
        get().playBeat(id);
      }
    },

    pause() {
      try {
        audio.pause();
      } catch {}
      set({ isPlaying: false });
    },

    stopPlaying() {
      try {
        audio.pause();
        audio.currentTime = 0;
        audio.src = "";
      } catch {}
      set({
        playingBeatId: null,
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        lastBeatUrl: null,
      });
    },

    seekTo(sec) {
      try {
        audio.currentTime = sec;
        set({ currentTime: sec });
      } catch {}
    },
    setVolume(v) {
      const vol = Math.min(1, Math.max(0, v));
      audio.volume = vol;
      set({ volume: vol });
    },

    playPrev() {
      const { beats, playingBeatId } = get();
      if (!playingBeatId || beats.length === 0) return;
      const idx = beats.findIndex((b) => b.id === playingBeatId);
      const prev = beats[(idx - 1 + beats.length) % beats.length];
      if (prev) get().playBeat(prev.id);
    },
    playNext() {
      const { beats, playingBeatId } = get();
      if (!playingBeatId || beats.length === 0) return;
      const idx = beats.findIndex((b) => b.id === playingBeatId);
      const next = beats[(idx + 1) % beats.length];
      if (next) get().playBeat(next.id);
    },

    setPlayerCollapsed(collapsed) {
      set({ playerCollapsed: collapsed });
    },
    togglePlayerCollapsed() {
      set((state) => ({ playerCollapsed: !state.playerCollapsed }));
    },

    setViewingGlobalStore(viewing) {
      set({ viewingGlobalStore: viewing });
    },
    setStoreSwapAnimating(animating) {
      set({ storeSwapAnimating: animating });
    },
    setPendingStoreView(pending) {
      set({ pendingStoreView: pending });
    },
    toggleStoreView() {
      set((state) => ({ viewingGlobalStore: !state.viewingGlobalStore }));
    },

    /* === КОРЗИНА === */
    addToCart(beatId, license) {
      const exists = get().cart.some(
        (c) => c.beatId === beatId && c.license === license,
      );
      if (exists) return;
      set({ cart: [...get().cart, { beatId, license }] });
    },
    removeFromCart(beatId, license) {
      set({
        cart: get().cart.filter(
          (c) => !(c.beatId === beatId && c.license === license),
        ),
      });
    },
    clearCart() {
      set({ cart: [] });
    },

    /* === ЗАГРУЗКА === */
    async uploadBeat(payload) {
      const endpoint = `${API_BASE}/api/beats/upload`;
      const fd = new FormData();
      fd.append("title", payload.title);
      fd.append("key", payload.key);
      fd.append("bpm", String(payload.bpm));

      // ✅ Добавляем цены
      fd.append("prices", JSON.stringify(payload.prices));

      if (payload.files.cover) fd.append("cover", payload.files.cover);
      if (payload.files.mp3) fd.append("mp3", payload.files.mp3);
      if (payload.files.wav) fd.append("wav", payload.files.wav);
      if (payload.files.stems) fd.append("stems", payload.files.stems);

      // добавляем автора
      const me = get().me;
      fd.append("authorId", me.id);
      fd.append("authorName", me.storeName);
      fd.append("authorSlug", me.slug);

      const res = await fetch(endpoint, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || "upload failed");

      const newBeat: Beat = normalizeBeat({
        ...data.beat,
        prices: {
          mp3: payload.prices.mp3 ?? null,
          wav: payload.prices.wav ?? null,
          stems: payload.prices.stems ?? null,
        },
      } as Beat);
      const next = [newBeat, ...get().beats];
      set({ beats: next });
      console.log("✅ Бит добавлен:", newBeat.title);

      // 🎯 Автоматически сохраняем цены как дефолтные, если это первая загрузка (defaultPrice === null)
      const licensesToUpdate: License[] = [];
      const currentLicenses = get().licenses;

      currentLicenses.forEach((license) => {
        const priceValue = payload.prices[license.id];
        // Если defaultPrice === null и цена указана, сохраняем как дефолтную
        if (license.defaultPrice === null && priceValue !== null && priceValue !== undefined) {
          licensesToUpdate.push({
            ...license,
            defaultPrice: priceValue,
          });
        }
      });

      // Если есть лицензии для обновления, сохраняем их
      if (licensesToUpdate.length > 0) {
        // Обновляем локально
        const updatedLicenses = currentLicenses.map((lic) => {
          const updated = licensesToUpdate.find((l) => l.id === lic.id);
          return updated || lic;
        });
        set({ licenses: updatedLicenses });

        // Сохраняем в БД
        const telegramId = get().telegramId;
        if (telegramId) {
          try {
            await fetch(`${API_BASE}/api/users/${telegramId}/licenses`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ licenses: updatedLicenses }),
            });
            console.log("✅ Дефолтные цены лицензий сохранены после первой загрузки:", licensesToUpdate);
          } catch (e) {
            console.error("❌ Ошибка сохранения дефолтных цен:", e);
          }
        }
      }
    },

    /* === ПРОФИЛЬ: смена ника (сохраняет в БД) === */
    async updateNickname(nextName: string) {
      const name = nextName.trim().slice(0, 15); // ✅ Ограничение 15 символов
      if (!name) return;

      const mePrev = get().me;
      const meNext: Seller = { ...mePrev, storeName: name };

      // 1) обновим me, seller локально
      set((state) => {
        const nextSeller =
          state.viewingOwnerId === mePrev.id
            ? ({ ...state.seller, storeName: name } as Seller)
            : state.seller;
        return { me: meNext, seller: nextSeller };
      });

      // 2) обновим автора в локальных битах (если автор совпадает с нами)
      const updatedBeats = get().beats.map((b) => {
        const anyBeat: any = { ...b };
        if (
          anyBeat.author &&
          (anyBeat.author.id === mePrev.id ||
            anyBeat.author.slug === mePrev.slug)
        ) {
          anyBeat.author = { ...anyBeat.author, name };
        }
        return anyBeat as Beat;
      });
      set({ beats: updatedBeats });

      // 3) сохраняем в БД
      const telegramId = get().telegramId;
      if (telegramId) {
        try {
          await fetch(`${API_BASE}/api/users/${telegramId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ storeName: name }),
          });
          console.log("✅ Ник обновлен в БД:", name);
        } catch (e) {
          console.error("❌ Ошибка при обновлении ника в БД:", e);
        }
      }
    },

    /* === УПРАВЛЕНИЕ ЛИЦЕНЗИЯМИ === */
    async loadLicenses() {
      const telegramId = get().telegramId;
      if (!telegramId) return;

      try {
        const response = await fetch(`${API_BASE}/api/users/${telegramId}/licenses`);
        if (response.ok) {
          const data = await response.json();
          if (data.licenses && Array.isArray(data.licenses)) {
            set({ licenses: data.licenses });
            console.log("✅ Лицензии загружены из БД:", data.licenses);
          }
        }
      } catch (e) {
        console.error("❌ Ошибка загрузки лицензий из БД:", e);
      }
    },

    async updateLicense(licenseId: string, updates: Partial<License>) {
      // Обновляем локально
      const updatedLicenses = get().licenses.map((lic) =>
        lic.id === licenseId ? { ...lic, ...updates } : lic
      );
      set({ licenses: updatedLicenses });

      // Сохраняем в БД
      const telegramId = get().telegramId;
      if (!telegramId) return;

      try {
        await fetch(`${API_BASE}/api/users/${telegramId}/licenses`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ licenses: updatedLicenses }),
        });
        console.log("✅ Лицензии обновлены в БД");
      } catch (e) {
        console.error("❌ Ошибка обновления лицензий в БД:", e);
      }
    },

    async addLicense(license: Omit<License, "id">) {
      const newLicense: License = {
        ...license,
        id: `custom_${Date.now()}`,
      };

      const updatedLicenses = [...get().licenses, newLicense];
      set({ licenses: updatedLicenses });

      // Сохраняем в БД
      const telegramId = get().telegramId;
      if (!telegramId) return;

      try {
        await fetch(`${API_BASE}/api/users/${telegramId}/licenses`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ licenses: updatedLicenses }),
        });
        console.log("✅ Новая лицензия добавлена в БД:", newLicense);
      } catch (e) {
        console.error("❌ Ошибка добавления лицензии в БД:", e);
      }
    },

    async deleteLicense(licenseId: string) {
      const updatedLicenses = get().licenses.filter((l) => l.id !== licenseId);
      set({ licenses: updatedLicenses });

      // Сохраняем в БД
      const telegramId = get().telegramId;
      if (!telegramId) return;

      try {
        await fetch(`${API_BASE}/api/users/${telegramId}/licenses`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ licenses: updatedLicenses }),
        });
        console.log("✅ Лицензия удалена из БД");
      } catch (e) {
        console.error("❌ Ошибка удаления лицензии из БД:", e);
      }
    },

    async updateBeatPrices(beatId: string, prices: Prices) {
      // Обновляем локально
      const updatedBeats = get().beats.map((b) =>
        b.id === beatId ? { ...b, prices } : b
      );
      set({ beats: updatedBeats });

      // Отправляем в БД
      try {
        const response = await fetch(`${API_BASE}/api/beats/${beatId}/prices`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prices }),
        });

        if (!response.ok) {
          throw new Error("Failed to update prices in database");
        }

        console.log(`✅ Цены обновлены в БД для бита ${beatId}:`, prices);
      } catch (e) {
        console.error("❌ Ошибка при обновлении цен в БД:", e);
        // В случае ошибки откатываем изменения
        set({ beats: get().beats });
      }
    },

    /* === РОЛИ === */
    async selectRole(role: "producer" | "artist") {
      const currentIsNew = get().session.isNewUser;
      console.log("🎭 selectRole вызван:", {
        role,
        telegramId: get().telegramId,
        isNewUser: currentIsNew,
      });

      const newSession: Session = { role, isNewUser: false };
      set({ session: newSession });
      saveSessionToLS(newSession);

      const telegramId = get().telegramId;
      if (!telegramId) {
        console.warn("⚠️ telegramId отсутствует, пользователь не сохранён в БД!");
        return;
      }

      try {
        // Сначала проверяем существует ли пользователь
        console.log("🔍 Проверяем существует ли пользователь...");
        const checkResponse = await fetch(`${API_BASE}/api/users/${telegramId}`);

        if (checkResponse.status === 404) {
          // Пользователь НЕ создан - создаём его с выбранной ролью
          console.log("👋 Пользователь ещё не создан, создаём с ролью:", role);
          const createResponse = await fetch(`${API_BASE}/api/users`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              telegram_id: telegramId,
              username: telegramData.username,
              role, // выбранная роль
            }),
          });
          const createData = await createResponse.json();
          console.log("✅ Пользователь создан:", createData);
        } else {
          // Пользователь существует - обновляем роль
          console.log("📤 Обновляем роль пользователя через PATCH:", role);
          const response = await fetch(`${API_BASE}/api/users/${telegramId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role }),
          });
          const data = await response.json();
          console.log("✅ Роль обновлена:", { status: response.status, data });
        }
      } catch (e) {
        console.error("❌ Ошибка при сохранении роли:", e);
      }
    },

    async changeRole(role: "producer") {
      const currentRole = get().session.role;
      // Разрешаем смену только с artist на producer
      if (currentRole === "artist") {
        const newSession: Session = { role, isNewUser: false };
        set({ session: newSession });
        saveSessionToLS(newSession);

        // Отправляем на сервер, если есть telegramId
        const telegramId = get().telegramId;
        if (telegramId) {
          try {
            await fetch(`${API_BASE}/api/users/${telegramId}/role`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ role }),
            });
          } catch (e) {
            console.error("Ошибка при смене роли:", e);
          }
        }
      }
    },
  };
});

// Асинхронная инициализация пользователя - выполняется ПОСЛЕ создания store
(async () => {
  console.log("🚀 Начало инициализации пользователя, API_BASE:", API_BASE);
  try {
    // Загружаем биты в фоне
    const state = useApp.getState();
    if (!state._bootDone) {
      console.log("📦 Загружаем биты...");
      state.bootstrap().catch((e) => console.error("❌ Ошибка загрузки битов:", e));
    }

    // Если есть telegramId, проверяем/создаём пользователя в БД
    if (telegramData.telegramId) {
      try {
        console.log("🔍 Проверяем пользователя в БД...", telegramData.telegramId);
        const response = await fetch(`${API_BASE}/api/users/${telegramData.telegramId}`);
        console.log("📡 Ответ от сервера:", response.status, response.statusText);

        if (response.status === 404) {
          // Пользователя НЕТ в БД - создаём сразу как АРТИСТА
          console.log("👋 Пользователь не найден в БД, создаём как артиста...");
          const createResponse = await fetch(`${API_BASE}/api/users`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              telegram_id: telegramData.telegramId,
              username: telegramData.username,
              role: "artist", // ✅ Автоматически создаём как артиста
            }),
          });
          const createData = await createResponse.json();
          console.log("✅ Пользователь создан с role=artist:", createData);

          // Устанавливаем сессию для нового артиста
          const newUserSession: Session = { role: "artist", isNewUser: false };
          useApp.setState({ session: newUserSession, userInitialized: true });
          saveSessionToLS(newUserSession);
          console.log("🎭 Установлена сессия для нового пользователя (артист)");

          // Загружаем лицензии
          useApp.getState().loadLicenses();

        } else if (response.ok) {
          // Пользователь СУЩЕСТВУЕТ - загружаем ВСЕ данные из БД
          const data = await response.json();
          console.log("✅ Пользователь найден в БД:", data.user);
          if (data.user) {
            // Загружаем подписку пользователя
            let userPlan: Plan = "free";
            try {
              const subResponse = await fetch(`${API_BASE}/api/users/${telegramData.telegramId}/subscription`);
              if (subResponse.ok) {
                const subData = await subResponse.json();
                if (subData.subscription?.subscription) {
                  userPlan = subData.subscription.subscription.name.toLowerCase() as Plan;
                  console.log("✅ Подписка загружена:", userPlan);
                }
              }
            } catch (e) {
              console.warn("⚠️ Ошибка загрузки подписки, используем Free:", e);
            }

            // Обновляем данные пользователя из БД
            const userFromDB: Seller = {
              id: `user:${data.user.telegram_id}`,
              slug: data.user.username || telegramData.username || "user",
              storeName: data.user.store_name || data.user.username || telegramData.username || "User",
              plan: userPlan,
            };

            const existingUserSession: Session = {
              role: data.user.role || "artist", // фоллбэк если null
              isNewUser: false,
            };

            useApp.setState({
              me: userFromDB,
              seller: userFromDB,
              session: existingUserSession,
              userInitialized: true
            });
            saveSessionToLS(existingUserSession);
            console.log("🔄 Загружены данные пользователя из БД:", userFromDB);

            // Загружаем лицензии для продюсера
            if (existingUserSession.role === "producer") {
              useApp.getState().loadLicenses();
            }
          } else {
            console.warn("⚠️ Пользователь не найден в ответе, устанавливаем дефолтную сессию");
            useApp.setState({ userInitialized: true });
          }
        } else {
          console.error("❌ Неожиданный статус ответа:", response.status);
          useApp.setState({ userInitialized: true });
        }
      } catch (e) {
        console.error("❌ Ошибка при проверке/создании пользователя:", e);
        useApp.setState({ userInitialized: true }); // Даже при ошибке, чтобы не зависнуть на загрузке
      }
    } else {
      console.log("⚠️ Нет telegramId, пропускаем инициализацию пользователя");
      useApp.setState({ userInitialized: true }); // Нет telegramId - сразу инициализирован
    }
  } catch (e) {
    console.error("❌ Критическая ошибка инициализации:", e);
    useApp.setState({ userInitialized: true }); // При любой ошибке разблокируем UI
  }
  console.log("✅ Инициализация завершена, userInitialized =", useApp.getState().userInitialized);
})();
