import { HomeIcon, LocationMarkerLineIcon } from "@/components/vectors";
import { Order } from "@/types";
import { openOutApp, openWebview } from "zmp-sdk/apis";
import { Icon, List } from "zmp-ui";
import DeliverySummary from "../cart/delivery-summary";

function buildMapsUrl(delivery: Extract<Order["delivery"], { type: "pickup" }>): string | null {
  if (delivery.stationLat !== undefined && delivery.stationLng !== undefined) {
    return `https://www.google.com/maps/dir/?api=1&destination=${delivery.stationLat},${delivery.stationLng}`;
  }
  if (delivery.stationAddress) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(delivery.stationAddress)}`;
  }
  return null;
}

async function openMaps(url: string) {
  try {
    // openOutApp works for deep-link schemes; HTTPS falls through to webview
    await openOutApp({ url });
  } catch {
    try {
      await openWebview({ url, config: { style: "normal" } });
    } catch {
      // no-op in non-Zalo environments
    }
  }
}

function DirectionButton({ delivery }: { delivery: Extract<Order["delivery"], { type: "pickup" }> }) {
  const url = buildMapsUrl(delivery);
  if (!url) return null;
  return (
    <button
      className="mt-1.5 flex items-center gap-1 text-xs font-medium text-primary active:opacity-60"
      onClick={() => openMaps(url)}
    >
      <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
      </svg>
      Chỉ đường đến đây
    </button>
  );
}

function OrderInfo(props: { order: Order }) {
  return (
    <List noSpacing className="bg-section rounded-lg">
      {props.order.delivery.type === "pickup" ? (
        <DeliverySummary
          icon={<HomeIcon />}
          title="Nhận tại điểm"
          subtitle={
            props.order.delivery.stationName ||
            `Điểm giao hàng ${props.order.delivery.stationId}`
          }
          description={
            props.order.delivery.stationAddress ||
            "Vui lòng đến điểm giao hàng để nhận hàng"
          }
          extra={<DirectionButton delivery={props.order.delivery} />}
        />
      ) : (
        <DeliverySummary
          icon={<LocationMarkerLineIcon />}
          title="Giao đến"
          subtitle={props.order.delivery.alias}
          description={[
            props.order.delivery.address,
            props.order.delivery.ward_name,
            props.order.delivery.province_name,
          ].filter(Boolean).join(", ")}
        />
      )}
      {props.order.note && (
        <List.Item prefix={<Icon icon="zi-note" />} title="Ghi chú">
          <span className="text-xs text-inactive">{props.order.note}</span>
        </List.Item>
      )}
    </List>
  );
}

export default OrderInfo;
