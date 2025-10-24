// ===================================
// BEATSTORE DATABASE TYPES (v2 - Clean Schema)
// ===================================

export type UserRole = "producer" | "artist";
export type PaymentMethod = "TON" | "Stars";
export type FileType = "mp3" | "wav" | "stems";
export type OrderStatus = "pending" | "paid" | "failed" | "refunded" | "cancelled";
export type OfferStatus = "open" | "counter" | "accepted" | "declined" | "expired" | "cancelled";

// ===================================
// 1. USER
// ===================================
export interface User {
  id: number;
  telegram_id: number;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role: UserRole;

  // Profile fields
  bio: string | null;
  contact_username: string | null;

  // Social links
  instagram_url: string | null;
  youtube_url: string | null;
  soundcloud_url: string | null;
  spotify_url: string | null;
  other_links: Record<string, string> | null; // JSONB

  balance: number;

  // Viewer mode (guest viewing producer's store)
  viewed_producer_id: number | null;

  // Producer defaults
  free_download_default: boolean;

  created_at: Date;
  updated_at: Date;
}

export interface CreateUserInput {
  telegram_id: number;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  role: UserRole;
}

export interface UpdateUserInput {
  username?: string;
  display_name?: string;
  avatar_url?: string | null;
  bio?: string;
  contact_username?: string;
  instagram_url?: string;
  youtube_url?: string;
  soundcloud_url?: string;
  spotify_url?: string;
  other_links?: Record<string, string>;
  viewed_producer_id?: number | null;
  free_download_default?: boolean;
}

// ===================================
// 2. PLAN (formerly Subscription)
// ===================================
export interface Plan {
  id: number;
  code: string; // 'Free', 'Basic', 'Pro'
  name: string;
  description: string | null;
  price: number;

  // Features
  max_beats: number | null; // NULL = unlimited
  custom_licenses: boolean;
  analytics: boolean;
  can_rename_lic: boolean;
  default_license_count: number;

  created_at: Date;
}

// ===================================
// 3. USER_PLAN (formerly UserSubscription)
// ===================================
export interface UserPlan {
  id: number;
  user_id: number;
  plan_id: number;

  started_at: Date;
  expires_at: Date | null;
  is_active: boolean;
}

export interface CreateUserPlanInput {
  user_id: number;
  plan_id: number;
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
// 5. BEAT
// ===================================
export interface Beat {
  id: number;
  user_id: number; // producer

  title: string;
  bpm: number | null;
  key_sig: string | null; // renamed from 'key' to avoid reserved word
  genre: string | null;
  tags: string[] | null;

  // File URLs (S3)
  cover_url: string | null;
  mp3_tagged_url: string | null; // for preview/free download
  mp3_untagged_url: string | null; // for sale
  wav_url: string | null;
  stems_url: string | null;

  free_download: boolean;
  free_dl_count: number;

  views_count: number;
  sales_count: number;

  created_at: Date;
  updated_at: Date;
}

export interface CreateBeatInput {
  user_id: number;
  title: string;
  bpm?: number;
  key_sig?: string;
  genre?: string;
  tags?: string[];
  cover_url?: string;
  mp3_tagged_url?: string;
  mp3_untagged_url?: string;
  wav_url?: string;
  stems_url?: string;
  free_download?: boolean;
}

export interface UpdateBeatInput {
  title?: string;
  bpm?: number;
  key_sig?: string;
  genre?: string;
  tags?: string[];
  cover_url?: string;
  mp3_tagged_url?: string;
  mp3_untagged_url?: string;
  wav_url?: string;
  stems_url?: string;
  free_download?: boolean;
}

// ===================================
// 6. LICENSE (producer-owned)
// ===================================
export interface License {
  id: number;
  user_id: number; // producer owner

  lic_key: string; // 'basic', 'premium', 'unlimited', 'custom_xxx'
  name: string;
  description: string | null;

  // File composition
  incl_mp3: boolean;
  incl_wav: boolean;
  incl_stems: boolean;

  is_hidden: boolean;

  // Pricing
  default_price: number | null;
  min_price: number | null;

  created_at: Date;
  updated_at: Date;
}

export interface CreateLicenseInput {
  user_id: number;
  lic_key: string;
  name: string;
  description?: string;
  incl_mp3?: boolean;
  incl_wav?: boolean;
  incl_stems?: boolean;
  default_price?: number;
  min_price?: number;
}

export interface UpdateLicenseInput {
  name?: string;
  description?: string;
  incl_mp3?: boolean;
  incl_wav?: boolean;
  incl_stems?: boolean;
  default_price?: number;
  min_price?: number;
  is_hidden?: boolean;
}

// ===================================
// 7. BL_PRICES (beat-level price overrides)
// ===================================
export interface BeatLicensePrice {
  beat_id: number;
  license_id: number;
  price: number | null; // NULL or 0 = not available for this beat

