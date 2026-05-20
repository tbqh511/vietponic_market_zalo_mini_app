import ProductGrid from "@/components/product-grid";
import Section from "@/components/section";
import { useAtomValue } from "jotai";
import { flashSaleProductsState } from "@/state";

export default function FlashSales() {
  const products = useAtomValue(flashSaleProductsState);

  return (
    <Section title="Giá tốt hôm nay">
      {products.length === 0 ? (
        <div className="px-4 pt-2 pb-8 text-center text-sm text-subtitle">
          Hiện chưa có sản phẩm nào. Vui lòng quay lại sau.
        </div>
      ) : (
        <ProductGrid products={products} />
      )}
    </Section>
  );
}
