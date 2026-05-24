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

  // Nếu giỏ hàng nổi đang hiện (có hàng) → đẩy FAB lên cao hơn để không đè.
  // FloatingCartPreview ở bottom-16; FAB đặt cao hơn để 2 nút không chồng.
  const cartVisible = totalItems > 0;
  const bottomClass = cartVisible ? "bottom-[7.5rem]" : "bottom-16";

  const handleTap = () => {
    setLastCustomerPath(location.pathname); // nhớ chỗ đang đứng để quay lại
    setSpace("farm");
    navigate("/farm", { viewTransition: true });
  };

  return (
    <button
      onClick={handleTap}
      aria-label="Vào Farm Hub"
      className={`fixed right-4 ${bottomClass} mb-sb z-30 flex items-center gap-1.5 bg-primary text-primaryForeground pl-3 pr-4 py-2.5 rounded-full shadow-lg active:scale-95 transition-transform`}
    >
      <PlantIcon className="w-5 h-5" />
      <span className="text-xs font-medium whitespace-nowrap">Farm Hub</span>
    </button>
  );
}
