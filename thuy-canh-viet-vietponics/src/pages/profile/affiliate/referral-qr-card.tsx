import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import QRCode from "qrcode";
import { saveImageToGallery } from "zmp-sdk/apis";
import { Icon } from "zmp-ui";

export default function ReferralQRCard({ url }: { url: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url, { width: 240, margin: 1 })
      .then((d) => {
        if (!cancelled) setDataUrl(d);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  const saveQR = async () => {
    if (!dataUrl) return;
    setSaving(true);
    try {
      // saveImageToGallery nhận base64 thuần (không có prefix data:...)
      await saveImageToGallery({
        imageBase64Data: dataUrl.split(",")[1],
      });
      toast.success("Đã lưu mã QR vào thư viện ảnh!");
    } catch {
      toast.error("Không thể lưu ảnh. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-section rounded-lg p-4 border-[0.5px] border-black/15 flex flex-col items-center space-y-2">
      <div className="text-sm font-medium self-start">Mã QR giới thiệu</div>
      {dataUrl ? (
        <img src={dataUrl} alt="QR" className="w-60 h-60" />
      ) : (
        <div className="w-60 h-60 bg-background flex items-center justify-center text-subtitle text-xs">
          Đang tạo QR...
        </div>
      )}
      <div className="text-2xs text-subtitle text-center">
        Khách quét mã sẽ vào mini app với mã của bạn được áp tự động.
      </div>
      <button
        type="button"
        onClick={saveQR}
        disabled={!dataUrl || saving}
        className="w-full flex items-center justify-center gap-1.5 border border-primary/30 text-primary rounded-lg py-2 text-sm font-medium active:opacity-70 disabled:opacity-40"
      >
        <Icon icon="zi-download" />
        {saving ? "Đang lưu..." : "Lưu mã QR"}
      </button>
    </div>
  );
}
