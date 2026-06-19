import { Order } from "@/types";
import { Atom, useAtomValue } from "jotai";
import { loadable } from "jotai/utils";
import { useMemo, useRef } from "react";
import { EmptyOrder } from "@/components/empty";
import OrderSummary from "./order-summary";
import { OrderSummarySkeleton } from "@/components/skeleton";

function OrderList(props: { ordersState: Atom<Promise<Order[]>> }) {
  const orderList = useAtomValue(
    useMemo(() => loadable(props.ordersState), [props.ordersState])
  );

  // Giữ data cũ khi đang re-fetch (pull-to-refresh) để tránh flicker skeleton
  const prevDataRef = useRef<Order[]>([]);
  const prevAtomRef = useRef(props.ordersState);
  if (prevAtomRef.current !== props.ordersState) {
    // Chuyển tab → reset về empty để show skeleton đúng
    prevDataRef.current = [];
    prevAtomRef.current = props.ordersState;
  }
  if (orderList.state === "hasData") {
    prevDataRef.current = orderList.data;
  }

  const isLoading = orderList.state !== "hasData";
  const displayOrders = orderList.state === "hasData" ? orderList.data : prevDataRef.current;

  if (!isLoading && displayOrders.length === 0) {
    return <EmptyOrder />;
  }

  return (
    <div className="py-3">
      {isLoading && displayOrders.length === 0 ? (
        <>
          <OrderSummarySkeleton />
          <OrderSummarySkeleton />
          <OrderSummarySkeleton />
        </>
      ) : (
        displayOrders.map((order) => (
          <OrderSummary key={order.id} order={order} />
        ))
      )}
    </div>
  );
}

export default OrderList;
