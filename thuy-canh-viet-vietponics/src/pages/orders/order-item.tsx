import { CartItem } from "@/types";
import { formatPrice, formatQuantityWithUnit } from "@/utils/format";
import { List } from "zmp-ui";

function OrderItem(props: CartItem) {
  return (
    <List.Item
      prefix={
        <img src={props.product.image} loading="lazy" decoding="async" className="w-14 h-14 rounded-lg" />
      }
      suffix={
        <div className="text-sm font-medium flex items-center h-full text-right">
          {formatQuantityWithUnit(props.quantity, props.product.unit)}
        </div>
      }
    >
      <div className="text-sm">{props.product.name}</div>
      <div className="text-sm font-bold mt-1">
        {formatPrice(props.product.price)}
      </div>
      {props.product.originalPrice && (
        <div className="line-through text-subtitle text-4xs">
          {formatPrice(props.product.originalPrice)}
        </div>
      )}
    </List.Item>
  );
}

export default OrderItem;
