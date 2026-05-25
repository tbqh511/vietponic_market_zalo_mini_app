import { useAtomValue, useSetAtom } from "jotai";
import { useNavigate, useLocation } from "react-router-dom";
import {
  isFarmPartnerState,
  appSpaceState,
  lastCustomerPathState,
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
      style={{ bottom: "calc(var(--safe-bottom) + 64px)" }}
    >
      <PlantIcon className="w-5 h-5" />
    </button>
  );
}
