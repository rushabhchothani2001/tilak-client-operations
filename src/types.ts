export const BOX_PLY = ['3-ply', '5-ply'] as const;
export type BoxPly = (typeof BOX_PLY)[number];

export const PAPER_TYPES = ['printed', 'plain'] as const;
export type PaperType = (typeof PAPER_TYPES)[number];

export const PRINT_TYPES = ['4-color', 'single-color'] as const;
export type PrintType = (typeof PRINT_TYPES)[number];

export const SIZE_UNITS = ['inch', 'mm', 'cm'] as const;
export type SizeUnit = (typeof SIZE_UNITS)[number];

/** Statuses a worker can choose in the manufacturing module, in process order. */
export const WORKER_STATUSES = [
  'paper_cutting_in_process',
  'paper_import_from_outside',
  'liner_in_process',
  'liner_process_completed',
  'packaging_in_process',
  'ready_to_shipment',
] as const;
export type WorkerStatus = (typeof WORKER_STATUSES)[number];

export const ORDER_STATUSES = ['order_placed', ...WORKER_STATUSES] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const FINAL_STATUS = 'ready_to_shipment' satisfies OrderStatus;

export interface CustomerInput {
  name: string;
  companyName: string;
  phone: string;
  helplinePhone: string;
  gstNumber: string;
  address: string;
}

export interface Customer extends CustomerInput {
  _id: string;
  createdAt: string;
  updatedAt: string;
}

export type CustomerSummary = Pick<Customer, '_id' | 'name' | 'companyName' | 'phone'>;

export interface BoxSize {
  length: number;
  width: number;
  height: number;
  unit: SizeUnit;
}

export interface LaminationSize {
  length: number;
  width: number;
  unit?: SizeUnit;
}

export interface OrderSpec {
  /** Empty on orders placed before the field existed. */
  productName: string;
  size: BoxSize;
  ply: BoxPly;
  paperType: PaperType;
  printType?: PrintType | null;
  /** fluted holds one value per flute layer, e.g. [120, 150] shown as "120/150". */
  insidePaper: { top: number; fluted: number[] };
  laminated: boolean;
  /** Lamination sheet size, only when laminated. The server sets the unit from the box size. */
  laminationSize?: LaminationSize | null;
  quantity: number;
  expectedDeliveryDate: string;
}

export interface OrderInput extends OrderSpec {
  customer: string;
  /** Rupees per box. */
  ratePerBox: number;
  gstApplicable: boolean;
}

/** Commercial details of an order, in rupees. Admin only; computed by the server. */
export interface OrderPricing {
  ratePerBox: number;
  gstApplicable: boolean;
  /** GST percentage used for this order (0 when not applicable). */
  gstRate: number;
  subtotal: number;
  gstAmount: number;
  total: number;
}

export interface StatusHistoryEntry {
  status: OrderStatus;
  producedQuantity?: number | null;
  changedBy?: string;
  changedAt: string;
}

/** What workers see: the order without any customer information. */
export interface ManufacturingOrder extends OrderSpec {
  _id: string;
  orderNumber: string;
  status: OrderStatus;
  producedQuantity: number | null;
  statusHistory: StatusHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

/** What the admin sees: the order with its customer. */
export interface Order<C = CustomerSummary> extends ManufacturingOrder {
  customer: C | null;
  /** Missing on orders placed before pricing existed. */
  pricing?: OrderPricing | null;
}

export interface StatusUpdateInput {
  status: WorkerStatus;
  producedQuantity?: number | null;
}

export const USER_ROLES = ['admin', 'worker'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export type Language = 'en' | 'hi' | 'gu';

export interface User {
  _id: string;
  name: string;
  username: string;
  role: UserRole;
  /** Saved app language; null until chosen. */
  language: Language | null;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface CreateUserInput {
  name: string;
  username: string;
  password: string;
  role: UserRole;
  language?: Language;
}

export interface UpdateUserInput {
  name?: string;
  role?: UserRole;
  language?: Language;
  active?: boolean;
  password?: string;
}
