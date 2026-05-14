import { StockMovement } from "@/types";

const MOVEMENT_LABELS: Record<StockMovement["movement_type"], string> = {
  import: "Nhập kho",
  export: "Xuất kho",
  adjustment: "Điều chỉnh",
  reserved: "Đặt giữ",
  unreserved: "Giải phóng",
  return: "Hoàn trả",
  damage: "Hỏng/Mất",
};

const MOVEMENT_COLORS: Record<StockMovement["movement_type"], string> = {
  import: "text-green-600",
  export: "text-red-500",
  adjustment: "text-blue-500",
  reserved: "text-gray-500",
  unreserved: "text-gray-400",
  return: "text-orange-500",
  damage: "text-red-700",
};

interface Props {
  movement: StockMovement;
}

export default function MovementItem({ movement }: Props) {
  const isPositive = movement.quantity_change > 0;
  const sign = isPositive ? "+" : "";
  const colorClass = MOVEMENT_COLORS[movement.movement_type] ?? "text-gray-600";
  const date = new Date(movement.created_at).toLocaleString("vi-VN");

  return (
    <div className="flex items-start justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex-1 min-w-0">
        <p className={`font-medium text-sm ${colorClass}`}>
          {MOVEMENT_LABELS[movement.movement_type] ?? movement.movement_type}
        </p>
        {movement.note && (
          <p className="text-xs text-gray-500 mt-0.5 truncate">{movement.note}</p>
        )}
        <p className="text-xs text-gray-400 mt-0.5">{date}</p>
      </div>
      <div className="text-right ml-4 flex-shrink-0">
        <p className={`font-semibold text-sm ${colorClass}`}>
          {sign}{movement.quantity_change}
        </p>
        <p className="text-xs text-gray-400">→ {movement.quantity_after}</p>
      </div>
    </div>
  );
}
