import toast from "react-hot-toast";
import { openShareSheet } from "zmp-sdk/apis";
import { Icon } from "zmp-ui";

// TODO: thay bằng ảnh thương hiệu thật, host trên vietponics.vn (~600x600)
const SHARE_THUMBNAIL = "https://vietponics.vn/static/share-cover.png";

export default function ReferralShareButton({
  code,
  refUrl,
}: {
  code: string;
  refUrl: string;
}) {
  const share = async () => {
    try {
      const res = await openShareSheet({
        type: "zmp_deep_link",
        data: {
          title: "Vietponics – Rau thủy canh tươi sạch, giao tận nhà",
          description: "Đặt rau qua link của mình để nhận ưu đãi nhé!",
          thumbnail: SHARE_THUMBNAIL,
          path: `/?ref=${encodeURIComponent(code)}`,
        },
      });
      // status: 0 = huỷ, 1 = đăng nhật ký, 2 = gửi qua chat
      if (res?.status === 1 || res?.status === 2) {
        toast.success("Đã chia sẻ link giới thiệu!");
      }
    } catch {
      try {
        await navigator.clipboard.writeText(refUrl);
        toast("Không mở được chia sẻ — đã copy link, bạn dán để gửi nhé.");
      } catch {
        toast.error("Không thể chia sẻ. Vui lòng thử lại.");
      }
    }
  };

  return (
    <button
      type="button"
      onClick={share}
      className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-white rounded-xl py-2.5 text-sm font-medium active:opacity-80"
    >
      <Icon icon="zi-share" />
      Chia sẻ Zalo
    </button>
  );
}
