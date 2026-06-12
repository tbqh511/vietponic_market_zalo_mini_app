import { useState } from "react";
import toast from "react-hot-toast";
import { Sheet, Input, Button, DatePicker } from "zmp-ui";
import { request } from "@/utils/request";
import { toYmd } from "@/utils/farm-api";
import { InventoryProduct } from "@/types";

interface Props {
  product: InventoryProduct | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ImportSheet({ product, onClose, onSuccess }: Props) {
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  // Hạn sử dụng (YYYY-MM-DD); "" = không chọn → lô không hạn (BE để null).
  const [expireDate, setExpireDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const qty = parseInt(quantity);
    if (!qty || qty < 1) {
      toast.error("Vui lòng nhập số lượng hợp lệ (tối thiểu 1).");
      return;
    }
    if (!note.trim()) {
      toast.error("Vui lòng nhập ghi chú.");
      return;
    }
    const token = localStorage.getItem("jwt_token");
    if (!token || !product) return;

    setSubmitting(true);
    try {
      // Route đúng: POST /farm/inventory/import — product_id nằm trong body
      // (không còn nhận {id} trên URL). expire_date chỉ gửi khi owner đã chọn.
      await request(`/farm/inventory/import`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          product_id: product.id,
          quantity: qty,
          note: note.trim(),
          ...(expireDate ? { expire_date: expireDate } : {}),
        }),
      });
      toast.success("Nhập kho thành công!");
      setQuantity("");
      setNote("");
      setExpireDate("");
      onSuccess();
    } catch (e: any) {
      const msg = e?.body ? JSON.parse(e.body)?.message : null;
      toast.error(msg || "Nhập kho thất bại. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet visible={!!product} onClose={onClose} autoHeight>
      <div className="px-4 pb-6 pt-2">
        <h3 className="font-semibold text-base text-gray-800 mb-1">Nhập kho</h3>
        {product && (
          <p className="text-sm text-gray-500 mb-4">{product.name}</p>
        )}
        <div className="mb-3">
          <label className="text-sm text-gray-600 mb-1 block">Số lượng nhập</label>
          <Input
            type="number"
            placeholder="Nhập số lượng..."
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>
        <div className="mb-3">
          <label className="text-sm text-gray-600 mb-1 block">
            Hạn sử dụng (tùy chọn)
          </label>
          <DatePicker
            value={expireDate ? new Date(expireDate + "T00:00:00") : undefined}
            startDate={new Date()}
            dateFormat="dd/mm/yyyy"
            columnsFormat="DD-MM-YYYY"
            locale="vi-VN"
            placeholder="Để trống nếu lô không có hạn"
            title="Hạn sử dụng"
            onChange={(d) => d && setExpireDate(toYmd(d))}
          />
        </div>
        <div className="mb-4">
          <label className="text-sm text-gray-600 mb-1 block">Ghi chú</label>
          <Input
            type="text"
            placeholder="Lý do nhập kho..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <Button
          fullWidth
          loading={submitting}
          disabled={submitting}
          onClick={handleSubmit}
          className="bg-green-600 text-white"
        >
          Xác nhận nhập kho
        </Button>
      </div>
    </Sheet>
  );
}
