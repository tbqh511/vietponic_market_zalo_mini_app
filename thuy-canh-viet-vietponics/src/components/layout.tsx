import { Outlet, useLocation, useNavigate } from "react-router-dom";
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
import { useAccountDisabledGate, useInitAuth, useRouteHandle } from "@/hooks";
import { useAtom, useAtomValue } from "jotai";
import {
  appSpaceState,
  customerProfileState,
  isFarmPartnerState,
} from "@/state";

export default function Layout() {
  useInitAuth();
  const accountDisabled = useAccountDisabledGate();

  const [handle] = useRouteHandle();
  const location = useLocation();
  const navigate = useNavigate();
  const [space, setSpace] = useAtom(appSpaceState);
  const profile = useAtomValue(customerProfileState);
  const isFarmPartner = useAtomValue(isFarmPartnerState);

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

  // Route guard: vào /farm* mà chưa phải farm partner → đẩy về /farm/register.
  // /farm/register cho phép customer thường vào (để đăng ký). Chỉ redirect khi
  // profile đã load (!== null) để tránh đá nhầm trong lúc auth chưa xong.
  useEffect(() => {
    const onFarmRoute = location.pathname.startsWith("/farm");
    const isRegister = location.pathname.startsWith("/farm/register");
    if (onFarmRoute && !isRegister && profile !== null && !isFarmPartner) {
      navigate("/farm/register", { replace: true });
    }
  }, [location.pathname, profile, isFarmPartner, navigate]);

  return (
    <div className="w-screen h-screen flex flex-col bg-section text-foreground">
      <Header />
      {/* Banner (customer space) / màn chặn toàn trang (farm space) khi tài khoản
          bị vô hiệu hoá. Component tự chọn dạng theo route. */}
      {accountDisabled && <AccountDisabledNotice />}
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
