// Report calculations. Pure functions: they take sales that are already loaded and add
// them up. No database and no React here, so the numbers are easy to check on their own.

import type { SaleDetail } from "@/lib/sales/history";

export type DayRow = { date: string; transactions: number; units: number; revenue: number };
export type ProductRow = { productId: string; productName: string; units: number; revenue: number; share: number };
export type PaymentRow = { method: string; transactions: number; revenue: number; share: number };

export type SalesReport = {
  revenue: number;
  transactions: number;
  units: number;
  averageTicket: number;
  byDay: DayRow[];
  byProduct: ProductRow[];
  byPayment: PaymentRow[];
};

/** A date as YYYY-MM-DD in the viewer's own time zone, so a sale at 11pm counts for that day. */
export function localDateKey(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Midnight at the start of a YYYY-MM-DD day, in the viewer's time zone. */
export function startOfLocalDay(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(dateKey: string, days: number) {
  const date = startOfLocalDay(dateKey);
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}

/** Every day from `from` to `to` inclusive, so days with no sales still get a row. */
function daysBetween(from: string, to: string) {
  const days: string[] = [];
  for (let day = from; day <= to && days.length < 366; day = addDays(day, 1)) days.push(day);
  return days;
}

export function buildSalesReport(sales: SaleDetail[], from: string, to: string): SalesReport {
  const dayRows = new Map<string, DayRow>(daysBetween(from, to).map((date) => [date, { date, transactions: 0, units: 0, revenue: 0 }]));
  const productRows = new Map<string, ProductRow>();
  const paymentRows = new Map<string, PaymentRow>();
  let revenue = 0;
  let units = 0;

  for (const sale of sales) {
    const saleUnits = sale.items.reduce((sum, item) => sum + item.quantity, 0);
    revenue += sale.total;
    units += saleUnits;

    const dateKey = localDateKey(sale.createdAt);
    const day = dayRows.get(dateKey) ?? { date: dateKey, transactions: 0, units: 0, revenue: 0 };
    day.transactions += 1;
    day.units += saleUnits;
    day.revenue += sale.total;
    dayRows.set(dateKey, day);

    const payment = paymentRows.get(sale.paymentMethod) ?? { method: sale.paymentMethod, transactions: 0, revenue: 0, share: 0 };
    payment.transactions += 1;
    payment.revenue += sale.total;
    paymentRows.set(sale.paymentMethod, payment);

    for (const item of sale.items) {
      const product = productRows.get(item.productId) ?? { productId: item.productId, productName: item.productName, units: 0, revenue: 0, share: 0 };
      product.units += item.quantity;
      product.revenue += item.quantity * item.unitPrice;
      productRows.set(item.productId, product);
    }
  }

  const share = (amount: number) => (revenue > 0 ? (amount / revenue) * 100 : 0);

  return {
    revenue,
    transactions: sales.length,
    units,
    averageTicket: sales.length > 0 ? revenue / sales.length : 0,
    byDay: Array.from(dayRows.values()).sort((left, right) => left.date.localeCompare(right.date)),
    byProduct: Array.from(productRows.values()).map((row) => ({ ...row, share: share(row.revenue) })).sort((left, right) => right.revenue - left.revenue),
    byPayment: Array.from(paymentRows.values()).map((row) => ({ ...row, share: share(row.revenue) })).sort((left, right) => right.revenue - left.revenue),
  };
}
