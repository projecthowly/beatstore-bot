import { create } from "zustand";
import type { Beat, LicenseType, Plan, Session, Seller } from "./types";

/* ========= API base ========= */
const API_BASE =
  (import.meta as any)?.env?.VITE_API_URL?.replace(/\/+$/, "") ||
  "http://localhost:8080";

/* ========= Telegram Data ========= */
// Получаем данные из URL параметров (переданных ботом)
function getTelegramDataFromUrl(): {
  telegramId: number | null;
  username: string | null;
  role: "producer" | "artist" | null;
  isNewUser: boolean;
} {
  try {
    const params = new URLSearchParams(window.location.search);
    const tgId = params.get("tgId");
    const username = params.get("username");
    const role = params.get("role");
    const isNew = params.get("isNew");

    console.log("🔍 getTelegramDataFromUrl:", {
      url: window.location.href,
      tgId,
      username,
      role,
      isNew,
      parsedIsNew: isNew === "1",
    });

    return {
      telegramId: tgId ? parseInt(tgId, 10) : null,
      username: username || null,
      role: role === "producer" || role === "artist" ? role : null,
      isNewUser: isNew === "1",
    };
  } catch {
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

/* ========= localStorage ========= */
const LS_BEATS = "gb:beats:v2";
const LS_PROFILE = "gb:profile:v1"; // <— профайл (me/seller)
const LS_SESSION = "gb:session:v1"; // <— роль и флаг нового пользователя
const OLD_KEYS = ["gb:beats", "gb_beats_v1"];

function loadBeatsFromLS(): Beat[] {
  try {
    const raw = localStorage.getItem(LS_BEATS);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    const list = Array.isArray(arr) ? (arr as Beat[]) : [];
    return list.map(normalizeBeat);
  } catch {
    return [];
  }
}
function saveBeatsToLS(beats: Beat[]) {
  try {
    localStorage.setItem(LS_BEATS, JSON.stringify(beats));
  } catch {}
}

type Profile = { id: string; slug: string; storeName: string; plan: Plan };
function loadProfileFromLS(defaults: Profile): Profile {
  try {
    const raw = localStorage.getItem(LS_PROFILE);
    if (!raw) return defaults;
    const p = JSON.parse(raw);
    if (!p || typeof p !== "object") return defaults;
    const merged: Profile = {
      id: String(p.id || defaults.id),
      slug: String(p.slug || defaults.slug),
      storeName: String(p.storeName || defaults.storeName),
      plan: (p.plan as Plan) || defaults.plan,
    };
    return merged;
  } catch {
    return defaults;
  }
}
function saveProfileToLS(p: Profile) {
  try {
    localStorage.setItem(LS_PROFILE, JSON.stringify(p));
  } catch {}
}

function loadSessionFromLS(): Session | null {
  try {
    const raw = localStorage.getItem(LS_SESSION);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || typeof s !== "object") return null;
    return {
      role: s.role === "artist" ? "artist" : "producer",
      isNewUser: s.isNewUser === true,
    };
  } catch {
    return null;
  }
}
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
type Prices = { mp3: number | null; wav: number | null; stems: number | null };
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

type AppState = {
  beats: Beat[];
  seller: Seller;
  me: Seller;
  session: Session;
  viewingOwnerId: string | null;
  telegramId: number | null; // ID пользователя из Telegram

  playingBeatId: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  lastBeatUrl: string | null;
  volume: number;

  cart: CartItem[];

  playerCollapsed: boolean;
  setPlayerCollapsed: (collapsed: boolean) => void;
  togglePlayerCollapsed: () => void;

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

  /** обновление ника с ПОЛНОЙ персистенцией и обновлением автора в битах */
  updateNickname: (next: string) => void;

  /** выбор роли для нового пользователя */
  selectRole: (role: "producer" | "artist") => void;

  /** смена роли (только artist → producer) */
  changeRole: (role: "producer") => void;
};

const mockMe: Seller = {
  id: "me-1",
  slug: "howly",
  storeName: "Howly",
  plan: "free" as Plan,
};

export const useApp = create<AppState>((set, get) => {
  try {
    OLD_KEYS.forEach((k) => localStorage.removeItem(k));
  } catch {}

  // загрузим профиль из LS (если есть)
  const prof = loadProfileFromLS({
    id: mockMe.id,
    slug: mockMe.slug,
    storeName: mockMe.storeName,
    plan: mockMe.plan,
  });
  const initialMe: Seller = {
    id: prof.id,
    slug: prof.slug,
    storeName: prof.storeName,
    plan: prof.plan,
  };

  audio.addEventListener("timeupdate", () =>
    set({ currentTime: audio.currentTime }),
  );
  audio.addEventListener("durationchange", () =>
    set({ duration: Number.isFinite(audio.duration) ? audio.duration : 0 }),
  );
  audio.addEventListener("ended", () => set({ isPlaying: false }));

  (async () => {
    try {
      if (!get()._bootDone) await get().bootstrap();
    } catch {}
  })();

  // Загружаем сессию: приоритет у данных из Telegram, затем из LS
  let initialSession: Session;
  if (telegramData.role) {
    // Данные пришли от бота
    initialSession = {
      role: telegramData.role,
      isNewUser: telegramData.isNewUser,
    };
    console.log("✅ Сессия загружена из URL:", initialSession);
  } else {
    // Фоллбэк на localStorage
    const savedSession = loadSessionFromLS();
    initialSession = savedSession || { role: "producer", isNewUser: true };
    console.log("📦 Сессия загружена из localStorage:", initialSession);
  }

  return {
    beats: loadBeatsFromLS(),
    seller: initialMe,
    me: initialMe,
    session: initialSession,
    viewingOwnerId: initialMe.id,
    telegramId: telegramData.telegramId,

    playingBeatId: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    lastBeatUrl: null,
    volume: 0.8,

    cart: [],
    playerCollapsed: false,
    _bootDone: false,

    initFromUrl() {
      const url = new URL(window.location.href);
      const mode = url.searchParams.get("mode");
      const sellerParam = url.searchParams.get("seller");
      if (mode === "link" && sellerParam) {
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
        saveBeatsToLS(beats);
      } catch {
        const ls = loadBeatsFromLS();
        set({ beats: ls, _bootDone: true });
      }
    },

    isOwnStore() {
      return get().viewingOwnerId === get().me.id;
    },
    goToOwnStore() {
      const newSession: Session = {
        role: "producer",
        isNewUser: get().session.isNewUser  // ✅ Сохраняем флаг
      };
      set({
        session: newSession,
        seller: get().me,
        viewingOwnerId: get().me.id,
      });
      saveSessionToLS(newSession);  // ✅ Персистим в localStorage

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
      saveBeatsToLS(next);
    },

    /* === ПРОФИЛЬ: смена ника с персистом и апдейтом авторов === */
    updateNickname(nextName: string) {
      const name = nextName.trim();
      if (!name) return;

      const mePrev = get().me;
      const meNext: Seller = { ...mePrev, storeName: name };

      // 1) обновим me, seller
      set((state) => {
        const nextSeller =
          state.viewingOwnerId === mePrev.id
            ? ({ ...state.seller, storeName: name } as Seller)
            : state.seller;
        return { me: meNext, seller: nextSeller };
      });

      // 2) персистим профиль
      saveProfileToLS({
        id: meNext.id,
        slug: meNext.slug,
        storeName: meNext.storeName,
        plan: meNext.plan,
      });

      // 3) обновим автора в локальных битах (если автор совпадает с нами)
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
      saveBeatsToLS(updatedBeats);
    },

    /* === РОЛИ === */
    async selectRole(role: "producer" | "artist") {
      const newSession: Session = { role, isNewUser: false };
      set({ session: newSession });
      saveSessionToLS(newSession);

      // Отправляем на сервер, если есть telegramId
      const telegramId = get().telegramId;
      if (telegramId) {
        try {
          await fetch(`${API_BASE}/api/users`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              telegram_id: telegramId,
              username: telegramData.username,
              role,
            }),
          });
        } catch (e) {
          console.error("Ошибка при создании пользователя:", e);
        }
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
