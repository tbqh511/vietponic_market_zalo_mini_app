import { useCallback, useEffect, useRef, useState } from "react";
import { request } from "./request";
import {
  FarmProfile,
  FarmOverview,
  FarmDashboardRange,
  FarmProductsTodayResponse,
  FarmIncomingOrder,
  FarmPayout,
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

/**
 * GET /farm/orders/incoming — đơn đang chờ giao.
 */
export function useFarmIncomingOrders(enabled: boolean = true) {
  return usePolling<FarmIncomingOrder[]>("/farm/orders/incoming", enabled);
}

/**
 * GET /farm/payouts?limit=20 — danh sách đợt thanh toán.
 * Không poll (ít đổi — chỉ thay đổi khi cron snapshot daily chạy 23:30).
 */
export function useFarmPayouts(enabled: boolean = true) {
  return usePolling<FarmPayout[]>("/farm/payouts?limit=20", enabled, 0);
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
