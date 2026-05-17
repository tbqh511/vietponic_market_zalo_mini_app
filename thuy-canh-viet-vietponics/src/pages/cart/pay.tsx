import { useCheckout } from "@/hooks";
import { useShippingFee } from "@/hooks/useShippingFee";
import { useAtomValue } from "jotai";
import { cartTotalState } from "@/state";
import { formatPrice } from "@/utils/format";
import { Button } from "zmp-ui";
import { useState } from "react";

export default function Pay() {
  const { totalAmount } = useAtomValue(cartTotalState);
  const checkout = useCheckout();
  const { disableCheckout, error } = useShippingFee();
  const [paying, setPaying] = useState(false);

  return (
    <div className="flex-none py-3 px-4 bg-section space-y-2">
      {error && (
        <div className="text-xs text-red-600 px-1">{error}</div>
      )}
      <div className="flex items-center space-x-2">
        <div className="space-y-1 flex-1">
          <div className="text-xs text-subtitle">Tổng thanh toán</div>
          <div className="text-sm font-medium text-primary">
            {formatPrice(totalAmount)}
          </div>
        </div>
        <Button
          onClick={async () => {
            setPaying(true);
            await checkout();
            setPaying(false);
          }}
          disabled={paying || disableCheckout}
        >
          Thanh toán
        </Button>
      </div>
    </div>
  );
}
