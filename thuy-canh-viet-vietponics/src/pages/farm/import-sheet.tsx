import { useState } from "react";
import toast from "react-hot-toast";
import { Sheet, Input, Button } from "zmp-ui";
import { request } from "@/utils/request";
import { InventoryProduct } from "@/types";

interface Props {
  product: InventoryProduct | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ImportSheet({ product, onClose, onSuccess }: Props) {
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
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
      await request(`/farm/inventory/${product.id}/import`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ quantity: qty, note: note.trim() }),
      });
      toast.success("Nhập kho thành công!");
      setQuantity("");
      setNote("");
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
