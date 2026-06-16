import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import QRCode from "qrcode";
import { openShareSheet } from "zmp-sdk/apis";
import { Icon } from "zmp-ui";

interface Props {
  url: string;
  affiliateCode: string;
}

export default function InviteCard({ url, affiliateCode }: Props) {
  const [tab, setTab] = useState<"qr" | "link">("qr");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url, { width: 240, margin: 1 }).then((d) => {
      if (!cancelled) setQrDataUrl(d);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Đã copy link giới thiệu");
    } catch {
      toast.error("Không thể copy. Hãy nhấn giữ để copy thủ công.");
    }
  };

  const shareZalo = () => {
    try {
      openShareSheet({
        type: "zmp_deep_link",
        data: {
          title: "Mua rau thủy canh Vietponics — tươi sạch mỗi ngày!",
          thumbnail: "",
          path: `/?ref=${affiliateCode}`,
        },
      });
    } catch {
      copyLink();
    }
  };

  return (
    <div className="bg-section rounded-lg border-[0.5px] border-black/15 overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-black/8">
        {(["qr", "link"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={
              "flex-1 py-2.5 text-sm font-medium transition-colors " +
              (tab === t
                ? "text-primary border-b-2 border-primary -mb-px"
                : "text-subtitle")
            }
          >
            {t === "qr" ? "Mã QR" : "Link"}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-3">
        {tab === "qr" ? (
          <div className="flex flex-col items-center space-y-2">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR giới thiệu" className="w-52 h-52" />
            ) : (
              <div className="w-52 h-52 bg-background rounded flex items-center justify-center text-subtitle text-xs">
                Đang tạo...
              </div>
            )}
            <p className="text-2xs text-subtitle text-center">
              Khách quét mã sẽ vào mini app với mã của bạn được áp tự động.
            </p>
          </div>
        ) : (
          <div
            className="bg-background rounded px-3 py-2 text-xs break-all text-subtitle cursor-pointer"
            onClick={copyLink}
          >
            {url}
          </div>
        )}

        {/* Actions */}
        <button
          type="button"
          onClick={shareZalo}
          className="w-full flex items-center justify-center gap-2 bg-primary text-white rounded-lg py-2.5 text-sm font-medium active:opacity-80"
        >
          <Icon icon="zi-share" />
          Chia sẻ qua Zalo
        </button>

        {tab === "link" && (
          <button
            type="button"
            onClick={copyLink}
            className="w-full flex items-center justify-center gap-2 bg-background rounded-lg py-2.5 text-sm text-primary font-medium border border-primary/20 active:opacity-80"
          >
            <Icon icon="zi-copy" />
            Copy link
          </button>
        )}
      </div>
    </div>
  );
}
