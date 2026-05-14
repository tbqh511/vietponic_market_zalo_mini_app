import TransitionLink from "@/components/transition-link";
import { Icon } from "zmp-ui";

export default function AffiliateEntryCard() {
  return (
    <TransitionLink to="/profile/affiliate">
      <div className="bg-section rounded-lg p-4 flex items-center space-x-4 border-[0.5px] border-black/15">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <Icon icon="zi-user-circle" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium">Cộng tác viên</div>
          <div className="text-2xs text-subtitle">
            Giới thiệu bạn bè — nhận hoa hồng từng đơn
          </div>
        </div>
        <Icon icon="zi-chevron-right" />
      </div>
    </TransitionLink>
  );
}
