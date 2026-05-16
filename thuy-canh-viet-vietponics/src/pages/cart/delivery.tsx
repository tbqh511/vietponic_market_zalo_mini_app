import HorizontalDivider from "@/components/horizontal-divider";
import Section from "@/components/section";
import ShippingMethodPicker from "@/components/shipping-method-picker";
import { StationSkeleton } from "@/components/skeleton";
import TransitionLink from "@/components/transition-link";
import {
  HomeIcon,
  LocationMarkerLineIcon,
  LocationMarkerPackageIcon,
  PackageDeliveryIcon,
  PlusIcon,
  ShipperIcon,
} from "@/components/vectors";
import { useShippingFee } from "@/hooks/useShippingFee";
import {
  deliveryModeState,
  selectedStationState,
  shippingAddressState,
} from "@/state";
import { useAtom, useAtomValue } from "jotai";
import { Suspense } from "react";
import DeliverySummary from "./delivery-summary";

function ShippingAddressSummary() {
  const shippingAddress = useAtomValue(shippingAddressState);

  if (!shippingAddress) {
    return (
      <TransitionLink
        className="flex flex-col space-y-2 justify-center items-center p-4 w-full"
        to="/shipping-address"
      >
        <LocationMarkerPackageIcon />
        <div className="flex space-x-1 items-center text-center p-2">
          <PlusIcon width={16} height={16} />
          <span className="text-sm font-medium">Thêm địa chỉ nhận hàng</span>
        </div>
      </TransitionLink>
    );
  }

  return (
    <DeliverySummary
      icon={<LocationMarkerLineIcon />}
      title="Địa chỉ nhận hàng"
      subtitle={shippingAddress.alias}
      description={shippingAddress.address}
      linkTo="/shipping-address"
    />
  );
}

function SelectedStationSummary() {
  const selectedStation = useAtomValue(selectedStationState);

  if (!selectedStation) {
    return (
      <TransitionLink
        className="flex flex-col space-y-2 justify-center items-center p-4 w-full"
        to="/stations"
      >
        <HomeIcon />
        <div className="flex space-x-1 items-center text-center p-2">
          <PlusIcon width={16} height={16} />
          <span className="text-sm font-medium">Chọn điểm nhận hàng</span>
        </div>
      </TransitionLink>
    );
  }

  return (
    <DeliverySummary
      icon={<HomeIcon />}
      title="Nhận hàng tại"
      subtitle={selectedStation.name}
      description={selectedStation.address}
      linkTo="/stations"
    />
  );
}



function ShippingServiceSection() {
  const { services, loading } = useShippingFee();
  if (!loading && services.length === 0) return null;
  return (
    <Section title="Dịch vụ vận chuyển" className="rounded-lg">
      <div className="px-4 py-3">
        <ShippingMethodPicker services={services} loading={loading} />
      </div>
    </Section>
  );
}

function Delivery() {
  const [selectedDeliveryMode, setSelectedDeliveryMode] =
    useAtom(deliveryModeState);

  return (
    <>
      <Section title="Hình thức giao hàng" className="rounded-lg">
        <div className="grid grid-cols-2 gap-4 p-4 pt-2">
          {(
            [
              {
                type: "shipping",
                name: "Giao tận nơi",
                icon: <ShipperIcon />,
              },
              {
                type: "pickup",
                name: "Tự đến lấy",
                icon: <PackageDeliveryIcon />,
              },
            ] as const
          ).map((option) => (
            <button
              key={option.type}
              className={"flex flex-col justify-center items-center gap-1 text-sm font-medium bg-background rounded-2xl h-16 px-2 w-full ".concat(
                selectedDeliveryMode === option.type
                  ? "border border-primary text-primary"
                  : ""
              )}
              onClick={() => setSelectedDeliveryMode(option.type)}
            >
              {option.icon}
              <span className="leading-tight text-center">{option.name}</span>
            </button>
          ))}
        </div>
        <HorizontalDivider />
        {selectedDeliveryMode === "shipping" ? (
          <ShippingAddressSummary />
        ) : (
          <Suspense fallback={<StationSkeleton />}>
            <SelectedStationSummary />
          </Suspense>
        )}
      </Section>

      {selectedDeliveryMode === "shipping" && <ShippingServiceSection />}
    </>
  );
}

export default Delivery;
