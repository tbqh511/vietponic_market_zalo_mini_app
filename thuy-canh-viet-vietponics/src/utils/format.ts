export function formatPrice(price: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    currencyDisplay: "code",
  }).format(price);
}

export function formatDistant(value: number) {
  return `${new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value)} km`;
}

import type { ProductUnit, SystemUnit } from "@/types";

function formatSystemTotal(total: number, system: SystemUnit): string {
  if (system === "piece") return `${total} cái`;
  // g → kg / ml → l when large enough
  if (system === "g" && total >= 1000) {
    return `${(total / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 2 })}kg`;
  }
  if (system === "ml" && total >= 1000) {
    return `${(total / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 2 })}l`;
  }
  return `${total.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}${system}`;
}

// Render "3 bó (300g)" when unit info is available; fall back to "x3" otherwise.
export function formatQuantityWithUnit(quantity: number, unit?: ProductUnit): string {
  if (!unit) return `x${quantity}`;
  const head = unit.unitLabel ? `${quantity} ${unit.unitLabel}` : `x${quantity}`;
  if (unit.systemUnit === "piece" && (!unit.conversionFactor || unit.conversionFactor === 1)) {
    return head;
  }
  const total = quantity * (unit.conversionFactor || 1);
  return `${head} (${formatSystemTotal(total, unit.systemUnit)})`;
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
}
