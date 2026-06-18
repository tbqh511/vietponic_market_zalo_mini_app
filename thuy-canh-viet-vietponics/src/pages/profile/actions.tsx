import {
  PackageIcon,
  ConfirmOrderIcon,
  TruckDeliveryIcon,
  StarIcon,
} from "@/components/vectors";
import { OrderStatus } from "@/types";
import { useNavigate } from "react-router-dom";

export default function ProfileActions() {
  const navigate = useNavigate();
  const goToOrders = (status: OrderStatus) => {
    navigate(`/orders/${status}`);
  };

  return (
    <div className="bg-white rounded-lg p-4 grid grid-cols-4 gap-2 justify-items-center border-[0.5px] border-black/15">
      {[
        {
          label: "Chờ xác nhận",
          icon: ConfirmOrderIcon,
          onClick: () => goToOrders("confirming"),
        },
        {
          label: "Chờ lấy hàng",
          icon: () => <PackageIcon active />,
          onClick: () => goToOrders("packing"),
        },
        {
          label: "Chờ giao hàng",
          icon: TruckDeliveryIcon,
          onClick: () => goToOrders("shipping"),
        },
        {
          label: "Đánh giá",
          icon: StarIcon,
          onClick: () => goToOrders("review"),
        },
      ].map((action) => (
        <div
          key={action.label}
          className="flex flex-col gap-2 items-center cursor-pointer"
          onClick={action.onClick}
        >
          <div className="w-10 h-10 rounded-full bg-[#EBEFF7] flex items-center justify-center">
            <action.icon />
          </div>
          <div className="text-2xs text-center leading-tight">{action.label}</div>
        </div>
      ))}
    </div>
  );
}
