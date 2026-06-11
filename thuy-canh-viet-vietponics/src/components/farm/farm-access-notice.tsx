import { useNavigate } from "react-router-dom";
import { useCustomerSupport } from "@/hooks";

// Màn chặn toàn trang khi một người KHÔNG phải farm partner đã duyệt cố mở khu
// vực Farm Hub (/farm*). Thay cho hành vi cũ "âm thầm redirect về /farm/register"
// (ROLE-01) — nay hiện thông báo rõ ràng theo từng trạng thái:
//   - "none"      → khách thường / chưa đăng ký → mời đăng ký đối tác (ROLE-01).
//   - "requested" → đã đăng ký, đang chờ admin duyệt → màn "Đang chờ duyệt",
//                   KHÔNG đẩy lại form đăng ký (ROLE-02).
//   - "suspended" → farm/đối tác bị tạm dừng → message thống nhất + liên hệ admin
//                   (ROLE-05; khớp message backend FARM_SUSPENDED).
// Render dạng overlay (fixed inset-0) giống AccountDisabledNotice để giữ chrome
// Header/Footer của Layout. Layout quyết định variant từ farmPartnerStatusState.
export type FarmAccessVariant = "none" | "requested" | "suspended";

const CONTENT: Record<
  FarmAccessVariant,
  { icon: string; title: string; body: string }
> = {
  none: {
    icon: "🌱",
    title: "Khu vực dành cho đối tác farm",
    body: "Khu vực Quản lý Farm chỉ dành cho đối tác đã được Vietponics duyệt. Đăng ký để bán sản phẩm của bạn trên Mini App.",
  },
  requested: {
    icon: "⏳",
    title: "Đang chờ duyệt",
    body: "Yêu cầu đối tác của bạn đang được Vietponics xem xét (1–3 ngày). Chúng tôi sẽ thông báo khi tài khoản được duyệt.",
  },
  suspended: {
    icon: "🚫",
    title: "Farm tạm dừng",
    body: "Farm của bạn đang tạm dừng, vui lòng liên hệ admin.",
  },
};

export default function FarmAccessNotice({
  variant,
}: {
  variant: FarmAccessVariant;
}) {
  const navigate = useNavigate();
  const contactSupport = useCustomerSupport();
  const { icon, title, body } = CONTENT[variant];

  return (
    <div className="fixed inset-0 z-[60] bg-white flex flex-col items-center justify-center px-8 text-center">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <span className="text-3xl" aria-hidden>
          {icon}
        </span>
      </div>
      <h2 className="text-base font-semibold text-gray-900 mb-1.5">{title}</h2>
      <p className="text-sm text-gray-500 mb-6 leading-relaxed max-w-xs">
        {body}
      </p>

      {/* Nút chính theo từng trạng thái. */}
      {variant === "none" && (
        <button
          onClick={() => navigate("/farm/register")}
          className="w-full max-w-xs bg-primary text-white rounded-lg py-3 text-sm font-medium mb-2.5"
        >
          Đăng ký đối tác
        </button>
      )}
      {variant === "suspended" && (
        <button
          onClick={contactSupport}
          className="w-full max-w-xs bg-primary text-white rounded-lg py-3 text-sm font-medium mb-2.5"
        >
          Liên hệ admin
        </button>
      )}

      <button
        onClick={() => navigate("/")}
        className="w-full max-w-xs border border-gray-300 text-gray-700 rounded-lg py-3 text-sm font-medium"
      >
        Về trang mua hàng
      </button>
    </div>
  );
}
