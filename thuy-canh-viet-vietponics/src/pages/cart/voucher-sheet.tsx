import { useState } from "react";
import { Sheet, Input, Button, Icon } from "zmp-ui";
import { useAtomValue, useSetAtom } from "jotai";
import toast from "react-hot-toast";
import {
  appliedVoucherState,
  cartTotalState,
  selectedShippingServiceState,
  deliveryModeState,
} from "@/state";
import { useAvailableVouchers, useValidateVoucher } from "@/hooks";
import { formatPrice } from "@/utils/format";
import { VoucherIcon } from "@/components/vectors";
import type { Voucher, AppliedVoucher } from "@/types";

interface Props {
  visible: boolean;
  onClose: () => void;
}

function describeDiscount(v: Voucher): string {
  switch (v.discount_type) {
    case "percent": {
      const cap = v.max_discount_amount
        ? ` (tối đa ${formatPrice(Number(v.max_discount_amount))})`
        : "";
      return `Giảm ${v.discount_value}%${cap}`;
    }
    case "fixed":
      return `Giảm ${formatPrice(Number(v.discount_value))}`;
    case "free_shipping":
      return v.discount_value > 0
        ? `Giảm phí ship tối đa ${formatPrice(Number(v.discount_value))}`
        : "Miễn phí vận chuyển";
  }
}

export default function VoucherSheet({ visible, onClose }: Props) {
  const setApplied = useSetAtom(appliedVoucherState);
  const applied = useAtomValue(appliedVoucherState);
  const { totalAmount } = useAtomValue(cartTotalState);
  const selectedShippingService = useAtomValue(selectedShippingServiceState);
  const deliveryMode = useAtomValue(deliveryModeState);
  const shippingFee =
    deliveryMode === "shipping" ? selectedShippingService?.total_fee ?? 0 : 0;

  const { vouchers, loading } = useAvailableVouchers();
  const validateVoucher = useValidateVoucher();

  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);

  const handleApplyCode = async () => {
    setInputError(null);
    if (!code.trim()) {
      setInputError("Vui lòng nhập mã");
      return;
    }
    setSubmitting(true);
    const result = await validateVoucher(code);
    setSubmitting(false);
    if ("error" in result) {
      setInputError(result.error);
      return;
    }
    setApplied(result);
    toast.success(`Đã áp dụng ${result.voucher.code}`);
    setCode("");
    onClose();
  };

  const handlePickVoucher = (v: Voucher) => {
    if (!v.usable) return;
    // Compute discount nếu backend đã preview, fallback 0.
    const discountSubtotal = Number(v.preview_subtotal ?? 0);
    const discountShipping = Number(v.preview_shipping ?? 0);
    const applied: AppliedVoucher = {
      voucher: v,
      discount_subtotal: discountSubtotal,
      discount_shipping: discountShipping,
    };
    setApplied(applied);
    toast.success(`Đã áp dụng ${v.code}`);
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} autoHeight>
      <div className="px-4 pb-6 pt-2 max-h-[80vh] overflow-y-auto">
        <h3 className="font-semibold text-base text-gray-800 mb-3">
          Chọn mã giảm giá
        </h3>

        {/* Nhập mã thủ công */}
        <div className="mb-4">
          <label className="text-sm text-gray-600 mb-1 block">Nhập mã</label>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="VD: SALE10"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  if (inputError) setInputError(null);
                }}
              />
            </div>
            <Button
              loading={submitting}
              disabled={submitting || !code.trim()}
              onClick={handleApplyCode}
            >
              Áp dụng
            </Button>
          </div>
          {inputError && (
            <div className="text-xs text-red-600 mt-1">{inputError}</div>
          )}
        </div>

        {/* Danh sách voucher khả dụng */}
        <div className="mb-2 text-sm font-medium text-gray-700">
          Voucher khả dụng
        </div>

        {loading && (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-16 rounded-lg bg-gray-100 animate-pulse"
              />
            ))}
          </div>
        )}

        {!loading && vouchers.length === 0 && (
          <div className="text-sm text-gray-500 py-6 text-center">
            Hiện không có voucher khả dụng
          </div>
        )}

        {!loading && vouchers.length > 0 && (
          <div className="space-y-2">
            {vouchers.map((v) => {
              const usable = v.usable !== false;
              const isApplied = applied?.voucher.id === v.id;
              return (
                <button
                  key={v.id}
                  disabled={!usable}
                  onClick={() => handlePickVoucher(v)}
                  className={`w-full text-left rounded-lg border p-3 flex gap-3 items-start transition ${
                    isApplied
                      ? "border-primary bg-primary/5"
                      : usable
                        ? "border-gray-200 hover:border-primary active:bg-gray-50"
                        : "border-gray-200 bg-gray-50 opacity-60"
                  }`}
                >
                  <div className="pt-1 flex-none">
                    <VoucherIcon />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-medium text-primary">
                        {v.code}
                      </code>
                      <span className="text-sm text-gray-700 truncate">
                        {v.name}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {describeDiscount(v)}
                    </div>
                    {!usable && v.unusable_reason && (
                      <div className="text-xs text-red-500 mt-0.5">
                        {v.unusable_reason}
                      </div>
                    )}
                  </div>
                  {isApplied && (
                    <Icon icon="zi-check" className="text-primary flex-none" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Sheet>
  );
}
