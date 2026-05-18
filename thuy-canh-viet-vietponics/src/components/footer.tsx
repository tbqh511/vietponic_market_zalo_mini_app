import { CartIcon, CategoryIcon, FarmIcon, HomeIcon, PackageIcon } from "./vectors";
import HorizontalDivider from "./horizontal-divider";
import { useAtomValue } from "jotai";
import { cartState, customerProfileState } from "@/state";
import TransitionLink from "./transition-link";
import { useRouteHandle } from "@/hooks";
import Badge from "./badge";

const BASE_NAV_ITEMS = [
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
    icon: (props) => {
      const cart = useAtomValue(cartState);

      return (
        <Badge value={cart.length}>
          <CartIcon {...props} />
        </Badge>
      );
    },
  },
];

const FARM_NAV_ITEM = {
  name: "Farm Hub",
  path: "/farm",
  icon: FarmIcon,
};

export default function Footer() {
  const [handle] = useRouteHandle();
  const profile = useAtomValue(customerProfileState);

  // Farm partner thấy thêm tab Farm Hub — grid chuyển từ 4 sang 5 cột.
  const navItems = profile?.is_farm_partner
    ? [...BASE_NAV_ITEMS, FARM_NAV_ITEM]
    : BASE_NAV_ITEMS;

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
