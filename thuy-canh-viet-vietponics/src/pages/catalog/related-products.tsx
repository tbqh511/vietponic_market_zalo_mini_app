import ProductGrid from "@/components/product-grid";
import { useAtomValue } from "jotai";
import { useMemo } from "react";
import { allProductsState } from "@/state";

export interface RelatedProductsProps {
  currentProductId: number;
}

export default function RelatedProducts(props: RelatedProductsProps) {
  // PROD-05/B13: SP liên quan hiện CẢ item hết hàng (kèm badge "Hết hàng") →
  // allProductsState, đồng bộ với home/category/search. ProductItem tự render badge.
  const products = useAtomValue(allProductsState);
  const otherProducts = useMemo(
    () => products.filter((product) => product.id !== props.currentProductId),
    [products, props.currentProductId]
  );

  return <ProductGrid replace products={otherProducts} />;
}
