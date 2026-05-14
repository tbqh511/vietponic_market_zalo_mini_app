import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { request } from "@/utils/request";
import { StockMovement } from "@/types";
import MovementItem from "./movement-item";

interface MovementsResponse {
  error: boolean;
  product: { id: number; name: string };
  data: { data: StockMovement[] };
}

export default function FarmMovementsPage() {
  const { id } = useParams<{ id: string }>();
  const [productName, setProductName] = useState("");
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      const token = localStorage.getItem("jwt_token");
      if (!token) {
        setError("Chưa đăng nhập.");
        setLoading(false);
        return;
      }
      try {
        const res = await request<MovementsResponse>(`/farm/inventory/${id}/movements`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled) {
          setProductName(res.product?.name ?? "");
          setMovements(res.data?.data ?? []);
        }
      } catch {
        if (!cancelled) setError("Không thể tải lịch sử biến động.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-gray-400 text-sm">Đang tải...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-500 text-sm">{error}</div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {productName && (
        <div className="px-4 py-3 bg-white border-b">
          <p className="font-semibold text-gray-800">{productName}</p>
        </div>
      )}
      <div className="flex-1 overflow-auto bg-white px-4">
        {movements.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-10">
            Chưa có biến động nào.
          </p>
        ) : (
          movements.map((m) => <MovementItem key={m.id} movement={m} />)
        )}
      </div>
    </div>
  );
}
