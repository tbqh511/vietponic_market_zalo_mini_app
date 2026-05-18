import { FarmProductToday } from "@/types";

interface ProductProgressProps {
  product: FarmProductToday;
}

// Format số kg với 1 chữ số thập phân, ẩn .0 cho số nguyên (28.0kg → 28kg).
function fmtKg(n: number): string {
  return Number.isInteger(n) ? `${n}kg` : `${n.toFixed(1)}kg`;
}

function fmtCurrency(n: number): string {
  return `${Math.round(n).toLocaleString("vi-VN")}đ`;
}

// 1 hàng trong list "Sản phẩm hôm nay". Layout theo wireframe:
//   [thanh dọc màu] [tên sản phẩm + sold/stocked · còn remaining] [revenue + sellthrough%]
// Màu thanh + màu % bám theo status do backend trả về (good/warning/danger).
export default function ProductProgress({ product }: ProductProgressProps) {
  const barColor = {
    good: "bg-[#1D9E75]",      // green
    warning: "bg-[#EF9F27]",    // amber
    danger: "bg-[#E24B4A]",     // red
  }[product.status];

  const pctTone = {
    good: "text-green-600",
    warning: "text-amber-600",
    danger: "text-red-600",
  }[product.status];

  // sellthrough_pct có thể là 999 (sentinel "cháy hàng / bán nhiều hơn stock").
  // Cap về 100% trong text để không hiển thị số xấu.
  const displayPct = product.sellthrough_pct >= 999 ? 100 : Math.round(product.sellthrough_pct);

  // Trạng thái text bên dưới tên: "X kg / Y kg · còn Z kg" — nhưng nếu hết hàng
  // mà vẫn có sold (sellthrough_pct >= 100) thì hiển thị "cháy hàng" thay cho remaining.
  const subline = (() => {
    if (product.remaining <= 0.01 && product.sold > 0) {
      return `${fmtKg(product.sold)} / ${fmtKg(product.stocked)} · cháy hàng`;
    }
    return `${fmtKg(product.sold)} / ${fmtKg(product.stocked)} · còn ${fmtKg(product.remaining)}`;
  })();

  return (
    <div className="flex items-center gap-2.5 p-2 bg-gray-50 rounded-md">
      <div className={`w-1.5 h-8 rounded ${barColor}`} />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium truncate">{product.name}</div>
        <div className="text-[11px] text-gray-500 truncate">{subline}</div>
      </div>
      <div className="text-right">
        <div className="text-[13px] font-medium">{fmtCurrency(product.revenue)}</div>
        <div className={`text-[10px] ${pctTone}`}>{displayPct}%</div>
      </div>
    </div>
  );
}
