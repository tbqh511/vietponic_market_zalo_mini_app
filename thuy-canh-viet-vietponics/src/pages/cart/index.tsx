import CartList from "./cart-list";
import ApplyVoucher from "./apply-voucher";
import CartSummary from "./cart-summary";
import { useAtomValue, useSetAtom } from "jotai";
import { useEffect } from "react";
import { cartState, allProductsState } from "@/state";
import { EmptyCart } from "@/components/empty";
import Delivery from "./delivery";
import HorizontalDivider from "@/components/horizontal-divider";
import Pay from "./pay";
import ProfileGate from "@/components/profile-gate";

export default function CartPage() {
  const cart = useAtomValue(cartState);
  // Mở lại Giỏ hàng → làm mới stock để badge "Hết hàng" / payableCart phản ánh
  // tồn thật ngay (sau đặt đơn trước, thay đổi từ Farm Hub, hoặc khách khác).
  const refreshAllProducts = useSetAtom(allProductsState);
  useEffect(() => {
    refreshAllProducts();
  }, [refreshAllProducts]);

  if (!cart.length) {
    return <EmptyCart />;
  }
  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
        <Delivery />
        <CartList />
        <ApplyVoucher />
        <CartSummary />
      </div>
      <HorizontalDivider />
      <Pay />
      <ProfileGate />
    </div>
  );
}
