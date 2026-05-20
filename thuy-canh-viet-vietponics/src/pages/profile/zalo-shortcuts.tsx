import { promptCreateShortcut, promptFollowOA } from "@/utils/zalo-prompts";
import { getConfig } from "@/utils/template";
import { ComponentProps } from "react";
import toast from "react-hot-toast";
import { Icon } from "zmp-ui";

type ZmpIconName = NonNullable<ComponentProps<typeof Icon>["icon"]>;

interface RowProps {
  icon: ZmpIconName;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  onClick: () => void;
}

function Row({ icon, iconBg, iconColor, title, subtitle, onClick }: RowProps) {
  return (
    <div
      className="flex items-center space-x-4 py-3 cursor-pointer"
      onClick={onClick}
    >
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center ${iconBg} ${iconColor}`}
      >
        <Icon icon={icon} />
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-2xs text-subtitle">{subtitle}</div>
      </div>
      <Icon icon="zi-chevron-right" />
    </div>
  );
}

export default function ZaloShortcuts() {
  const oaId = getConfig((c) => c.template.oaIDtoOpenChat);

  const handleAddShortcut = async () => {
    const result = await promptCreateShortcut();
    if (result.ok) {
      toast.success("Đã thêm shortcut vào màn hình chính");
    } else if (result.unsupported) {
      toast("Chức năng chỉ hoạt động trong ứng dụng Zalo", { icon: "ℹ️" });
    }
  };

  const handleFollowOA = async () => {
    const result = await promptFollowOA(oaId);
    if (result.ok) {
      toast.success("Cảm ơn bạn đã quan tâm OA Vietponics");
    } else if (result.unsupported) {
      toast("Chức năng chỉ hoạt động trong ứng dụng Zalo", { icon: "ℹ️" });
    }
  };

  return (
    <div className="bg-section rounded-lg px-4 border-[0.5px] border-black/15 divide-y divide-black/5">
      <Row
        icon="zi-add-photo"
        iconBg="bg-blue-100"
        iconColor="text-blue-600"
        title="Lưu app vào màn hình chính"
        subtitle="Truy cập Vietponics nhanh hơn cho lần sau"
        onClick={handleAddShortcut}
      />
      <Row
        icon="zi-heart-solid"
        iconBg="bg-pink-100"
        iconColor="text-pink-600"
        title="Quan tâm OA Vietponics"
        subtitle="Nhận cập nhật đơn hàng và ưu đãi qua Zalo"
        onClick={handleFollowOA}
      />
    </div>
  );
}
