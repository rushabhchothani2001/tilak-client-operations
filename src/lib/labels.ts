import type { BoxPly, OrderStatus, PaperType, PrintType, SizeUnit } from '../types';

export const STATUS_LABELS: Record<OrderStatus, string> = {
  order_placed: 'Order placed',
  paper_cutting_in_process: 'Paper cutting in process',
  paper_import_from_outside: 'Paper import from outside',
  liner_in_process: 'Liner in process',
  liner_process_completed: 'Liner process completed',
  packaging_in_process: 'Packaging in process',
  ready_to_shipment: 'Ready for shipment',
};

export const PLY_LABELS: Record<BoxPly, string> = {
  '3-ply': '3 ply',
  '5-ply': '5 ply',
};

export const PAPER_LABELS: Record<PaperType, string> = {
  printed: 'Printed',
  plain: 'Plain',
};

export const PRINT_LABELS: Record<PrintType, string> = {
  '4-color': '4 colour',
  'single-color': 'Single colour',
};

export const UNIT_LABELS: Record<SizeUnit, string> = {
  inch: 'inch',
  mm: 'mm',
  cm: 'cm',
};

export const toOptions = <T extends string>(labels: Record<T, string>) =>
  (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));
