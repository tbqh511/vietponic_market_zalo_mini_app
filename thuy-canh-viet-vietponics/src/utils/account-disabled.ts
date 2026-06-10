// Bus tối giản để phát tín hiệu "tài khoản bị vô hiệu hoá" từ tầng request lõi
// (request.ts) và các luồng fetch thô (hooks.ts) lên UI (layout banner / màn
// chặn farm). Cố ý KHÔNG import React hay state.ts để tránh vòng phụ thuộc
// (state.ts đã import request.ts). UI subscribe qua useAccountDisabledGate().
//
// Cờ là một chiều: một khi bật thì giữ nguyên tới khi reload app — tài khoản bị
// admin khoá thì mọi call JWT tiếp theo đều hỏng, không có lý do tự tắt cờ.

type Listener = () => void;

const listeners = new Set<Listener>();
let disabled = false;

/**
 * Bật cờ "tài khoản bị vô hiệu hoá" và thông báo cho mọi subscriber 1 lần.
 * Idempotent: gọi nhiều lần (vd farm polling bắn 403 mỗi 30s) chỉ kích hoạt
 * listener đúng lần đầu → tránh spam banner/toast.
 */
export function notifyAccountDisabled(): void {
  if (disabled) return;
  disabled = true;
  listeners.forEach((l) => l());
}

/** Trạng thái hiện tại — dùng cho khởi tạo state và để farm polling tự dừng. */
export function isAccountDisabledFlag(): boolean {
  return disabled;
}

/** Đăng ký nhận thông báo khi cờ bật. Trả về hàm huỷ đăng ký. */
export function subscribeAccountDisabled(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Kiểm tra một Response thô (các luồng dùng fetch trực tiếp, không qua request())
 * có phải lỗi tài khoản bị vô hiệu hoá không. Nếu đúng → bật cờ toàn cục và trả
 * về true để caller dừng luồng. Đọc trên bản clone nên không tiêu thụ body gốc.
 */
export async function detectAccountDisabledResponse(res: Response): Promise<boolean> {
  if (res.status !== 403) return false;
  try {
    const data = await res.clone().json();
    if (data?.code === "ACCOUNT_DISABLED") {
      notifyAccountDisabled();
      return true;
    }
  } catch {
    /* body không phải JSON → bỏ qua */
  }
  return false;
}
