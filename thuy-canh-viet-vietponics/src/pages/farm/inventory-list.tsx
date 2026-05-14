import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSetAtom } from "jotai";
import { farmInventoryState } from "@/state";
import { InventoryProduct } from "@/types";
import ImportSheet from "./import-sheet";
import ExportSheet from "./export-sheet";

interface Props {
  products: InventoryProduct[];
}

export default function InventoryList({ products }: Props) {
  const navigate = useNavigate();
  const refreshInventory = useSetAtom(farmInventoryState);
  const [importTarget, setImportTarget] = useState<InventoryProduct | null>(null);
  const [exportTarget, setExportTarget] = useState<InventoryProduct | null>(null);

  const handleSuccess = () => {
    setImportTarget(null);
    setExportTarget(null);
    refreshInventory();
  };

  if (products.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 text-sm">
        Không có sản phẩm nào.
      </div>
    );
  }

  return (
    <>
      <div className="divide-y divide-gray-100">
        {products.map((product) => (
          <div key={product.id} className="bg-white px-4 py-3">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0 pr-2">
                <p className="font-medium text-sm text-gray-800 leading-snug">
                  {product.name}
                </p>
                {product.category && (
                  <p className="text-xs text-gray-400 mt-0.5">{product.category}</p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <p
                  className={`font-semibold text-sm ${
                    product.is_low_stock ? "text-red-500" : "text-gray-800"
                  }`}
                >
                  {product.stock_available}
                  {product.is_low_stock && (
                    <span className="ml-1 text-xs bg-red-100 text-red-600 px-1 py-0.5 rounded">
                      Sắp hết
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-400">
                  Tổng: {product.stock} | Giữ: {product.stock_reserved}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setImportTarget(product)}
                className="flex-1 text-xs py-1.5 rounded bg-green-50 text-green-700 font-medium border border-green-200 active:bg-green-100"
              >
                + Nhập kho
              </button>
              <button
                onClick={() => setExportTarget(product)}
                className="flex-1 text-xs py-1.5 rounded bg-red-50 text-red-600 font-medium border border-red-200 active:bg-red-100"
              >
                − Xuất kho
              </button>
              <button
                onClick={() => navigate(`/farm/movements/${product.id}`)}
                className="flex-1 text-xs py-1.5 rounded bg-gray-50 text-gray-600 font-medium border border-gray-200 active:bg-gray-100"
              >
                Lịch sử
              </button>
            </div>
          </div>
        ))}
      </div>

      <ImportSheet
        product={importTarget}
        onClose={() => setImportTarget(null)}
        onSuccess={handleSuccess}
      />
      <ExportSheet
        product={exportTarget}
        onClose={() => setExportTarget(null)}
        onSuccess={handleSuccess}
      />
    </>
  );
}
