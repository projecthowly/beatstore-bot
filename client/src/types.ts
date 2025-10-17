export type Plan = 'free' | 'basic' | 'pro';
export type LicenseType = 'mp3' | 'wav' | 'stems';

export type Seller = {
  id: string;
  slug: string;
  storeName: string;
  plan: Plan;
};

export type Session = {
  role: 'producer' | 'artist';
  isNewUser: boolean; // обязательное поле для определения нового пользователя
};

export type Beat = {
  id: string;
  title: string;
  key: string;   // "Am"
  bpm: number;
  coverUrl: string;

  files: {
    mp3: string;
    wav: string;
    stems: string;
  };

  prices: {
    [licenseId: string]: { name: string; price: number } | null;
  };

  /** опциональный автор, если сервер его присылает */
  author?: {
    id: string;
    name: string;
    slug?: string;
  } | null;
};
