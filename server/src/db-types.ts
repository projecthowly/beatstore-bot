// ===================================
// 🎵 BEATSTORE DATABASE TYPES
// ===================================

export type UserRole = "producer" | "artist";
export type PaymentMethod = "TON" | "Stars";
export type FileType = "mp3" | "wav" | "stems";

// ===================================
// 1. USER
// ===================================
export interface User {
  id: number;
  telegram_id: number;
  username: string | null;
  avatar_url: string | null;
  role: UserRole | null; // NULL = роль ещё не выбрана

  // Для продюсеров
  bio: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  soundcloud_url: string | null;
  spotify_url: string | null;
  other_links: Record<string, string> | null; // JSONB

  balance: number;

  created_at: Date;
  updated_at: Date;
}

export interface CreateUserInput {
  telegram_id: number;
  username?: string;
  avatar_url?: string;
  role?: UserRole | null; // Опционально, по умолчанию NULL
}

export interface UpdateUserInput {
  username?: string;
  avatar_url?: string;
  role?: UserRole;
  bio?: string;
  instagram_url?: string;
  youtube_url?: string;
  soundcloud_url?: string;
  spotify_url?: string;
  other_links?: Record<string, string>;
}

// ===================================
// 2. SUBSCRIPTION
// ===================================
export interface Subscription {
  id: number;
  name: string; // 'Free', 'Basic', 'Pro'
  description: string | null;
  price: number;

  max_beats: number | null;
  can_create_licenses: boolean;
  has_analytics: boolean;

  created_at: Date;
}

// ===================================
// 3. USER_SUBSCRIPTION
// ===================================
export interface UserSubscription {
  id: number;
  user_id: number;
  subscription_id: number;

  started_at: Date;
  expires_at: Date | null;
  is_active: boolean;
}

export interface CreateUserSubscriptionInput {
  user_id: number;
  subscription_id: number;
  expires_at?: Date;
}

// ===================================
// 4. DEEPLINK
// ===================================
export interface Deeplink {
  id: number;
  user_id: number;
  custom_name: string;

  created_at: Date;
  updated_at: Date;
}

export interface CreateDeeplinkInput {
  user_id: number;
  custom_name: string;
}

export interface UpdateDeeplinkInput {
  custom_name: string;
}

// ===================================
// 5. LICENSE
// ===================================
export interface License {
  id: number;
  user_id: number | null; // NULL = глобальная

  name: string;
  description: string | null;
  terms: string | null;

  includes_mp3: boolean;
  includes_wav: boolean;
  includes_stems: boolean;

  is_global: boolean;

  created_at: Date;
  updated_at: Date;
}

export interface CreateLicenseInput {
  user_id?: number;
  name: string;
  description?: string;
  terms?: string;
  includes_mp3?: boolean;
  includes_wav?: boolean;
  includes_stems?: boolean;
}

export interface UpdateLicenseInput {
  name?: string;
  description?: string;
  terms?: string;
  includes_mp3?: boolean;
  includes_wav?: boolean;
  includes_stems?: boolean;
}

// ===================================
// 6. BEAT
// ===================================
export interface Beat {
  id: number;
  user_id: number;

  title: string;
  bpm: number | null;
  key: string | null;
  genre: string | null;
  tags: string[] | null;

  mp3_file_path: string | null;
  wav_file_path: string | null;
  stems_file_path: string | null;
  cover_file_path: string | null;

  views_count: number;
  sales_count: number;

  created_at: Date;
  updated_at: Date;
}

export interface CreateBeatInput {
  user_id: number;
  title: string;
  bpm?: number;
  key?: string;
  genre?: string;
  tags?: string[];
  mp3_file_path?: string;
  wav_file_path?: string;
  stems_file_path?: string;
  cover_file_path?: string;
}

export interface UpdateBeatInput {
  title?: string;
  bpm?: number;
  key?: string;
  genre?: string;
  tags?: string[];
  mp3_file_path?: string;
  wav_file_path?: string;
  stems_file_path?: string;
  cover_file_path?: string;
}

// ===================================
// 7. BEAT_LICENSE
// ===================================
export interface BeatLicense {
  id: number;
  beat_id: number;
  license_id: number;
  price: number;

  created_at: Date;
}

export interface CreateBeatLicenseInput {
  beat_id: number;
  license_id: number;
  price: number;
}

export interface UpdateBeatLicenseInput {
  price: number;
}

// ===================================
// 8. CART
// ===================================
export interface CartItem {
  id: number;
  user_id: number;
  beat_id: number;
  license_id: number;

  added_at: Date;
}

export interface AddToCartInput {
  user_id: number;
  beat_id: number;
  license_id: number;
}

// ===================================
// 9. PURCHASE
// ===================================
export interface Purchase {
  id: number;
  user_id: number;
  beat_id: number;
  license_id: number;

  price: number;
  payment_method: PaymentMethod;

  purchased_at: Date;
}

export interface CreatePurchaseInput {
  user_id: number;
  beat_id: number;
  license_id: number;
  price: number;
  payment_method: PaymentMethod;
}

// ===================================
// 10. DOWNLOAD
// ===================================
export interface Download {
  id: number;
  purchase_id: number | null;
  beat_id: number;
  user_id: number;

  file_type: FileType;
  is_free: boolean;

  downloaded_at: Date;
}

export interface CreateDownloadInput {
  purchase_id?: number;
  beat_id: number;
  user_id: number;
  file_type: FileType;
  is_free?: boolean;
}

// ===================================
// 11. BEAT_VIEW
// ===================================
export interface BeatView {
  id: number;
  beat_id: number;
  user_id: number | null;

  viewed_at: Date;
}

export interface CreateBeatViewInput {
  beat_id: number;
  user_id?: number;
}

// ===================================
// JOINED TYPES (для запросов с JOIN)
// ===================================

export interface BeatWithProducer extends Beat {
  producer: {
    id: number;
    username: string | null;
    avatar_url: string | null;
  };
}

export interface BeatWithLicenses extends Beat {
  licenses: Array<{
    license_id: number;
    license_name: string;
    price: number;
    includes_mp3: boolean;
    includes_wav: boolean;
    includes_stems: boolean;
  }>;
}

export interface PurchaseWithDetails extends Purchase {
  beat: {
    id: number;
    title: string;
    cover_url: string | null;
  };
  license: {
    id: number;
    name: string;
  };
  producer: {
    id: number;
    username: string | null;
  };
}

export interface CartItemWithDetails extends CartItem {
  beat: {
    id: number;
    title: string;
    cover_url: string | null;
    producer_username: string | null;
  };
  license: {
    id: number;
    name: string;
    price: number;
  };
}

// ===================================
// ANALYTICS TYPES
// ===================================

export interface BeatAnalytics {
  beat_id: number;
  beat_title: string;
  views_count: number;
  sales_count: number;
  revenue: number;
  free_downloads_count: number;
}

export interface ProducerAnalytics {
  total_views: number;
  total_sales: number;
  total_revenue: number;
  total_free_downloads: number;
  beats: BeatAnalytics[];
}

export interface SalesHistoryItem {
  purchase_id: number;
  beat_title: string;
  buyer_username: string | null;
  license_name: string;
  price: number;
  purchased_at: Date;
}
