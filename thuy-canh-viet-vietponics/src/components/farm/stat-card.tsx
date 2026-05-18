interface StatCardProps {
  label: string;
  value: string;
  changePct?: number;
  subtitle?: string;
  // Tone của subtitle/changePct — mặc định auto từ dấu của changePct.
  tone?: "success" | "muted" | "warning" | "danger";
}

// Card thống kê 1 chỉ số — dùng trong grid 2x2 trên dashboard. Theo wireframe:
// label nhỏ (muted) ở trên, value to in đậm, dưới cùng là changePct (có icon
// trending) hoặc subtitle text. Khi có changePct, tone tự suy từ dấu (xanh
// nếu ≥0, đỏ nếu <0).
export default function StatCard({ label, value, changePct, subtitle, tone }: StatCardProps) {
  const autoTone: StatCardProps["tone"] =
    tone ?? (typeof changePct === "number" ? (changePct >= 0 ? "success" : "danger") : "muted");

  const toneClass = {
    success: "text-green-600",
    muted: "text-gray-500",
    warning: "text-amber-600",
    danger: "text-red-600",
  }[autoTone];

  return (
    <div className="bg-gray-50 rounded-md p-2.5">
      <div className="text-[11px] text-gray-500">{label}</div>
      <div className="text-lg font-medium mt-0.5">{value}</div>
      {typeof changePct === "number" ? (
        <div className={`text-[11px] mt-0.5 ${toneClass} flex items-center gap-0.5`}>
          {changePct >= 0 ? "▲" : "▼"} {changePct >= 0 ? "+" : ""}
          {changePct}%
        </div>
      ) : subtitle ? (
        <div className={`text-[11px] mt-0.5 ${toneClass}`}>{subtitle}</div>
      ) : null}
    </div>
  );
}
