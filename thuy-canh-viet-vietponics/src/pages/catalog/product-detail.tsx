import HorizontalDivider from "@/components/horizontal-divider";
import { useAtomValue } from "jotai";
import { useNavigate, useParams } from "react-router-dom";
import { isOutOfStock, productState } from "@/state";
import { formatPrice, formatQuantityWithUnit } from "@/utils/format";
import ShareButton from "./share-buttont";
import RelatedProducts from "./related-products";
import { useAddToCart } from "@/hooks";
import { Button } from "zmp-ui";
import Section from "@/components/section";
import { useState } from "react";

export default function ProductDetailPage() {
  const { id } = useParams();
  const product = useAtomValue(productState(Number(id)))!;
  const [quantity, setQuantity] = useState(1);

  const navigate = useNavigate();
  const { addToCart } = useAddToCart(product);
  const unitLabel = product.unit?.unitLabel;
  const outOfStock = isOutOfStock(product);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="w-full p-4 pb-2 space-y-4 bg-section">
          <img
            key={product.id}
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover rounded-lg"
            style={{
              viewTransitionName: `product-image-${product.id}`,
            }}
          />
          <div>
            <div className="text-xl font-bold text-primary">
              {formatPrice(product.price)}
            </div>
            {product.originalPrice && (
              <div className="text-2xs space-x-0.5">
                <span className="text-subtitle line-through">
                  {formatPrice(product.originalPrice)}
                </span>
                <span className="text-danger">
                  -
                  {100 -
                    Math.round((product.price * 100) / product.originalPrice)}
                  %
                </span>
              </div>
            )}
            <div className="text-sm mt-1">{product.name}</div>
          </div>
          {!outOfStock && (
            <div className="flex items-center justify-between bg-background rounded-lg px-3 py-2">
              <div className="text-sm">
                <div className="text-subtitle text-2xs mb-0.5">Số lượng</div>
                <div className="font-medium">{formatQuantityWithUnit(quantity, product.unit)}</div>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  aria-label="Giảm số lượng"
                  className="w-8 h-8 rounded-full bg-white border border-black/10 text-lg disabled:opacity-40"
                  disabled={quantity <= 1}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                >
                  −
                </button>
                <div className="w-8 text-center font-medium">{quantity}</div>
                <button
                  aria-label="Tăng số lượng"
                  className="w-8 h-8 rounded-full bg-white border border-black/10 text-lg"
                  onClick={() => setQuantity((q) => q + 1)}
                >
                  +
                </button>
              </div>
            </div>
          )}
          {unitLabel && (
            <div className="text-2xs text-subtitle">
              1 {unitLabel} ≈ {product.unit!.conversionFactor.toLocaleString("vi-VN")}
              {product.unit!.systemUnit === "piece" ? " cái" : product.unit!.systemUnit}
            </div>
          )}
          <ShareButton product={product} />
        </div>
        {product.detail && (
          <>
            <div className="bg-background h-2 w-full"></div>
            <Section title="Mô tả sản phẩm">
              <div className="text-sm whitespace-pre-wrap text-subtitle p-4 pt-2">
                {product.detail}
              </div>
            </Section>
          </>
        )}
        <div className="bg-background h-2 w-full"></div>
        <Section title="Sản phẩm khác">
          <RelatedProducts currentProductId={product.id} />
        </Section>
      </div>

      <HorizontalDivider />
      <div className="flex-none py-3 px-4 bg-section space-y-2">
        {outOfStock && (
          <div className="text-xs text-danger text-center font-medium">
            Sản phẩm đang hết hàng
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="tertiary"
            disabled={outOfStock}
            onClick={() => {
              addToCart((q) => q + quantity, { toast: true });
            }}
          >
            {outOfStock ? "Hết hàng" : "Thêm vào giỏ"}
          </Button>
          <Button
            disabled={outOfStock}
            onClick={() => {
              addToCart((q) => q + quantity);
              navigate("/cart", { viewTransition: true });
            }}
          >
            Mua ngay
          </Button>
        </div>
      </div>
    </div>
  );
}
