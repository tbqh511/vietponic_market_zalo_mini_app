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
import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";

export default function ProductDetailPage() {
  const { id } = useParams();
  const product = useAtomValue(productState(Number(id)))!;
  const [quantity, setQuantity] = useState(1);
  const [activeIndex, setActiveIndex] = useState(0);

  const navigate = useNavigate();
  const { addToCart } = useAddToCart(product);
  const unitLabel = product.unit?.unitLabel;
  const outOfStock = isOutOfStock(product);

  const images =
    product.images && product.images.length > 0
      ? product.images
      : [product.image];
  const hasMultiple = images.length > 1;

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setActiveIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi, onSelect]);

  const maxQty =
    typeof product.stockAvailable === "number" &&
    Number.isFinite(product.stockAvailable)
      ? product.stockAvailable
      : undefined;
  const atMax = maxQty !== undefined && quantity >= maxQty;

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="w-full p-4 pb-2 space-y-4 bg-section">

          {/* ─── Image gallery ──────────────────────────────────────────── */}
          <div>
            {hasMultiple ? (
              <>
                <div className="overflow-hidden rounded-lg" ref={emblaRef}>
                  <div className="flex">
                    {images.map((src, i) => (
                      <div
                        key={i}
                        className="flex-none w-full"
                        style={{ viewTransitionName: i === 0 ? `product-image-${product.id}` : undefined }}
                      >
                        <img
                          src={src}
                          alt={`${product.name} - ảnh ${i + 1}`}
                          className="w-full aspect-square object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dot indicators */}
                <div className="flex justify-center gap-1.5 mt-2">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      aria-label={`Ảnh ${i + 1}`}
                      onClick={() => emblaApi?.scrollTo(i)}
                      className={`rounded-full transition-all duration-200 ${
                        i === activeIndex
                          ? "w-4 h-2 bg-primary"
                          : "w-2 h-2 bg-black/20"
                      }`}
                    />
                  ))}
                </div>

                {/* Thumbnail strip */}
                <div className="flex gap-2 mt-2 overflow-x-auto pb-1 scrollbar-none">
                  {images.map((src, i) => (
                    <button
                      key={i}
                      onClick={() => emblaApi?.scrollTo(i)}
                      className={`flex-none w-14 h-14 rounded-md overflow-hidden border-2 transition-colors ${
                        i === activeIndex ? "border-primary" : "border-transparent"
                      }`}
                    >
                      <img
                        src={src}
                        alt={`thumbnail ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <img
                key={product.id}
                src={product.image}
                alt={product.name}
                className="w-full aspect-square object-cover rounded-lg"
                style={{ viewTransitionName: `product-image-${product.id}` }}
              />
            )}
          </div>
          {/* ────────────────────────────────────────────────────────────── */}

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
            <div className="bg-background rounded-lg px-3 py-2">
              <div className="flex items-center justify-between">
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
                    className="w-8 h-8 rounded-full bg-white border border-black/10 text-lg disabled:opacity-40"
                    disabled={atMax}
                    onClick={() =>
                      setQuantity((q) =>
                        maxQty !== undefined ? Math.min(maxQty, q + 1) : q + 1
                      )
                    }
                  >
                    +
                  </button>
                </div>
              </div>
              {atMax && (
                <div className="text-2xs text-subtitle mt-1 text-right">
                  Còn lại {maxQty}
                </div>
              )}
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
