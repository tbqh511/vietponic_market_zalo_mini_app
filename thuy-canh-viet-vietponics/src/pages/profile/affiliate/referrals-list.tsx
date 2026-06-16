import { useEffect, useState } from "react";
import { Button, Icon } from "zmp-ui";
import { openChat, openPhone } from "zmp-sdk/apis";
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchAffiliateReferrals(page)
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
      <div className="text-center text-subtitle text-sm py-2">
        Chưa có khách hàng nào được giới thiệu
      </div>
    );
  }

  return (
    <div>
      <div className="divide-y">
        {rows.map((row) => (
          <div key={row.id} className="py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{row.name}</div>
                <div className="text-2xs text-subtitle mt-0.5">
                  Tham gia {formatDate(row.joined_at)}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs text-subtitle">{row.orders_count} đơn</div>
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
            {(row.mobile || row.zalo_id) && (
              <div className="flex gap-2 mt-2">
                {row.mobile && (
                  <button
                    type="button"
                    onClick={() => openPhone({ phoneNumber: row.mobile! })}
                    className="flex items-center gap-1 text-xs text-primary border border-primary/30 rounded-lg px-3 py-1 active:opacity-70"
                  >
                    <Icon icon="zi-call" />
                    Gọi Zalo
                  </button>
                )}
                {row.zalo_id && (
                  <button
                    type="button"
                    onClick={() => openChat({ type: "user", id: row.zalo_id! })}
                    className="flex items-center gap-1 text-xs text-primary border border-primary/30 rounded-lg px-3 py-1 active:opacity-70"
                  >
                    <Icon icon="zi-chat" />
                    Nhắn Zalo
                  </button>
                )}
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
