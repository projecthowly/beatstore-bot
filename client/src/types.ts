export type LicenseType = 'mp3' | 'wav' | 'stems';

export type Beat = {
  id: string;
  title: string;
  key: string;      // тональность, напр. "Am"
  bpm: number;
  coverUrl: string;
  files: { mp3?: string; wav?: string; stems?: string };
  prices: { mp3?: number; wav?: number; stems?: number };
};

export type Plan = 'free' | 'basic' | 'pro';

export type Seller = {
  id: string;
  storeName: string; // отображается как "<storeName> Store"
  slug: string;      // для диплинка ?startapp=<slug>
  avatarUrl?: string;
  plan: Plan;
};

export type Session = {
  tgUser?: { id?: number; username?: string; photoUrl?: string };
  role: 'maker' | 'listener';
  currentSellerSlug?: string;
};
