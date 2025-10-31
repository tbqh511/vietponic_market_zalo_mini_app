import { CartItem, ApiOrderItem } from "@/types";
import OrderItem from "./order-item";
import { useState } from "react";
import { Icon, List } from "zmp-ui";

// Adapter để convert ApiOrderItem thành format tương thích với OrderItem
function adaptOrderItem(item: CartItem | ApiOrderItem): CartItem {
  if ('product' in item) {
    // Đã là CartItem format
    return item;
  } else {
    // Convert từ ApiOrderItem
    return {
      product: {
        id: parseInt(item.product_id),
        name: item.name,
        price: parseFloat(item.price),
        image: item.image,
        category: { id: 0, name: '', image: '' }, // Placeholder
        detail: item.detail
      },
      quantity: parseInt(item.quantity)
    };
  }
}

function CollapsibleOrderItems(props: {
  items: (CartItem | ApiOrderItem)[];
  defaultExpanded?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(
    props.defaultExpanded ? false : true
  );
  const displayItems = collapsed ? props.items.slice(0, 1) : props.items;

  return (
    <>
      <List noSpacing>
        {displayItems.map((item) => {
          const adaptedItem = adaptOrderItem(item);
          return <OrderItem key={adaptedItem.product.id} {...adaptedItem} />;
        })}
      </List>
      {displayItems.length < props.items.length && (
        <button
          className="w-full flex justify-center items-center space-x-1 text-xs p-2 -mt-4 transition-all relative"
          onClick={(e) => {
            e.stopPropagation();
            document.startViewTransition(() => {
              setCollapsed(false);
            });
          }}
        >
          <span>Xem thêm</span>
          <Icon icon="zi-chevron-down" />
        </button>
      )}
    </>
  );
}

export default CollapsibleOrderItems;
