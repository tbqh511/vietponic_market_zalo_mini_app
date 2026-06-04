import { useState } from "react";
import { useAtom } from "jotai";
import { customerProfileState } from "@/state";
import { authenticate } from "@/utils/request";
import { getAccessToken } from "zmp-sdk/apis";

// Tên placeholder mà SDK/backend trả khi user CHƯA cấp scope.userInfo.
// Một profile mang tên này coi như "thiếu tên".
const PLACEHOLDER_NAMES = ["Khách Zalo", "Người dùng Zalo", "Zalo User"];

function isMissingName(name: string | null | undefined): boolean {
  const n = (name ?? "").trim();
  return n === "" || PLACEHOLDER_NAMES.includes(n);
}

// Gate yêu cầu hoàn thiện hồ sơ: bật khi user đã auth nhưng còn thiếu BẤT KỲ
// trường nào (số điện thoại / tên / avatar). Bấm nút sẽ xin đúng quyền còn
// thiếu rồi authenticate lại để backend backfill các trường đang trống.
export default function PhoneRequiredGate() {
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
      if (stillMissing) setDenied(true);
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
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Bottom sheet */}
      <div className="relative w-full bg-white rounded-t-2xl px-6 pt-6 pb-10 flex flex-col items-center gap-4">
        <div className="w-10 h-1 bg-gray-200 rounded-full mb-2" />

        <div className="text-4xl">📱</div>

        <h2 className="text-lg font-semibold text-center text-gray-800">
          Hoàn thiện thông tin tài khoản
        </h2>

        <p className="text-sm text-center text-gray-500 leading-relaxed">
          Vui lòng cấp quyền truy cập {missingText} để hoàn thiện hồ sơ. Thông
          tin này giúp chúng tôi liên hệ và phục vụ bạn tốt hơn.
        </p>

        {denied && (
          <p className="text-sm text-red-500 text-center">
            Bạn chưa cấp đủ quyền truy cập. Vui lòng thử lại.
          </p>
        )}

        <button
          onClick={handleComplete}
          disabled={loading}
          className="w-full bg-primary text-white font-medium py-3 rounded-xl disabled:opacity-60"
        >
          {loading ? "Đang xử lý..." : "Cho phép truy cập thông tin"}
        </button>
      </div>
    </div>
  );
}
