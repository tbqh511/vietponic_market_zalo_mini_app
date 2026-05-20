import TransitionLink from "@/components/transition-link";
import { customerProfileState } from "@/state";
import { useAtomValue } from "jotai";
import { Icon } from "zmp-ui";

export default function FarmEntryCard() {
  const profile = useAtomValue(customerProfileState);

  if (!profile?.is_farm_partner) return null;

  return (
    <TransitionLink to="/farm">
      <div className="bg-section rounded-lg p-4 flex items-center space-x-4 border-[0.5px] border-black/15">
        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
          <Icon icon="zi-inbox" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium">Farm dashboard</div>
          <div className="text-2xs text-subtitle">
            Theo dõi doanh thu, tồn kho và hoạt động farm
          </div>
        </div>
        <Icon icon="zi-chevron-right" />
      </div>
    </TransitionLink>
  );
}
