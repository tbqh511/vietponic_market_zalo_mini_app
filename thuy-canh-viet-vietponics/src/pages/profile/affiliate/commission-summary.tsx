import { AffiliateProfile } from "@/utils/affiliate";

function formatVnd(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(n) + "₫";
}

export default function CommissionSummary({
  stats,
}: {
  stats: AffiliateProfile["commission_stats"];
}) {
  return (
    <div className="bg-section rounded-lg p-4 border-[0.5px] border-black/15">
      <div className="text-sm font-medium mb-3">Tổng hoa hồng</div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <Tile label="Chờ" value={stats.pending} muted />
        <Tile label="Đã xác nhận" value={stats.confirmed} highlight />
        <Tile label="Đã chi trả" value={stats.paid} />
      </div>
    </div>
  );
}

function Tile({
  label,
  value,
  highlight,
  muted,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  muted?: boolean;
}) {
  return (
    <div>
      <div className="text-2xs text-subtitle">{label}</div>
      <div
        className={
          "text-base font-semibold mt-1 " +
          (highlight ? "text-primary" : muted ? "text-subtitle" : "")
        }
      >
        {formatVnd(value)}
      </div>
    </div>
  );
}
