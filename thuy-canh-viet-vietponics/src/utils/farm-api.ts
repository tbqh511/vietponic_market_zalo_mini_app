import { useCallback, useEffect, useRef, useState } from "react";
import { request } from "./request";
import {
  FarmProfile,
  FarmOverview,
  FarmDashboardRange,
  FarmProductsTodayResponse,
  FarmIncomingOrder,
  FarmPayout,
  FarmPayoutDetail,
  FarmAnalyticsResponse,
} from "@/types";

// Polling mặc định 30s cho mọi hook real-time (overview/productsToday/incoming).
// Theo spec: dashboard "real-time bằng polling 30 giây qua SWR" — ta tự cài
// vì project không dùng SWR. profile/payouts ít đổi → không poll.
const POLL_INTERVAL_MS = 30_000;

// Wrapper fetch chung cho mọi endpoint /farm/*: tự đính JWT từ localStorage,
// unwrap response shape { error, data } → trả data. Không re-auth ở đây — nếu
// 401 thì throw để hook hiển thị state error; useEnsureJwt() đã chạy khi vào page.
async function farmRequest<T>(path: string): Promise<T> {
  const token = localStorage.getItem("jwt_token");
  if (!token) {
    throw new Error("Chưa đăng nhập");
  }
  const res = await request<{ error: boolean; data: T; message?: string }>(path, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.error) {
    throw new Error(res.message || "Lỗi không xác định");
  }
  return res.data;
}

// State chung cho hook polling — generic để dùng lại.
interface PollState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// Hook nội bộ: fetch + poll. enabled=false → không fetch (vd: chưa có JWT).
function usePolling<T>(
  path: string,
  enabled: boolean = true,
  pollMs: number = POLL_INTERVAL_MS
) {
  const [state, setState] = useState<PollState<T>>({
    data: null,
    loading: enabled,
    error: null,
  });
  // Cờ "đã có data lần đầu" — sau lần đầu refetch không show loading toàn trang.
  const hasLoadedOnce = useRef(false);

  const fetchData = useCallback(
    async (signal?: AbortSignal) => {
      if (!enabled) return;
      if (!hasLoadedOnce.current) {
        setState((s) => ({ ...s, loading: true, error: null }));
      }
      try {
        const data = await farmRequest<T>(path);
        if (signal?.aborted) return;
        hasLoadedOnce.current = true;
        setState({ data, loading: false, error: null });
      } catch (err: any) {
        if (signal?.aborted) return;
        setState((s) => ({
          ...s,
          loading: false,
          error: err?.message || "Không thể tải dữ liệu",
        }));
      }
    },
    [path, enabled]
  );

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    fetchData(controller.signal);
    // pollMs <= 0 → fetch once, không poll (cho data tĩnh).
    if (pollMs <= 0) {
      return () => controller.abort();
    }
    // Poll: chỉ chạy khi tab visible — Zalo Mini App giữ webview chạy ngầm
    // khi user thoát ra; không cần update khi không nhìn.
    const intervalId = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      fetchData(controller.signal);
    }, pollMs);
    return () => {
      controller.abort();
      clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, enabled, pollMs]);

  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return { ...state, refresh };
}

// ─── Public hooks ────────────────────────────────────────────────────────────

/**
 * GET /farm/me — thông tin farm hiện tại (header + payment cycle).
 * Fetch 1 lần, không poll (data tĩnh; caller chủ động refresh nếu cần).
 */
export function useFarmProfile(enabled: boolean = true) {
  return usePolling<FarmProfile>("/farm/me", enabled, /* no poll */ 0);
}

/**
 * GET /farm/dashboard?range=today|7d|30d — overview metrics.
 */
export function useFarmOverview(range: FarmDashboardRange = "today", enabled: boolean = true) {
  return usePolling<FarmOverview>(`/farm/dashboard?range=${range}`, enabled);
}

/**
 * GET /farm/products/today — per-product breakdown + AI hint.
 * Dùng cho list "Sản phẩm hôm nay" trên dashboard.
 */
