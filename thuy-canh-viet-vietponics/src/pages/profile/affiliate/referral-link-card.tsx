import toast from "react-hot-toast";
import { Button, Icon } from "zmp-ui";

export default function ReferralLinkCard({ url }: { url: string }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Đã copy link");
    } catch {
      toast.error("Không thể copy. Hãy nhấn giữ để copy thủ công.");
    }
  };

  return (
    <div className="bg-section rounded-lg p-4 border-[0.5px] border-black/15 space-y-2">
      <div className="text-sm font-medium">Link giới thiệu</div>
      <div
        className="text-xs bg-background rounded px-3 py-2 break-all"
        onClick={copy}
      >
        {url}
      </div>
      <Button variant="secondary" fullWidth onClick={copy}>
        <Icon icon="zi-copy" />
        <span className="ms-2">Copy link</span>
      </Button>
    </div>
  );
}
