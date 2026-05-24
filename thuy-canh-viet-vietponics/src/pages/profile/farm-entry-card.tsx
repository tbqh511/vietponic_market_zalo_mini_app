import { useAtomValue, useSetAtom } from "jotai";
import { useLocation, useNavigate } from "react-router-dom";
import { Icon } from "zmp-ui";
import { FarmIcon } from "@/components/vectors";
import {
  appSpaceState,
  isFarmPartnerState,
  lastCustomerPathState,
} from "@/state";

// Card điều hướng Farm trong tab Cá nhân.
// - Farm partner đã duyệt: "Chuyển sang Farm Hub" → set space=farm + nhớ path customer.
// - Customer thường: "Trở thành đối tác Farm" → /farm/register.
export default function FarmEntryCard() {
  const isFarmPartner = useAtomValue(isFarmPartnerState);
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
