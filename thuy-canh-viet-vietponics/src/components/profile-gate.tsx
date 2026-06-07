import { useState } from "react";
import PhoneRequiredGate from "./phone-required-gate";

// Bao bọc PhoneRequiredGate cho các trang có ngữ cảnh cần danh tính
// (Cá nhân / Đơn hàng / Giỏ hàng). Quản lý việc đóng gate khi người dùng
// chọn "Để sau".
//
// Theo yêu cầu hiện tại: gate hiện lại MỖI LẦN vào trang (state cục bộ, không
// persist) — remount trang là gate xuất hiện lại nếu hồ sơ vẫn thiếu thông tin.
// PhoneRequiredGate tự ẩn khi hồ sơ đã đầy đủ hoặc profile chưa load.
export default function ProfileGate() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return <PhoneRequiredGate onDismiss={() => setDismissed(true)} />;
}
