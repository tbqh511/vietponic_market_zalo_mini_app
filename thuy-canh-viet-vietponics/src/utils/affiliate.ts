import { getConfig } from "./template";

const PENDING_REF_KEY = "pending_ref_code";

function apiBase(): string {
  return (getConfig((c) => c.template.apiUrl) ?? "").replace(/\/+$/, "");
}

export function getPendingRefCode(): string | null {
  try {
    return localStorage.getItem(PENDING_REF_KEY);
  } catch {
    return null;
  }
}

export function clearPendingRefCode(): void {
  try {
    localStorage.removeItem(PENDING_REF_KEY);
  } catch {
    // ignore
  }
}

/**
 * Best-effort attempt to attribute the current customer to a pending referral
 * code captured from `?ref=` at app launch. Silently ignores failures — referral
 * attribution should never block app flows.
 */
export async function applyPendingReferral(jwtToken: string): Promise<void> {
  const refCode = getPendingRefCode();
  if (!refCode) return;
  const base = apiBase();
  if (!base) {
    clearPendingRefCode();
    return;
  }
  try {
    const response = await fetch(`${base}/affiliate/apply-referral`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${jwtToken}`,
      },
      body: JSON.stringify({ ref_code: refCode }),
    });
    // Clear on any deterministic outcome: success, conflict (already referred),
    // 404 (invalid code), 422 (self-referral). Only retain on transient/network errors.
    if (response.ok || [404, 409, 422].includes(response.status)) {
      clearPendingRefCode();
    }
  } catch {
    // network error — keep the code for a future retry
  }
}

export interface AffiliateProfile {
  is_registered: boolean;
  affiliate_code: string | null;
  affiliate_status: string | null;
  approved_at: string | null;
  share_url: string | null;
  name: string | null;
  mobile: string | null;
  bank_name: string | null;
  bank_account: string | null;
  bank_holder: string | null;
  commission_rate: number;
  referrals_count: number;
  commission_stats: {
    pending: number;
    confirmed: number;
    paid: number;
    cancelled: number;
  };
  balance: number;
  locked: boolean;
}

export interface AffiliateCommissionRow {
  id: number;
  order_id: number;
  order_total: string | number;
  commission_rate: string | number;
  commission_amount: number;
  status: "pending" | "confirmed" | "paid" | "cancelled";
  created_at: string;
  paid_at: string | null;
}

async function authJson<T>(
  path: string,
  init?: RequestInit
): Promise<T | null> {
  const base = apiBase();
  if (!base) return null;
  const token = localStorage.getItem("jwt_token");
  if (!token) return null;
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    const err = new Error(text || `Request failed (${response.status})`);
    (err as any).status = response.status;
    throw err;
  }
  return (await response.json()) as T;
}

export async function fetchAffiliateProfile(): Promise<AffiliateProfile | null> {
  const res = await authJson<{ data: AffiliateProfile }>("/affiliate/me");
  return res?.data ?? null;
}

export async function registerAffiliate(): Promise<AffiliateProfile | null> {
  const res = await authJson<{ data: AffiliateProfile }>(
    "/affiliate/register",
    { method: "POST", body: JSON.stringify({}) }
  );
  return res?.data ?? null;
}

export async function updateAffiliateBank(payload: {
  bank_name?: string;
  bank_account?: string;
  bank_holder?: string;
}): Promise<AffiliateProfile | null> {
  const res = await authJson<{ data: AffiliateProfile }>("/affiliate/bank", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return res?.data ?? null;
}

export async function fetchAffiliateCommissions(
  page = 1
): Promise<{ items: AffiliateCommissionRow[]; lastPage: number }> {
  const res = await authJson<{
    data: AffiliateCommissionRow[];
    meta: { last_page: number };
  }>(`/affiliate/commissions?page=${page}`);
  if (!res) return { items: [], lastPage: 1 };
  return { items: res.data ?? [], lastPage: res.meta?.last_page ?? 1 };
}

export interface AffiliateReferralRow {
  id: number;
  name: string;
  mobile_masked: string | null;
  joined_at: string;
  orders_count: number;
  orders_total: number;
  commission_total: number;
}

export async function fetchAffiliateReferrals(
  page = 1
): Promise<{
  items: AffiliateReferralRow[];
  lastPage: number;
  total: number;
}> {
  const res = await authJson<{
    data: AffiliateReferralRow[];
    meta: { last_page: number; total: number };
  }>(`/affiliate/referrals?page=${page}`);
  if (!res) return { items: [], lastPage: 1, total: 0 };
  return {
    items: res.data ?? [],
    lastPage: res.meta?.last_page ?? 1,
    total: res.meta?.total ?? 0,
  };
}
