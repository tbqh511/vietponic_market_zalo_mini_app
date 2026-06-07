import { useState } from "react";
import { useAtom } from "jotai";
import { customerProfileState } from "@/state";
import { authenticate } from "@/utils/request";
import { getAccessToken } from "zmp-sdk/apis";
import logo from "@/static/logo.png";

// Tên placeholder mà SDK/backend trả khi user CHƯA cấp scope.userInfo.
// Một profile mang tên này coi như "thiếu tên".
const PLACEHOLDER_NAMES = ["Khách Zalo", "Người dùng Zalo", "Zalo User"];

function isMissingName(name: string | null | undefined): boolean {
  const n = (name ?? "").trim();
  return n === "" || PLACEHOLDER_NAMES.includes(n);
}

interface PhoneRequiredGateProps {
  // Người dùng bấm "Để sau" / từ chối cấp quyền. Trang cha đóng gate và vẫn
  // cho phép dùng tính năng (đạt chuẩn 6.1 — luôn có lối thoát).
  onDismiss: () => void;
}

// Gate yêu cầu hoàn thiện hồ sơ: chỉ render khi trang có ngữ cảnh rõ ràng cần
// danh tính (Cá nhân / Đơn hàng / Giỏ hàng), KHÔNG render global ở trang chủ.
// Bật khi user đã auth nhưng còn thiếu BẤT KỲ trường nào (số điện thoại / tên /
// avatar). Bấm "Cho phép" sẽ xin đúng quyền còn thiếu rồi authenticate lại để
// backend backfill các trường đang trống. Bấm "Để sau" đóng gate, vẫn dùng app.
export default function PhoneRequiredGate({ onDismiss }: PhoneRequiredGateProps) {
  const [profile, setProfile] = useAtom(customerProfileState);
  const [loading, setLoading] = useState(false);
  const [denied, setDenied] = useState(false);

  if (!profile) return null;

  const needsPhone = !profile.mobile;
  const needsName = isMissingName(profile.name);
  const needsAvatar = !profile.profile;

  // Hồ sơ đã đầy đủ — không cần hiện gate.
  if (!needsPhone && !needsName && !needsAvatar) return null;

  async function handleComplete() {
    setLoading(true);
    setDenied(false);
    try {
      const { authorize, getPhoneNumber, getUserInfo } = await import(
        "zmp-sdk/apis"
      );

      // Xin đúng các quyền còn thiếu. Tên và avatar cùng nằm trong
      // scope.userInfo nên gộp chung.
      const scopes: Array<"scope.userInfo" | "scope.userPhonenumber"> = [];
      if (needsName || needsAvatar) scopes.push("scope.userInfo");
      if (needsPhone) scopes.push("scope.userPhonenumber");
      try {
        await authorize({ scopes });
      } catch {
        // user có thể từ chối một phần — vẫn thử đọc những gì lấy được bên dưới
      }

      // Số điện thoại: chỉ lấy token nếu đang thiếu.
      let phoneToken: string | undefined;
      if (needsPhone) {
        try {
          const { token } = await getPhoneNumber({});
          phoneToken = token ?? undefined;
        } catch {
          // ignore — kiểm tra kết quả authenticate ở dưới
        }
      }

      // Tên/avatar: lấy nếu đang thiếu một trong hai. authenticate() tự lọc
      // placeholder nên gửi luôn cũng an toàn.
      let zaloProfile: { name?: string; avatar?: string } | undefined;
      if (needsName || needsAvatar) {
        try {
          const { userInfo } = await getUserInfo({});
          zaloProfile = { name: userInfo?.name, avatar: userInfo?.avatar };
        } catch {
          // ignore — backend vẫn fallback Graph API
        }
      }

      const accessToken = await getAccessToken();
      if (!accessToken) {
        setDenied(true);
        return;
      }
      const result = await authenticate(accessToken, phoneToken, zaloProfile);
      const user = result.data?.user;
      if (!user) {
        setDenied(true);
        return;
      }

      // Cập nhật profile + token mới.
      setProfile(user);
      if (result.data?.token) {
        localStorage.setItem("jwt_token", result.data.token);
      }

      // Nếu vẫn còn thiếu phần đã yêu cầu (user từ chối) → báo lỗi để thử lại.
      const stillMissing =
        (needsPhone && !user.mobile) ||
        (needsName && isMissingName(user.name)) ||
        (needsAvatar && !user.profile);
      if (stillMissing) {
        setDenied(true);
      } else {
        // Đã đủ thông tin → đóng gate.
        onDismiss();
      }
    } catch {
      setDenied(true);
    } finally {
      setLoading(false);
    }
  }

  // Tiêu đề/nội dung thay đổi theo phần đang thiếu.
  const missingLabels = [
    needsName && "tên",
    needsPhone && "số điện thoại",
    needsAvatar && "ảnh đại diện",
  ].filter(Boolean) as string[];
  const missingText = missingLabels.join(", ");

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-end">
      {/* Backdrop — bấm ra ngoài cũng là một cách "để sau", vẫn cho dùng app. */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={loading ? undefined : onDismiss}
      />

      {/* Bottom sheet */}
      <div className="relative w-full bg-white rounded-t-2xl px-6 pt-6 pb-10 flex flex-col items-center gap-4">
        <div className="w-10 h-1 bg-gray-200 rounded-full mb-2" />

        <img
          src={logo}
          alt="Vietponics"
          className="w-16 h-16 object-contain"
        />

        <h2 className="text-lg font-semibold text-center text-gray-800">
          Cá nhân hoá trải nghiệm mua sắm
        </h2>

        <p className="text-sm text-center text-gray-500 leading-relaxed">
          Cho phép Vietponics dùng {missingText} từ Zalo để hiển thị hồ sơ và
          theo dõi đơn hàng. Tuỳ chọn — bạn vẫn dùng đầy đủ ứng dụng nếu để sau.
        </p>

        {denied && (
          <p className="text-sm text-red-500 text-center">
            Chưa lấy được thông tin. Bạn có thể thử lại hoặc bổ sung sau trong
            mục Chỉnh sửa thông tin.
          </p>
        )}

        <div className="w-full flex gap-3 pt-1">
          <button
            onClick={onDismiss}
            disabled={loading}
            className="flex-1 bg-gray-100 text-gray-700 font-medium py-3 rounded-xl disabled:opacity-60"
          >
            Để sau
          </button>
          <button
            onClick={handleComplete}
            disabled={loading}
            className="flex-1 bg-primary text-white font-medium py-3 rounded-xl disabled:opacity-60"
          >
            {loading ? "Đang xử lý..." : "Cho phép"}
          </button>
        </div>
      </div>
    </div>
  );
}
