import { useAtomValue, useSetAtom } from "jotai";
import { useNavigate, useLocation } from "react-router-dom";
import {
  isFarmPartnerState,
  appSpaceState,
  lastCustomerPathState,
  cartTotalState,
} from "@/state";
import { useRouteHandle } from "@/hooks";
import { PlantIcon } from "../vectors";

/**
 * Nút nổi "Farm Hub" — lối tắt 1 chạm cho farm partner đã duyệt vào thẳng
 * Farm space mà không phải qua tab Cá nhân. Chỉ hiện ở Customer space.
 */
export default function FarmHubFab() {
  const isFarmPartner = useAtomValue(isFarmPartnerState);
  const space = useAtomValue(appSpaceState);
  const setSpace = useSetAtom(appSpaceState);
  const setLastCustomerPath = useSetAtom(lastCustomerPathState);
  const { totalItems } = useAtomValue(cartTotalState);
  const [handle] = useRouteHandle();
  const navigate = useNavigate();
  const location = useLocation();

  // Điều kiện hiện FAB:
  // - là farm partner đã duyệt
  // - đang ở Customer space (không hiện khi đã trong Farm Hub)
  // - route không phải trang đặc biệt ẩn nút nổi (noFloatingCart / noFooter)
  const shouldShow =
    isFarmPartner &&
    space === "customer" &&
    !handle?.noFloatingCart &&
    !handle?.noFooter;

  if (!shouldShow) return null;

  // Khi thanh "Đặt mua" đang hiện (giỏ hàng có hàng), nâng FAB lên thêm
  // 56px (chiều cao thanh ~48px + khoảng cách 8px) để không chồng lên nhau.
  const cartBarVisible = totalItems > 0 && !handle?.noFloatingCart;
  const bottomOffset = cartBarVisible
    ? "calc(var(--safe-bottom) + 120px)"
    : "calc(var(--safe-bottom) + 64px)";

  const handleTap = () => {
    setLastCustomerPath(location.pathname); // nhớ chỗ đang đứng để quay lại
    setSpace("farm");
    navigate("/farm", { viewTransition: true });
  };

  return (
    <button
      type="button"
      onClick={handleTap}
      aria-label="Vào Farm Hub"
      className="fixed left-4 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primaryForeground shadow-lg active:scale-95 transition-transform"
      style={{ bottom: bottomOffset }}
    >
      <PlantIcon className="w-5 h-5" />
    </button>
  );
}
