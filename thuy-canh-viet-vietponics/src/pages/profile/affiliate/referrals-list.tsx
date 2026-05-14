import { useEffect, useState } from "react";
import { Button } from "zmp-ui";
import {
  AffiliateReferralRow,
  fetchAffiliateReferrals,
} from "@/utils/affiliate";

function formatVnd(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(n) + "₫";
}

function formatDate(s: string): string {
  if (!s) return "";
  const d = new Date(s.replace(" ", "T"));
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("vi-VN");
}

export default function ReferralsList() {
  const [rows, setRows] = useState<AffiliateReferralRow[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchAffiliateReferrals(page)
      .then((res) => {
        if (cancelled) return;
        setRows((prev) => (page === 1 ? res.items : [...prev, ...res.items]));
        setLastPage(res.lastPage);
        setTotal(res.total);
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
        Chưa có khách hàng nào được giới thiệu
      </div>
    );
  }

  return (
    <div className="bg-section rounded-lg p-4 border-[0.5px] border-black/15">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-medium">Khách đã giới thiệu</div>
        <div className="text-2xs text-subtitle">{total} khách</div>
      </div>
      <div className="divide-y">
        {rows.map((row) => (
          <div key={row.id} className="py-2.5">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1 pr-2">
                <div className="text-sm font-medium truncate">{row.name}</div>
                <div className="text-2xs text-subtitle">
                  {row.mobile_masked ? `${row.mobile_masked} · ` : ""}
                  Tham gia {formatDate(row.joined_at)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-subtitle">
                  {row.orders_count} đơn
                </div>
                <div className="text-sm font-semibold text-primary">
                  +{formatVnd(row.commission_total)}
                </div>
              </div>
            </div>
            {row.orders_total > 0 && (
              <div className="text-2xs text-subtitle mt-1">
                Tổng chi tiêu: {formatVnd(row.orders_total)}
              </div>
            )}
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
