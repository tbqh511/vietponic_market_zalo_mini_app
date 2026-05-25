import { useAtomValue, useSetAtom } from "jotai";
import { useNavigate } from "react-router-dom";
import { appSpaceState, lastCustomerPathState } from "@/state";
import { ShopIcon } from "../vectors";

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
      type="button"
      onClick={handleBackToCustomer}
      aria-label="Quay lại mua hàng"
      className="fixed left-4 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primaryForeground shadow-lg active:scale-95 transition-transform"
      style={{ bottom: "calc(var(--safe-bottom) + 64px)" }}
    >
      <ShopIcon className="h-5 w-5" />
    </button>
  );
}