  created_at: Date;
  updated_at: Date;
}

export interface UpsertBeatLicensePriceInput {
  beat_id: number;
  license_id: number;
  price: number | null;
}

// ===================================
// 8. CART
// ===================================
export interface CartItem {
  id: number;
  user_id: number; // buyer (artist)
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
// 9. ORDERS & ORDER_ITEMS
// ===================================
export interface Order {
  id: number;
  buyer_id: number;
  total_amount: number;
  method: PaymentMethod | null;
  status: OrderStatus;
  payment_ref: any | null; // JSONB
  created_at: Date;
  paid_at: Date | null;
}

export interface OrderItem {
  id: number;
  order_id: number;
  beat_id: number;
  seller_id: number; // producer
  license_id: number;

  unit_price: number; // frozen price at purchase time
  includes: any; // JSONB snapshot of rights

  created_at: Date;
}

export interface CreateOrderInput {
  buyer_id: number;
  total_amount: number;
  method?: PaymentMethod;
  status?: OrderStatus;
}

export interface CreateOrderItemInput {
  order_id: number;
  beat_id: number;
  seller_id: number;
  license_id: number;
  unit_price: number;
  includes: any;
}

// ===================================
// 10. PURCHASE (shortcut table, optional)
// ===================================
export interface Purchase {
  id: number;
  buyer_id: number;
  seller_id: number;
  beat_id: number;
  license_id: number;

  amount: number;
  method: PaymentMethod;
  payment_ref: any | null; // JSONB

  created_at: Date;
}

export interface CreatePurchaseInput {
  buyer_id: number;
  seller_id: number;
  beat_id: number;
  license_id: number;
  amount: number;
  method: PaymentMethod;
  payment_ref?: any;
}

// ===================================
// 11. DOWNLOAD
// ===================================
export interface Download {
  id: number;
  user_id: number; // who downloaded
  beat_id: number;
  order_item_id: number | null; // NULL if free
  is_free: boolean;

  file_type: FileType;

  // Telegram user info at download time
  tg_username: string | null; // 'hidden' if hidden
  tg_name: string | null;
  tg_photo_url: string | null;

  downloaded_at: Date;
}

export interface CreateDownloadInput {
  user_id: number;
  beat_id: number;
  order_item_id?: number;
  is_free?: boolean;
  file_type: FileType;
  tg_username?: string;
  tg_name?: string;
  tg_photo_url?: string;
}

// ===================================
// 12. BEAT_VIEW
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
// 13. OFFER (price negotiation)
// ===================================
export interface Offer {
  id: number;
  beat_id: number;
  license_id: number | null; // NULL for exclusive if treated separately
  buyer_id: number;
  seller_id: number; // producer

  ask_price: number | null; // buyer's proposed price
  min_price: number | null; // snapshot of license min_price
  status: OfferStatus;

  created_at: Date;
  updated_at: Date;
}

export interface CreateOfferInput {
  beat_id: number;
  license_id?: number;
  buyer_id: number;
  seller_id: number;
  ask_price?: number;
  min_price?: number;
}

export interface UpdateOfferInput {
  ask_price?: number;
  status?: OfferStatus;
}

// ===================================
// 14. PAYOUT
// ===================================
export interface Payout {
  id: number;
  user_id: number; // producer
  amount: number;
  method: PaymentMethod;
  status: string; // 'pending', 'completed', 'failed'
  details: any | null; // JSONB (wallet address, etc.)

  created_at: Date;
  completed_at: Date | null;
}

export interface CreatePayoutInput {
  user_id: number;
  amount: number;
  method: PaymentMethod;
  details?: any;
}

// ===================================
// JOINED TYPES (for queries with JOINs)
// ===================================

export interface BeatWithProducer extends Beat {
  producer: {
    id: number;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export interface BeatWithLicenses extends Beat {
  licenses: Array<{
    license_id: number;
    lic_key: string;
    license_name: string;
    final_price: number | null;
    incl_mp3: boolean;
    incl_wav: boolean;
    incl_stems: boolean;
  }>;
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
    final_price: number;
  };
}

// ===================================
// VIEW TYPES
// ===================================

// For v_effective_prices view
export interface EffectivePrice {
  beat_id: number;
  license_id: number;
  producer_id: number;
  lic_key: string;
  name: string;
  description: string | null;
  incl_mp3: boolean;
  incl_wav: boolean;
  incl_stems: boolean;
  is_hidden: boolean;
  default_price: number | null;
  min_price: number | null;
  override_price: number | null;
  final_price: number | null;
  is_override: boolean;
}

// For v_beat_licenses view
export interface BeatLicenseView {
  beat_id: number;
  license_id: number;
  lic_key: string;
  license_name: string;
  description: string | null;
  incl_mp3: boolean;
  incl_wav: boolean;
  incl_stems: boolean;
  is_hidden: boolean;
  default_price: number | null;
  min_price: number | null;
  override_price: number | null;
  final_price: number | null;
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
  free_dl_count: number;
}

export interface ProducerAnalytics {
  total_views: number;
  total_sales: number;
  total_revenue: number;
  total_free_downloads: number;
  beats: BeatAnalytics[];
}
