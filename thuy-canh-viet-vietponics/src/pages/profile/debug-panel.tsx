import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const DEBUG_KEY = "DEBUG_API";
const TAP_THRESHOLD = 5;
const TAP_WINDOW_MS = 2000;

function isDebugEnabled() {
  return typeof window !== "undefined" && localStorage.getItem(DEBUG_KEY) === "1";
}

export default function DebugPanel() {
  const [visible, setVisible] = useState(isDebugEnabled);
  const [cleared, setCleared] = useState(false);
  const tapCount = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();

  function handleSecretTap() {
    tapCount.current += 1;
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => {
      tapCount.current = 0;
    }, TAP_WINDOW_MS);

    if (tapCount.current >= TAP_THRESHOLD) {
      tapCount.current = 0;
      if (tapTimer.current) clearTimeout(tapTimer.current);
      const next = !isDebugEnabled();
      if (next) {
        localStorage.setItem(DEBUG_KEY, "1");
      } else {
        localStorage.removeItem(DEBUG_KEY);
      }
      setVisible(next);
    }
  }

  function handleReset() {
    localStorage.clear();
    setCleared(true);
    setTimeout(() => {
      navigate("/", { replace: true });
      window.location.reload();
    }, 800);
  }

  return (
    <div>
      {/* Vùng tap ẩn — 5 lần trong 2s để bật/tắt panel debug */}
      <div
        className="h-8 w-full select-none"
        onClick={handleSecretTap}
        aria-hidden
      />

      {visible && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 space-y-3">
          <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">
            Debug — chỉ dùng khi test
          </p>

          <button
            className="w-full rounded-lg bg-red-500 py-2.5 text-sm font-medium text-white active:bg-red-700 disabled:opacity-50"
            onClick={handleReset}
            disabled={cleared}
          >
            {cleared ? "Đã xóa — đang tải lại…" : "Xóa toàn bộ cache (localStorage) & reload"}
          </button>

          <p className="text-2xs text-red-400">
            Xóa JWT, thông tin giao hàng, profile cache, tất cả dữ liệu offline. App sẽ yêu cầu đăng nhập lại.
          </p>

          <button
            className="w-full rounded-lg border border-red-300 py-2 text-xs text-red-500 active:bg-red-100"
            onClick={() => {
              localStorage.removeItem(DEBUG_KEY);
              setVisible(false);
            }}
          >
            Ẩn panel này
          </button>
        </div>
      )}
    </div>
  );
}
