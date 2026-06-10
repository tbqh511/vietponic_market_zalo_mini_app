import { useLocation, useNavigate } from "react-router-dom";
import { useCustomerSupport } from "@/hooks";

// Hiển thị khi tài khoản khách bị admin vô hiệu hoá (cờ toàn cục bật qua
// notifyAccountDisabled). Hai dạng tuỳ khu vực:
//   - Farm (/farm*): màn chặn toàn trang — mọi tính năng farm đều cần JWT nên
//     không còn gì dùng được; chặn cứng + lối thoát "Về trang mua hàng".
//   - Customer: dải banner đỏ dính đầu trang, KHÔNG chặn cứng vì khách vẫn xem
//     được sản phẩm/danh mục (endpoint public). Nút hành động cần JWT khi bấm sẽ
//     tự báo lại qua cùng cờ này.
// Cả hai đều có nút "Liên hệ admin" mở chat Zalo OA.
const MESSAGE = "Tài khoản đã bị vô hiệu hoá, vui lòng liên hệ admin";

export default function AccountDisabledNotice() {
  const location = useLocation();
  const navigate = useNavigate();
  const contactSupport = useCustomerSupport();
  const inFarm = location.pathname.startsWith("/farm");

  if (inFarm) {
    return (
      <div className="fixed inset-0 z-[60] bg-white flex flex-col items-center justify-center px-8 text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <span className="text-3xl" aria-hidden>🚫</span>
        </div>
        <h2 className="text-base font-semibold text-gray-900 mb-1.5">
          Tài khoản đã bị vô hiệu hoá
        </h2>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed max-w-xs">
          {MESSAGE}
        </p>
        <button
          onClick={contactSupport}
          className="w-full max-w-xs bg-primary text-white rounded-lg py-3 text-sm font-medium mb-2.5"
        >
          Liên hệ admin
        </button>
        <button
          onClick={() => navigate("/")}
          className="w-full max-w-xs border border-gray-300 text-gray-700 rounded-lg py-3 text-sm font-medium"
        >
          Về trang mua hàng
        </button>
      </div>
    );
  }

  return (
    <div className="bg-red-50 border-b border-red-200 px-4 py-2.5 flex items-center gap-3">
      <span className="text-red-500 text-base leading-none" aria-hidden>⚠️</span>
      <p className="flex-1 text-[12px] text-red-700 leading-snug">{MESSAGE}</p>
      <button
        onClick={contactSupport}
        className="shrink-0 text-[12px] font-medium text-white bg-red-500 rounded px-2.5 py-1"
      >
        Liên hệ admin
      </button>
    </div>
  );
}
