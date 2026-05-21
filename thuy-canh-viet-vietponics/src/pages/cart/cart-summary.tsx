import { useAtomValue } from "jotai";
import {
  appliedVoucherState,
  cartGrandTotalState,
  cartTotalState,
  deliveryModeState,
  selectedShippingServiceState,
} from "@/state";
import { formatPrice } from "@/utils/format";
import Section from "@/components/section";
import HorizontalDivider from "@/components/horizontal-divider";
import { useShippingFee } from "@/hooks/useShippingFee";
import { loadable } from "jotai/utils";

const grandTotalLoadable = loadable(cartGrandTotalState);

export default function CartSummary() {
  const { totalAmount } = useAtomValue(cartTotalState);
  const deliveryMode = useAtomValue(deliveryModeState);
  const selectedService = useAtomValue(selectedShippingServiceState);
  const applied = useAtomValue(appliedVoucherState);
  const { loading: feeLoading } = useShippingFee();
  const grandTotalState = useAtomValue(grandTotalLoadable);

  const isShipping = deliveryMode === "shipping";
  const shippingFeeRaw = isShipping ? (selectedService?.total_fee ?? null) : 0;
  const shippingDiscount = applied?.discount_shipping ?? 0;
  const subtotalDiscount = applied?.discount_subtotal ?? 0;
  const totalDiscount = subtotalDiscount + shippingDiscount;
  const finalTotal =
    grandTotalState.state === "hasData"
      ? grandTotalState.data
      : shippingFeeRaw !== null
        ? totalAmount + shippingFeeRaw - totalDiscount
        : totalAmount - totalDiscount;

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
                ) : shippingFeeRaw !== null ? (
                  shippingDiscount > 0 ? (
                    <span>
                      <s className="text-inactive mr-1">
                        {formatPrice(shippingFeeRaw)}
                      </s>
                      {formatPrice(Math.max(0, shippingFeeRaw - shippingDiscount))}
                    </span>
                  ) : (
                    formatPrice(shippingFeeRaw)
                  )
                ) : (
                  <span className="text-inactive text-xs">Chọn địa chỉ giao</span>
                )}
              </td>
            </tr>
            {applied && totalDiscount > 0 && (
              <tr>
                <th>
                  Giảm giá{" "}
                  <code className="text-primary">{applied.voucher.code}</code>
                </th>
                <td className="text-primary">-{formatPrice(totalDiscount)}</td>
              </tr>
            )}
          </tbody>
        </table>
        <HorizontalDivider />
        <div className="flex justify-between font-medium text-sm">
          <div>Tổng thanh toán</div>
          <div>
            {feeLoading && isShipping ? (
              <span className="inline-block w-24 h-4 rounded bg-gray-200 animate-pulse" />
            ) : (
              formatPrice(Math.max(0, finalTotal))
            )}
          </div>
        </div>
      </div>
    </Section>
  );
}
