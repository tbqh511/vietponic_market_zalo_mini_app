import { useState } from "react";
import { useAtom } from "jotai";
import { customerProfileState } from "@/state";
import { authenticate } from "@/utils/request";
import { getAccessToken } from "zmp-sdk/apis";

export default function PhoneRequiredGate() {
  const [profile, setProfile] = useAtom(customerProfileState);
  const [loading, setLoading] = useState(false);
  const [denied, setDenied] = useState(false);

  // Chỉ hiện nếu đã auth nhưng chưa có số điện thoại
  if (!profile || profile.mobile) return null;

  async function handleRequestPhone() {
    setLoading(true);
    setDenied(false);
    try {
      const { getPhoneNumber } = await import("zmp-sdk/apis");
      const { token: phoneToken } = await getPhoneNumber({});
      if (!phoneToken) {
        setDenied(true);
        return;
      }
      const accessToken = await getAccessToken();
      if (!accessToken) return;
      const result = await authenticate(accessToken, phoneToken);
      if (result.data?.user?.mobile) {
        setProfile(result.data.user);
        localStorage.setItem("jwt_token", result.data.token);
      } else {
        setDenied(true);
      }
    } catch {
      setDenied(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Bottom sheet */}
      <div className="relative w-full bg-white rounded-t-2xl px-6 pt-6 pb-10 flex flex-col items-center gap-4">
        <div className="w-10 h-1 bg-gray-200 rounded-full mb-2" />

        <div className="text-4xl">📱</div>

        <h2 className="text-lg font-semibold text-center text-gray-800">
          Cần xác nhận số điện thoại
        </h2>

        <p className="text-sm text-center text-gray-500 leading-relaxed">
          Vui lòng cấp quyền truy cập số điện thoại để tiếp tục sử dụng ứng
          dụng. Thông tin này giúp chúng tôi liên hệ khi cần thiết.
        </p>

        {denied && (
          <p className="text-sm text-red-500 text-center">
            Bạn chưa cấp quyền số điện thoại. Vui lòng thử lại.
          </p>
        )}

        <button
          onClick={handleRequestPhone}
          disabled={loading}
          className="w-full bg-primary text-white font-medium py-3 rounded-xl disabled:opacity-60"
        >
          {loading ? "Đang xử lý..." : "Cho phép truy cập số điện thoại"}
        </button>
      </div>
    </div>
  );
}
