import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Sheet, Input, Button, Radio } from "zmp-ui";
import { Order } from "@/types";
import { useCancelOrder } from "@/hooks";

const REASON_OPTIONS: Array<{ code: string; label: string }> = [
  { code: "wrong_item", label: "Đặt nhầm sản phẩm" },
  { code: "found_better_price", label: "Tìm được giá tốt hơn" },
  { code: "address_change", label: "Cần đổi địa chỉ giao hàng" },
  { code: "no_longer_needed", label: "Không có nhu cầu nữa" },
  { code: "delivery_too_slow", label: "Giao hàng quá chậm" },
  { code: "other", label: "Lý do khác" },
];

/**
 * Trả về thông điệp hoàn tiền (UX) theo payment method + payment status.
 * Khớp với logic RefundService backend.
 */
function refundExpectationMessage(order: Order): { text: string; tone: "info" | "warning" } {
  const method = (order.paymentMethod ?? "").toUpperCase();
  const paid = order.paymentStatus === "success";
  if (!paid || method.startsWith("COD")) {
    return { text: "Đơn hàng chưa thanh toán, không phát sinh hoàn tiền.", tone: "info" };
  }
  if (method.startsWith("ZALOPAY")) {
    return { text: "Tiền sẽ được hoàn về ví ZaloPay của bạn trong 5–15 phút.", tone: "info" };
  }
  if (method.startsWith("MOMO")) {
    return { text: "Tiền sẽ được hoàn về ví MoMo trong vòng 24 giờ (kế toán xử lý thủ công).", tone: "warning" };
  }
  if (method.startsWith("BANK")) {
    return { text: "Tiền sẽ được hoàn về tài khoản ngân hàng trong 2–7 ngày làm việc.", tone: "warning" };
  }
  return { text: "Bộ phận kế toán sẽ liên hệ để xử lý hoàn tiền.", tone: "warning" };
}

interface Props {
  order: Order | null;
  onClose: () => void;
  onSuccess: (updated: Order) => void;
}

export default function CancelOrderModal({ order, onClose, onSuccess }: Props) {
  const [reasonCode, setReasonCode] = useState<string>("wrong_item");
  const [otherText, setOtherText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const cancelOrder = useCancelOrder();

  const refundMsg = useMemo(() => (order ? refundExpectationMessage(order) : null), [order]);

  const handleSubmit = async () => {
    if (!order) return;
    const isOther = reasonCode === "other";
    const text = otherText.trim();
    if (isOther && text.length < 5) {
      toast.error('Vui lòng nhập lý do (tối thiểu 5 ký tự).');
      return;
    }
    setSubmitting(true);
    try {
      const updated = await cancelOrder(order.id, reasonCode, isOther ? text : undefined);
      toast.success("Đã huỷ đơn hàng.");
      onSuccess(updated);
      onClose();
      setOtherText("");
      setReasonCode("wrong_item");
    } catch (e: any) {
      toast.error(e?.message || "Huỷ đơn thất bại. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet visible={!!order} onClose={onClose} autoHeight>
      <div className="px-4 pb-6 pt-2">
        <h3 className="font-semibold text-base text-gray-800 mb-1">Huỷ đơn hàng</h3>
        {order && (
          <p className="text-xs text-gray-500 mb-4">Đơn #{order.id}</p>
        )}

        <div className="mb-3">
          <label className="text-sm text-gray-600 mb-2 block font-medium">
            Vui lòng cho biết lý do huỷ:
          </label>
          <Radio.Group
            value={reasonCode}
            onChange={(val) => setReasonCode(String(val))}
          >
            <div className="flex flex-col space-y-1">
              {REASON_OPTIONS.map((opt) => (
                <Radio key={opt.code} value={opt.code}>
                  <span className="text-sm">{opt.label}</span>
                </Radio>
              ))}
            </div>
          </Radio.Group>
        </div>

        {reasonCode === "other" && (
          <div className="mb-3">
            <Input.TextArea
              placeholder="Vui lòng mô tả lý do (tối thiểu 5 ký tự)..."
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
              maxLength={500}
              showCount
            />
          </div>
        )}

        {refundMsg && (
          <div
            className={`mb-4 p-3 rounded-lg text-xs ${
              refundMsg.tone === "warning"
                ? "bg-yellow-50 text-yellow-800"
                : "bg-blue-50 text-blue-800"
            }`}
          >
            {refundMsg.text}
          </div>
        )}

        <div className="flex space-x-2">
          <Button
            fullWidth
            variant="secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Quay lại
          </Button>
          <Button
            fullWidth
            loading={submitting}
            disabled={submitting}
            onClick={handleSubmit}
            className="bg-red-600 text-white"
          >
            Xác nhận huỷ
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
