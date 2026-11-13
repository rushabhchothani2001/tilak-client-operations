import type { OrderPricing } from '../types';

/** Must match GST_RATE_PERCENT on the server, which computes the saved amounts. */
export const GST_RATE_PERCENT = 5;

/** Live preview of the order amount, worked in whole paise (same method as the server). */
export function computePricing(quantity: number, ratePerBox: number, gstApplicable: boolean): OrderPricing {
  const ratePaise = Math.round(ratePerBox * 100);
  const subtotalPaise = quantity * ratePaise;
  const gstRate = gstApplicable ? GST_RATE_PERCENT : 0;
  const gstPaise = Math.round((subtotalPaise * gstRate) / 100);
  return {
    ratePerBox: ratePaise / 100,
    gstApplicable,
    gstRate,
    subtotal: subtotalPaise / 100,
    gstAmount: gstPaise / 100,
    total: (subtotalPaise + gstPaise) / 100,
  };
}
