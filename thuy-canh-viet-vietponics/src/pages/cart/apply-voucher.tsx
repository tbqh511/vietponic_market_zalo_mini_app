import { useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { Icon } from "zmp-ui";
import Section from "@/components/section";
import { VoucherIcon } from "@/components/vectors";
import { appliedVoucherState } from "@/state";
import { formatPrice } from "@/utils/format";
import VoucherSheet from "./voucher-sheet";

export default function ApplyVoucher() {
  const [open, setOpen] = useState(false);
  const applied = useAtomValue(appliedVoucherState);
  const setApplied = useSetAtom(appliedVoucherState);

  const totalDiscount = applied
    ? applied.discount_subtotal + applied.discount_shipping
    : 0;

  return (
    <>
      <Section title="Chọn mã giảm giá" className="rounded-lg">
        <button
          className="w-full flex justify-between items-center py-2 px-4 space-x-2 cursor-pointer"
          onClick={() => setOpen(true)}
        >
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <VoucherIcon className="flex-shrink-0" />
            <div className="text-sm min-w-0 truncate text-left">
              {applied ? (
                <span className="flex items-center gap-1 flex-wrap">
                  <code className="font-medium text-primary whitespace-nowrap">
                    {applied.voucher.code}
                  </code>
                  <span className="text-gray-500 whitespace-nowrap">
                    -{formatPrice(totalDiscount)}
                  </span>
                </span>
              ) : (
                "Voucher"
              )}
            </div>
          </div>
          <div className="flex-shrink-0 flex items-center space-x-1">
            {applied ? (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  setApplied(null);
                }}
                className="text-xs text-red-500 px-2 py-1"
              >
                Bỏ
              </span>
            ) : (
              <>
                <div className="text-sm font-medium">Chọn</div>
                <Icon icon="zi-chevron-right" />
              </>
            )}
          </div>
        </button>
      </Section>
      <VoucherSheet visible={open} onClose={() => setOpen(false)} />
    </>
  );
}
