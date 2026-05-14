import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function ReferralQRCard({ url }: { url: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

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
    </div>
  );
}
