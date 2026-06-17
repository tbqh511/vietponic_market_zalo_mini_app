import { useAddToCart } from "@/hooks";
import { CartItem as CartItemProps } from "@/types";
import { formatPrice } from "@/utils/format";
import { animated, useSpring } from "@react-spring/web";
import { useDrag } from "@use-gesture/react";
import { useAtom, useAtomValue } from "jotai";
import { isOutOfStock, productState, selectedCartItemIdsState } from "@/state";
import { useEffect, useState } from "react";
import { Icon } from "zmp-ui";
import QuantityInput from "@/components/quantity-input";

const SWIPE_TO_DELTE_OFFSET = 80;

export default function CartItem(props: CartItemProps) {
  const [quantity, setQuantity] = useState(props.quantity);
  const { addToCart } = useAddToCart(props.product);

  // Đọc fresh stockAvailable từ productState (qua allProductsState, KHÔNG lọc
  // hết hàng) — snapshot trong cart có thể cũ; item đã hết hàng vẫn lookup được.
  const freshProduct = useAtomValue(productState(props.product.id));
  const outOfStock = freshProduct ? isOutOfStock(freshProduct) : false;

  const [selectedItemIds, setSelectedItemIds] = useAtom(
    selectedCartItemIdsState
  );

  // update cart
  useEffect(() => {
    addToCart(quantity);
  }, [quantity]);

  // swipe left to delete animation
  const [{ x }, api] = useSpring(() => ({ x: 0 }));
  const bind = useDrag(
    ({ last, offset: [ox] }) => {
      if (last) {
        if (ox < -SWIPE_TO_DELTE_OFFSET) {
          api.start({ x: -SWIPE_TO_DELTE_OFFSET });
        } else {
          api.start({ x: 0 });
        }
      } else {
        api.start({ x: Math.min(ox, 0), immediate: true });
      }
    },
    {
      from: () => [x.get(), 0],
      axis: "x",
      bounds: { left: -100, right: 0, top: 0, bottom: 0 },
      rubberband: true,
      preventScroll: true,
    }
  );

  return (
    <div className="relative after:border-b-[0.5px] after:border-black/10 after:absolute after:left-[88px] after:right-0 after:bottom-0 last:after:hidden">
      <div className="absolute right-0 top-0 bottom-0 w-20 py-px">
        <div
          className="bg-danger text-white/95 w-full h-full flex flex-col space-y-1 justify-center items-center cursor-pointer"
          onClick={() => addToCart(0)}
        >
          <Icon icon="zi-delete" />
          <div className="text-2xs font-medium">Xoá</div>
        </div>
      </div>

      <animated.div
        {...bind()}
        style={{ x }}
        className={`bg-white p-3 flex items-center gap-3 relative ${
          outOfStock ? "border-l-4 border-danger" : ""
        }`}
      >
        <img
          src={props.product.image}
          loading="lazy"
          decoding="async"
          className={`w-16 h-16 rounded-lg flex-shrink-0 object-cover ${outOfStock ? "opacity-50 grayscale" : ""}`}
        />
        <div className="flex-1 min-w-0 space-y-1">
          <div className="text-sm flex items-start gap-1.5">
            <span className={`flex-1 leading-snug line-clamp-2 ${outOfStock ? "text-subtitle" : ""}`}>
              {props.product.name}
            </span>
            {outOfStock && (
              <span className="bg-danger text-white text-3xs font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5">
                HẾT HÀNG
              </span>
            )}
          </div>
          <div className={`text-sm font-bold ${outOfStock ? "text-subtitle" : ""}`}>
            {formatPrice(props.product.price)}
          </div>
          {props.product.originalPrice && (
            <div className="line-through text-subtitle text-4xs">
              {formatPrice(props.product.originalPrice)}
            </div>
          )}
        </div>
        <div className="flex-shrink-0">
          <QuantityInput
            value={quantity}
            onChange={setQuantity}
            maxValue={freshProduct?.stockAvailable}
          />
        </div>
      </animated.div>
    </div>
  );
}
