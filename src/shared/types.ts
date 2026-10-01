// Wire contracts shared by the backend endpoints, dashboard, and site plugins.

export type AccessTier = 'BASIC' | 'PRO_TRIAL' | 'PRO' | 'INTERNAL_WIX';
export type BillingActionType = 'START_TRIAL' | 'UPGRADE' | 'MANAGE_PLAN';
export type TrialStatus = 'NONE' | 'IN_PROGRESS' | 'ENDED';

export interface BillingAction {
  type: BillingActionType;
  url: string;
}

export interface UsageSummary {
  used: number;
  /** `null` when the tier has no monthly limit. */
  limit: number | null;
  remaining: number | null;
  periodStart: string | null;
  periodEnd: string | null;
}

export interface BillingSummary {
  tier: AccessTier;
  unlimited: boolean;
  usage: UsageSummary;
  trial: {
    eligible: boolean;
    status: TrialStatus;
    /** Only set when Wix supplies a reliable date. */
    endDate: string | null;
  };
  plan: {
    packageName: string | null;
    billingCycle: string | null;
    autoRenewing: boolean | null;
  };
  actions: BillingAction[];
  proPlanConfigured: boolean;
}

export type Requirement = 'OPTIONAL' | 'REQUIRED';

export interface ProductRuleInput {
  productName: string;
  enabled: boolean;
  requirement: Requirement;
  acceptedTypes: string[];
  maxFileSizeBytes: number;
  maxFiles: number;
  instructions: string;
}

export interface ProductRule extends ProductRuleInput {
  productId: string;
  updatedAt: string;
}

export interface ProductSummary {
  id: string;
  name: string;
  imageUrl: string | null;
  visible: boolean;
  rule: ProductRule | null;
}

export type CatalogVersion = 'V1_CATALOG' | 'V3_CATALOG' | 'STORES_NOT_INSTALLED';

export interface ProductsPage {
  catalogVersion: CatalogVersion;
  products: ProductSummary[];
  nextCursor: string | null;
}

export type UploadStatus =
  | 'RESERVED'
  | 'UPLOADING'
  | 'PROCESSING'
  | 'READY'
  | 'FAILED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'DELETED';

export type UploadSource = 'PRODUCT_PAGE' | 'CHECKOUT';
export type LinkStatus = 'PENDING' | 'LINKED' | 'UNRESOLVED';

export interface UploadRecord {
  id: string;
  productId: string;
  productName: string | null;
  variantId: string | null;
  source: UploadSource;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  status: UploadStatus;
  failureReason: string | null;
  createdAt: string;
  completedAt: string | null;
  binding: {
    lineItemId: string;
    cartId: string;
    orderId: string | null;
    orderNumber: string | null;
    linkStatus: LinkStatus;
  } | null;
}

export interface UploadsPage {
  uploads: UploadRecord[];
  nextCursor: string | null;
}

export interface OrderSummary {
  orderId: string;
  orderNumber: string | null;
  createdAt: string;
  linkedFiles: number;
  unresolvedFiles: number;
}

export interface OrdersPage {
  orders: OrderSummary[];
  nextCursor: string | null;
}

export interface OrderDetail {
  order: OrderSummary | null;
  files: UploadRecord[];
}

export interface WixOrderLineItem {
  id: string;
  name: string | null;
  quantity: number;
  price: string | null;
  total: string | null;
  image: string | null;
  options: string[];
}

export interface WixOrderDetails {
  id: string;
  number: string | null;
  createdAt: string | null;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  buyer: { name: string | null; email: string | null };
  buyerNote: string | null;
  totals: { subtotal: string | null; shipping: string | null; tax: string | null; discount: string | null; total: string | null };
  lineItems: WixOrderLineItem[];
}

export interface OrderFilesPage extends OrderDetail {
  nextCursor: string | null;
}

export interface EnableAllProductsResult {
  updated: number;
}

/** The live upload session a browser uses for Wix's TUS flow. */
export interface UploadSession {
  upload: UploadRecord;
  uploadUrl: string;
  uploadToken: string;
}

export interface ReserveUploadRequest {
  productId: string;
  variantId: string | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  source: UploadSource;
  checkoutId?: string;
  lineItemId?: string;
}

export interface CompleteUploadRequest {
  fileId: string;
}

export interface StorefrontRule {
  requirement: Requirement;
  acceptedTypes: string[];
  maxFileSizeBytes: number;
  maxFiles: number;
  instructions: string;
}

export interface StorefrontProductConfig {
  enabled: boolean;
  rule: StorefrontRule | null;
  uploads: UploadRecord[];
  text: StorefrontText;
}

export interface CheckoutLineItemState {
  lineItemId: string;
  productId: string;
  variantId: string | null;
  name: string;
  quantity: number;
  rule: StorefrontRule;
  files: UploadRecord[];
}

export interface CheckoutState {
  cartId: string;
  lineItems: CheckoutLineItemState[];
  unboundUploads: UploadRecord[];
  text: StorefrontText;
}

export interface BindRequest {
  checkoutId: string;
  lineItemId: string;
  uploadId: string;
}

export interface UnbindRequest {
  checkoutId: string;
  uploadId: string;
}

export interface StorefrontText {
  productPageTitle: string;
  productPageHelp: string;
  checkoutTitle: string;
  checkoutHelp: string;
}

export interface RuleDefaults {
  acceptedTypes: string[];
  maxFileSizeBytes: number;
  maxFiles: number;
}

export interface AppSettings {
  storefront: StorefrontText;
  defaults: RuleDefaults;
}

export interface SettingsResponse {
  settings: AppSettings;
  checkoutVerification: {
    verifiedAt: string | null;
    orderId: string | null;
  };
}

export interface PlacementState {
  pluginId: string;
  name: string;
  placedInSlot: boolean | null;
}

export type ProductPageVersion = 'NEW' | 'OLD' | 'UNKNOWN';

export interface PluginStatusResponse {
  catalogVersion: CatalogVersion;
  productPageVersion: ProductPageVersion;
  productPage: PlacementState;
  checkout: PlacementState;
  /** Set when Wix could not report placement status. */
  statusError: string | null;
}

export interface AnalyticsResponse {
  daily: { date: string; uploads: number }[];
  totals: {
    readyFiles: number;
    filesThisPeriod: number;
    ordersWithFiles: number;
    unresolvedLinks: number;
    enabledProducts: number;
    requiredProducts: number;
  };
}

export type ApiErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'INVALID_REQUEST'
  | 'CONFLICT'
  | 'MONTHLY_UPLOAD_LIMIT_REACHED'
  | 'TOO_MANY_ACTIVE_UPLOADS'
  | 'VISITOR_DAILY_LIMIT_REACHED'
  | 'UPLOADS_NOT_ENABLED'
  | 'FILE_TYPE_NOT_ACCEPTED'
  | 'FILE_TOO_LARGE'
  | 'MAX_FILES_REACHED'
  | 'RESERVATION_EXPIRED'
  | 'CHECKOUT_NOT_VERIFIED'
  | 'SERVICE_UNAVAILABLE'
  | 'INTERNAL';

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: Record<string, number | string | null>;
  };
}
