import { useEffect } from "react";
import { useFarmGuard, useEnsureJwt } from "@/hooks";
import InventoryList from "./inventory-list";

export default function FarmDashboardPage() {
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

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <InventoryList />
    </div>
  );
}
