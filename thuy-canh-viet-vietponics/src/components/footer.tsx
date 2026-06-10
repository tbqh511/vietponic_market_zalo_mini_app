import {
  CartIcon,
  CategoryIcon,
  HomeIcon,
  PackageIcon,
  FarmDashboardIcon,
  FarmOrdersIcon,
  FarmAnalyticsIcon,
  FarmPayoutsIcon,
} from "./vectors";
import HorizontalDivider from "./horizontal-divider";
import { useAtomValue } from "jotai";
import { appSpaceState, cartState, farmPendingOrdersCountState } from "@/state";
import TransitionLink from "./transition-link";
import { useRouteHandle } from "@/hooks";
import { useFarmProfile } from "@/utils/farm-api";
import Badge from "./badge";

// Tab bar Customer — GIỮ NGUYÊN 4 tab gốc, không đổi.
const CUSTOMER_NAV = [
  {
    name: "Trang chủ",
    path: "/",
    icon: HomeIcon,
  },
  {
    name: "Danh mục",
    path: "/categories",
    icon: CategoryIcon,
  },
  {
    name: "Đơn hàng",
    path: "/orders",
    icon: PackageIcon,
  },
  {
    name: "Giỏ hàng",
    path: "/cart",
    icon: (props: { active?: boolean }) => {
      const cart = useAtomValue(cartState);

      return (
        <Badge value={cart.length}>
          <CartIcon {...props} />
        </Badge>
      );
    },
  },
];

// Tab bar Farm — 4 tab bán hàng. Tab "Đơn đến" có badge số đơn pending.
const FARM_NAV = [
  {
    name: "Tổng quan",
    path: "/farm",
    // end: chỉ active khi path đúng "/farm" — tránh sáng cả khi ở /farm/orders...
    end: true,
    icon: FarmDashboardIcon,
  },
  {
    name: "Đơn đến",
    path: "/farm/orders",
    icon: (props: { active?: boolean }) => {
      const count = useAtomValue(farmPendingOrdersCountState);

      return (
        <Badge value={count}>
          <FarmOrdersIcon {...props} />
        </Badge>
      );
    },
  },
  {
    name: "Phân tích",
    path: "/farm/analytics",
    icon: FarmAnalyticsIcon,
  },
  {
    name: "Thu nhập",
    path: "/farm/payouts",
    icon: FarmPayoutsIcon,
  },
];

export default function Footer() {
  const [handle] = useRouteHandle();
  // Tab bar đổi theo không gian app hiện tại (customer mua / farm bán).
  const space = useAtomValue(appSpaceState);
  const isFarm = space === "farm";

  // Tab "Thu nhập" (payout) chỉ dành cho CHỦ farm — staff không thấy. Vai trò
  // đọc qua /farm/me (fetch-once, enabled khi đang ở không gian farm).
  // Fail-closed: ẩn tab cho tới khi xác nhận is_owner — an toàn hơn hiện rồi ẩn.
  const profile = useFarmProfile(isFarm);
  const isOwner = profile.data?.viewer?.is_owner ?? false;
  const farmNav = isOwner
    ? FARM_NAV
    : FARM_NAV.filter((t) => t.path !== "/farm/payouts");

  const navItems = isFarm ? farmNav : CUSTOMER_NAV;

  if (!handle?.noFooter) {
    return (
      <>
        <HorizontalDivider />
        <div
          className="w-full px-4 pt-2 grid pb-sb"
          style={{
            gridTemplateColumns: `repeat(${navItems.length}, 1fr)`,
          }}
        >
          {navItems.map((item) => {
            return (
              <TransitionLink
                to={item.path}
                key={item.path}
                end={(item as { end?: boolean }).end}
                className="flex flex-col items-center space-y-0.5 p-1 pb-0.5 cursor-pointer active:scale-105"
              >
                {({ isActive }) => (
                  <>
                    <div className="w-6 h-6 flex justify-center items-center">
                      <item.icon active={isActive} />
                    </div>
                    <div
                      className={`text-2xs ${isActive ? "text-primary" : ""}`}
                    >
                      {item.name}
                    </div>
                  </>
                )}
              </TransitionLink>
            );
          })}
        </div>
      </>
    );
  }

  return null;
}