export function useFarmProductsToday(enabled: boolean = true) {
  return usePolling<FarmProductsTodayResponse>("/farm/products/today", enabled);
}

// Khoảng thời gian cho trang Analytics. 90 ngày không có range cố định ở
// backend (chỉ today|7d|30d|custom) → map sang custom + from/to.
export type FarmAnalyticsPeriod = "7d" | "30d" | "90d";

// Số ngày tương ứng mỗi period — dùng cho cả tính from/to lẫn so sánh kỳ trước.
export const ANALYTICS_PERIOD_DAYS: Record<FarmAnalyticsPeriod, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

// YYYY-MM-DD theo giờ VN (UTC+7) — backend resolve custom range ở tz này.
function vnDateString(offsetDays: number): string {
  const now = new Date();
  const vn = new Date(now.getTime() + 7 * 3600_000);
  vn.setUTCDate(vn.getUTCDate() + offsetDays);
  return vn.toISOString().slice(0, 10);
}

// Dựng query string cho GET /farm/analytics theo period. Bucket = day cho
// 7/30 ngày (sparkline mượt), week cho 90 ngày (tránh 90 điểm li ti).
// offsetWeeks: 0 = kỳ hiện tại, -1 = lùi một kỳ (để so sánh "vs kỳ trước").
function analyticsQuery(period: FarmAnalyticsPeriod, periodBack = 0): string {
  const days = ANALYTICS_PERIOD_DAYS[period];
  const bucket = period === "90d" ? "week" : "day";
  // to = hôm nay - periodBack kỳ; from = to - (days-1).
  const toOffset = -periodBack * days;
  const fromOffset = toOffset - (days - 1);
  const from = vnDateString(fromOffset);
  const to = vnDateString(toOffset);
  return `range=custom&bucket=${bucket}&from=${from}&to=${to}&limit=10`;
}

/**
 * GET /farm/analytics — overview + revenue series + top products cho 1 kỳ.
 * periodBack=1 lấy kỳ liền trước (dùng để tính delta "vs kỳ trước").
 */
export function useFarmAnalytics(
  period: FarmAnalyticsPeriod,
  enabled: boolean = true,
  periodBack: number = 0
) {
  const path = `/farm/analytics?${analyticsQuery(period, periodBack)}`;
  // Analytics tổng hợp theo ngày → không cần poll 30s; refresh thủ công.
  return usePolling<FarmAnalyticsResponse>(path, enabled, 0);
}

/**
 * GET /farm/orders/incoming — đơn đang chờ giao.
 */
export function useFarmIncomingOrders(enabled: boolean = true) {
  return usePolling<FarmIncomingOrder[]>("/farm/orders/incoming", enabled);
}

// Payouts poll chậm 60s — đợt draft "đang tích lũy" cập nhật theo cron daily,
// nhưng vẫn poll để farm thấy số mới mà không cần thoát/vào lại trang.
const PAYOUT_POLL_MS = 60_000;

/**
 * GET /farm/payouts?limit=20 — danh sách đợt thanh toán (mọi status).
 */
export function useFarmPayouts(enabled: boolean = true) {
  return usePolling<FarmPayout[]>("/farm/payouts?limit=20", enabled, PAYOUT_POLL_MS);
}

/**
 * GET /farm/payouts/{id} — chi tiết một đợt + danh sách đơn đóng góp.
 * Poll 60s để đợt draft phản ánh đơn mới (đang tích lũy).
 */
export function useFarmPayoutDetail(id: number | null, enabled: boolean = true) {
  return usePolling<FarmPayoutDetail>(
    `/farm/payouts/${id}`,
    enabled && id != null,
    PAYOUT_POLL_MS
  );
}

/**
 * POST /farm/request-partnership — customer xin trở thành farm partner.
 * Không dùng hook — trả promise để page register.tsx gọi trực tiếp.
 */
export async function requestFarmPartnership(payload: {
  name: string;
  address: string;
  description?: string;
}): Promise<{ error: boolean; message: string }> {
  const token = localStorage.getItem("jwt_token");
  if (!token) throw new Error("Chưa đăng nhập");
  return request("/farm/request-partnership", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}
