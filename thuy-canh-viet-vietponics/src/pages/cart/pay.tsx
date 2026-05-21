import { useCheckout } from "@/hooks";
import { useShippingFee } from "@/hooks/useShippingFee";
import { useAtomValue } from "jotai";
import { loadable } from "jotai/utils";
import {
  cartGrandTotalState,
  cartTotalState,
  payableCartState,
} from "@/state";
import { formatPrice } from "@/utils/format";
import { Button } from "zmp-ui";
import { useState } from "react";

const grandTotalLoadable = loadable(cartGrandTotalState);

export default function Pay() {
  const { totalAmount } = useAtomValue(cartTotalState);
  const payableCart = useAtomValue(payableCartState);
  const checkout = useCheckout();
  const { disableCheckout, error } = useShippingFee();
  const grandTotal = useAtomValue(grandTotalLoadable);
  const [paying, setPaying] = useState(false);
  const noPayable = payableCart.length === 0;

  const displayTotal =
    grandTotal.state === "hasData" ? grandTotal.data : totalAmount;

  return (
    <div className="flex-none py-3 px-4 bg-section space-y-2">
      {error && (
        <div className="text-xs text-red-600 px-1">{error}</div>
      )}
      {noPayable && (
        <div className="text-xs text-danger px-1">
          Không có sản phẩm khả dụng để thanh toán
        </div>
      )}
      <div className="flex items-center space-x-2">
        <div className="space-y-1 flex-1">
          <div className="text-xs text-subtitle">Tổng thanh toán</div>
          <div className="text-sm font-medium text-primary">
            {formatPrice(Math.max(0, displayTotal))}
          </div>
        </div>
        <Button
          onClick={async () => {
            setPaying(true);
            await checkout();
            setPaying(false);
          }}
          disabled={paying || disableCheckout || noPayable}
        >
          Thanh toán
        </Button>
      </div>
    </div>
  );
}
