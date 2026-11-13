import type { BoxPly, OrderStatus, PaperType, PrintType, SizeUnit } from '../types';

export const STATUS_LABELS: Record<OrderStatus, string> = {
  order_placed: 'Order Placed',
  paper_cutting_in_process: 'Paper Cutting In Process',
  paper_import_from_outside: 'Paper Import From Outside',
  liner_in_process: 'Liner In Process',
  liner_process_completed: 'Liner Process Completed',
  packaging_in_process: 'Packaging In Process',
  ready_to_shipment: 'Ready for Shipment',
};

export const PLY_LABELS: Record<BoxPly, string> = {
  '3-ply': '3 Ply',
  '5-ply': '5 Ply',
};

export const PAPER_LABELS: Record<PaperType, string> = {
  printed: 'Printed',
  plain: 'Plain',
};

export const PRINT_LABELS: Record<PrintType, string> = {
  '4-color': '4 Color',
  'single-color': 'Single Color',
};

export const UNIT_LABELS: Record<SizeUnit, string> = {
  inch: 'inch',
  mm: 'mm',
  cm: 'cm',
};

export const toOptions = <T extends string>(labels: Record<T, string>) =>
  (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));
