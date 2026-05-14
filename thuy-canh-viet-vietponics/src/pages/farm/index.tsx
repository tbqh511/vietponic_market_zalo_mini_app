import { Suspense, useEffect } from "react";
import { useAtomValue } from "jotai";
import { loadable } from "jotai/utils";
import { farmInventoryState } from "@/state";
import { useFarmGuard, useEnsureJwt } from "@/hooks";
import InventoryList from "./inventory-list";

const loadableFarmInventory = loadable(farmInventoryState);

function FarmInventoryContent() {
  const inventoryAtom = useAtomValue(loadableFarmInventory);

  if (inventoryAtom.state === "loading") {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-gray-400 text-sm">Đang tải tồn kho...</p>
      </div>
    );
  }

  if (inventoryAtom.state === "hasError") {
    return (
      <div className="p-4 text-center text-red-500 text-sm">
        Không thể tải danh sách tồn kho.
      </div>
    );
  }

  return <InventoryList products={inventoryAtom.data} />;
}

export default function FarmDashboardPage() {
  const isFarm = useFarmGuard();
  const ensureJwt = useEnsureJwt();

  // Ensure JWT is available so farmInventoryState can fetch correctly
  useEffect(() => {
    ensureJwt();
  }, []);

  if (!isFarm) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-gray-400 text-sm">Đang kiểm tra quyền truy cập...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <div className="px-4 py-3 bg-white border-b">
        <p className="text-xs text-gray-500">
          Quản lý nhập/xuất kho cho tất cả sản phẩm Vietponics
        </p>
      </div>
      <div className="flex-1">
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-40">
              <p className="text-gray-400 text-sm">Đang tải...</p>
            </div>
          }
        >
          <FarmInventoryContent />
        </Suspense>
      </div>
    </div>
  );
}
