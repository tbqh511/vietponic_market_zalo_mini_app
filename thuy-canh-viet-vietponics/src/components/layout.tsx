import { Outlet, useLocation } from "react-router-dom";
import Header from "./header";
import Footer from "./footer";
import { Suspense, useEffect } from "react";
import { PageSkeleton } from "./skeleton";
import { Toaster } from "react-hot-toast";
import { ScrollRestoration } from "./scroll-restoration";
import FloatingCartPreview from "./floating-cart-preview";
import StockInFab from "./farm/stock-in-fab";
import FarmHubFab from "./farm/farm-hub-fab";
import BackToShopFab from "./farm/back-to-shop-fab";
import AccountDisabledNotice from "./account-disabled-notice";
import FarmAccessNotice, {
  FarmAccessVariant,
} from "./farm/farm-access-notice";
import { useAccountDisabledGate, useCartSync, useInitAuth, useRouteHandle } from "@/hooks";
import { useAtom, useAtomValue } from "jotai";
import {
  appSpaceState,
  customerProfileState,
  farmPartnerStatusState,
  isFarmPartnerState,
} from "@/state";

export default function Layout() {
  useInitAuth();
  useCartSync();
  const accountDisabled = useAccountDisabledGate();

  const [handle] = useRouteHandle();
  const location = useLocation();
  const [space, setSpace] = useAtom(appSpaceState);
  const profile = useAtomValue(customerProfileState);
  const isFarmPartner = useAtomValue(isFarmPartnerState);
  const farmPartnerStatus = useAtomValue(farmPartnerStatusState);

  // Đồng bộ space theo route — để deep link (vd Zalo OA notification mở
  // /farm/orders) tự bật farm space, và rời farm thì về customer.
  useEffect(() => {
    const onFarmRoute = location.pathname.startsWith("/farm");
    if (handle?.space === "farm" && space !== "farm") {
      setSpace("farm");
    } else if (space === "farm" && !onFarmRoute) {
      // Chỉ tự chuyển về customer khi pathname rõ ràng KHÔNG thuộc /farm
      // (tránh nhấp nháy khi đang chuyển tab nội bộ trong farm).
      setSpace("customer");
    }
  }, [handle, location.pathname, space, setSpace]);

  // Route guard (ROLE-01/02/05): khách KHÔNG phải farm partner đã duyệt mở /farm*
  // → hiện màn thông báo "bị chặn" thay vì âm thầm redirect về /farm/register
  // (hành vi cũ gây bối rối, nhất là cho người đã đăng ký đang chờ duyệt).
  //   - /farm/register vẫn vào được (isRegister short-circuit) để nút "Đăng ký
  //     đối tác" trên màn thông báo hoạt động; register.tsx tự bounce partner
  //     đã duyệt về /farm nên không loop.
  //   - Chỉ chặn khi profile đã load (!== null) để tránh nháy màn lúc auth chưa
  //     xong (cold start hiện skeleton, không hiện màn chặn).
  // Variant chọn theo farm_partner_status: 'suspended' → màn tạm dừng;
  // 'requested' → "đang chờ duyệt"; còn lại (none/null/customer) → mời đăng ký.
  const onFarmRoute = location.pathname.startsWith("/farm");
  const isRegister = location.pathname.startsWith("/farm/register");
  const showFarmNotice =
    onFarmRoute && !isRegister && profile !== null && !isFarmPartner;
  const farmNoticeVariant: FarmAccessVariant =
    farmPartnerStatus === "suspended"
      ? "suspended"
      : farmPartnerStatus === "requested"
        ? "requested"
        : "none";

  return (
    <div className="w-screen h-screen flex flex-col bg-section text-foreground">
      <Header />
      {/* Banner (customer space) / màn chặn toàn trang (farm space) khi tài khoản
          bị vô hiệu hoá. Component tự chọn dạng theo route. */}
      {accountDisabled && <AccountDisabledNotice />}
      {/* Màn chặn farm (ROLE-01/02/05) — overlay khi non-partner mở /farm*.
          Đặt sau AccountDisabledNotice: nếu tài khoản bị vô hiệu hoá thì màn đó
          ưu tiên (cùng z-[60], render sau sẽ đè — nhưng accountDisabled hiếm khi
          trùng non-partner). */}
      {showFarmNotice && <FarmAccessNotice variant={farmNoticeVariant} />}
      <div className="flex-1 overflow-y-auto bg-background">
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </div>
      <Footer />
      <Toaster
        containerClassName="toast-container"
        containerStyle={{
          top: "calc(50% - 24px)",
        }}
      />
      <Suspense fallback={null}>
        <FloatingCartPreview />
      </Suspense>
      {/* FAB Farm Hub — lối tắt 1 chạm vào Farm space, chỉ hiện cho farm
          partner ở Customer space. Tự ẩn ở các trang noFooter/noFloatingCart. */}
      <Suspense fallback={null}>
        <FarmHubFab />
      </Suspense>
      {/* FAB Khai báo nhập kho — chỉ ở 4 tab Farm chính (farmTab), không ở
          stock-in/detail/register. Đặt trong Layout để fixed ổn định trên WebView. */}
      {handle?.space === "farm" && handle?.farmTab && <StockInFab />}
      {/* FAB "Mua hàng" — quay lại không gian mua hàng, góc phải phía trên.
          Chỉ ở tab gốc Farm (farmTab), thay cho nút cũ trên header. */}
      {handle?.space === "farm" && handle?.farmTab && <BackToShopFab />}
      <ScrollRestoration />
    </div>
  );
}
