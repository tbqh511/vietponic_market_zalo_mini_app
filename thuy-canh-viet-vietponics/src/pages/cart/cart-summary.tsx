import { useAtomValue } from "jotai";
import {
  cartTotalState,
  deliveryModeState,
  selectedShippingServiceState,
} from "@/state";
import { formatPrice } from "@/utils/format";
import Section from "@/components/section";
import HorizontalDivider from "@/components/horizontal-divider";
import { useShippingFee } from "@/hooks/useShippingFee";

export default function CartSummary() {
  const { totalAmount } = useAtomValue(cartTotalState);
  const deliveryMode = useAtomValue(deliveryModeState);
  const selectedService = useAtomValue(selectedShippingServiceState);
  const { loading: feeLoading } = useShippingFee();

  const isShipping = deliveryMode === "shipping";
  const shippingFee = isShipping ? (selectedService?.total_fee ?? null) : 0;
  const finalTotal =
    shippingFee !== null ? totalAmount + shippingFee : totalAmount;

  return (
    <Section title="Thanh toán" className="rounded-lg">
      <div className="px-4 py-2 space-y-4">
        <table className="table w-full text-sm [&_th]:text-left [&_th]:text-xs [&_th]:text-inactive [&_th]:font-medium [&_td]:text-right">
          <tbody>
            <tr>
              <th>Tạm tính</th>
              <td>{formatPrice(totalAmount)}</td>
            </tr>
            <tr>
              <th>Phí vận chuyển</th>
              <td>
                {!isShipping ? (
                  "—"
                ) : feeLoading ? (
                  <span className="inline-block w-16 h-3 rounded bg-gray-200 animate-pulse" />
                ) : shippingFee !== null ? (
                  formatPrice(shippingFee)
                ) : (
                  <span className="text-inactive text-xs">Chọn địa chỉ giao</span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
        <HorizontalDivider />
        <div className="flex justify-between font-medium text-sm">
          <div>Tổng thanh toán</div>
          <div>
            {feeLoading && isShipping ? (
              <span className="inline-block w-24 h-4 rounded bg-gray-200 animate-pulse" />
            ) : (
              formatPrice(finalTotal)
            )}
          </div>
        </div>
      </div>
    </Section>
  );
}
