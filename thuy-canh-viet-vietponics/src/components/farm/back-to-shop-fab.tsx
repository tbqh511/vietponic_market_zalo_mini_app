import { useAtomValue, useSetAtom } from "jotai";
import { useNavigate } from "react-router-dom";
import { Icon } from "zmp-ui";
import { appSpaceState, lastCustomerPathState } from "@/state";

/**
 * Nút nổi "Mua hàng" — quay lại không gian mua hàng từ Farm Hub. Đặt DƯỚI
 * header xanh, trôi vào vùng nội dung (góc phải) để không đè lên cụm nút
 * native Zalo (... / x). Render từ Layout (giống FarmHubFab) chỉ ở tab gốc Farm.
 */
export default function BackToShopFab() {
  const navigate = useNavigate();
  const setSpace = useSetAtom(appSpaceState);
  const lastCustomerPath = useAtomValue(lastCustomerPathState);

  // Quay lại không gian mua hàng — về đúng tab customer đã rời đi.
  const handleBackToCustomer = () => {
    setSpace("customer");
    navigate(lastCustomerPath || "/profile", { viewTransition: true });
  };

  return (
    <button
      onClick={handleBackToCustomer}
      aria-label="Quay lại mua hàng"
      className="fixed right-4 top-[calc(env(safe-area-inset-top)+4.75rem)] z-30 flex items-center gap-1.5 bg-primary text-primaryForeground pl-3 pr-4 py-2 rounded-full shadow-lg active:scale-95 transition-transform"
    >
      <Icon icon="zi-arrow-left" size={18} />
      <span className="text-xs font-medium whitespace-nowrap">Mua hàng</span>
    </button>
  );
}
