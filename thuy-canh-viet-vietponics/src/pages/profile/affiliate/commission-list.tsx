import { useEffect, useState } from "react";
import {
  AffiliateCommissionRow,
  fetchAffiliateCommissions,
} from "@/utils/affiliate";
import { Button } from "zmp-ui";

function formatVnd(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(n) + "₫";
}

function statusLabel(s: AffiliateCommissionRow["status"]): string {
  switch (s) {
    case "pending":
      return "Chờ";
    case "confirmed":
      return "Đã xác nhận";
    case "paid":
      return "Đã chi trả";
    case "cancelled":
      return "Đã huỷ";
  }
}

export default function CommissionList() {
  const [rows, setRows] = useState<AffiliateCommissionRow[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchAffiliateCommissions(page)
      .then((res) => {
        if (cancelled) return;
        setRows((prev) => (page === 1 ? res.items : [...prev, ...res.items]));
        setLastPage(res.lastPage);
      })
      .catch(() => {
        // silent — list is non-critical
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page]);

  if (rows.length === 0 && !loading) {
    return (
      <div className="bg-section rounded-lg p-4 border-[0.5px] border-black/15 text-center text-subtitle text-sm">
        Chưa có hoa hồng nào
      </div>
    );
  }

  return (
    <div className="bg-section rounded-lg p-4 border-[0.5px] border-black/15">
      <div className="text-sm font-medium mb-3">Lịch sử hoa hồng</div>
      <div className="divide-y">
        {rows.map((row) => (
          <div key={row.id} className="py-2 flex items-center justify-between">
            <div>
              <div className="text-xs text-subtitle">
                Đơn #{row.order_id} · {statusLabel(row.status)}
              </div>
              <div className="text-2xs text-subtitle">{row.created_at}</div>
            </div>
            <div className="text-sm font-semibold text-primary">
              +{formatVnd(row.commission_amount)}
            </div>
          </div>
        ))}
      </div>
      {page < lastPage && (
        <Button
          variant="tertiary"
          fullWidth
          loading={loading}
          onClick={() => setPage((p) => p + 1)}
          className="mt-3"
        >
          Tải thêm
        </Button>
      )}
    </div>
  );
}
