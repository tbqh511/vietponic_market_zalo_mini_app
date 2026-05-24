import { useNavigate } from "react-router-dom";

// FAB "Khai báo nhập" — nút pill nổi góc phải, NGAY TRÊN tab bar Farm.
// Mở trang khai báo nhập kho (/farm/stock-in) dạng full-screen (noFooter).
// Dùng position fixed; bottom = safe-bottom + chiều cao tab bar (~64px) để
// không che tab bar. Đặt trong Layout (không trong page) cho ổn định trên WebView.
export default function StockInFab() {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate("/farm/stock-in", { viewTransition: true })}
      className="fixed right-4 z-40 flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-primary text-primaryForeground shadow-lg active:scale-95"
      style={{ bottom: "calc(var(--safe-bottom) + 64px)" }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 5V19M5 12H19"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
      <span className="text-xs font-medium">Khai báo nhập</span>
    </button>
  );
}
