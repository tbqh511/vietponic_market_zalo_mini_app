import { useAtomValue, useSetAtom } from "jotai";
import { useLocation, useNavigate } from "react-router-dom";
import { Icon } from "zmp-ui";
import { FarmIcon } from "@/components/vectors";
import {
  appSpaceState,
  farmPartnerStatusState,
  isFarmPartnerState,
  lastCustomerPathState,
} from "@/state";

// Card điều hướng Farm trong tab Cá nhân.
// - Farm partner đã duyệt: "Chuyển sang Farm Hub" → set space=farm + nhớ path customer.
// - Đang chờ duyệt ('requested'): hiển thị trạng thái chờ, không có action.
// - Customer thường: "Trở thành đối tác Farm" → /farm/register.
export default function FarmEntryCard() {
  const isFarmPartner = useAtomValue(isFarmPartnerState);
  const farmPartnerStatus = useAtomValue(farmPartnerStatusState);
  const setSpace = useSetAtom(appSpaceState);
  const setLastCustomerPath = useSetAtom(lastCustomerPathState);
  const navigate = useNavigate();
  const location = useLocation();

  // Chuyển sang Farm Hub: nhớ chỗ đang đứng để nút "Quay lại mua hàng" về đúng vị trí.
  const handleSwitchToFarm = () => {
    setLastCustomerPath(location.pathname);
    setSpace("farm");
    navigate("/farm", { viewTransition: true });
  };

  if (isFarmPartner) {
    return (
      <div
        onClick={handleSwitchToFarm}
        className="bg-primary/5 rounded-lg p-4 flex items-center space-x-4 border border-primary/30 cursor-pointer active:scale-[0.98]"
      >
        <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center text-primary">
          <Icon icon="zi-inbox" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium">Chuyển sang Farm Hub</div>
          <div className="text-2xs text-subtitle">
            Quản lý doanh thu, đơn đến và tồn kho farm của bạn
          </div>
        </div>
        <Icon icon="zi-chevron-right" className="text-primary" />
      </div>
    );
  }

  // Đang chờ duyệt: hiển thị trạng thái, không điều hướng.
  if (farmPartnerStatus === "requested") {
    return (
      <div className="bg-yellow-50 rounded-lg p-4 flex items-center space-x-4 border border-yellow-300">
        <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
          <Icon icon="zi-clock-1" className="text-yellow-600" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium text-yellow-800">
            Yêu cầu đang chờ duyệt
          </div>
          <div className="text-2xs text-yellow-700">
            Vietponics sẽ liên hệ trong 1-3 ngày làm việc
          </div>
        </div>
        <span className="text-2xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full font-medium">
          Đang xét
        </span>
      </div>
    );
  }

  // Chưa là partner: mời đăng ký.
  return (
    <div
      onClick={() => navigate("/farm/register", { viewTransition: true })}
      className="bg-section rounded-lg p-4 flex items-center space-x-4 border-[0.5px] border-black/15 cursor-pointer active:scale-[0.98]"
    >
      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
        <FarmIcon active />
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium">Trở thành đối tác Farm</div>
        <div className="text-2xs text-subtitle">
          Bán nông sản của bạn trên Vietponics
        </div>
      </div>
      <Icon icon="zi-chevron-right" />
    </div>
  );
}
