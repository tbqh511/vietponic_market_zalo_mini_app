import { useEffect } from "react";
import { useFarmGuard, useEnsureJwt } from "@/hooks";
import StockInDeclaration from "./stock-in";

// Trang quản lý kho cho farm partner. Tách khỏi dashboard chính (/farm) — kho
// là chức năng write (khai báo nhập kho buổi sáng), dashboard là read-only metrics.
export default function FarmInventoryPage() {
  const isFarm = useFarmGuard();
  const ensureJwt = useEnsureJwt();

  useEffect(() => {
    ensureJwt();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isFarm) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-gray-400 text-sm">Đang kiểm tra quyền truy cập...</p>
      </div>
    );
  }

  return <StockInDeclaration />;
}
