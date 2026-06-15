import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAtomValue, useSetAtom } from "jotai";
import toast from "react-hot-toast";
import { customerProfileState, farmPartnerStatusState } from "@/state";
import { useEnsureJwt } from "@/hooks";
import { requestFarmPartnership } from "@/utils/farm-api";

// Form đăng ký trở thành Farm Partner.
// - Đã approved → redirect /farm
// - Đang chờ duyệt ('requested') → redirect /profile (FarmEntryCard sẽ hiện trạng thái chờ)
export default function FarmRegisterPage() {
  const navigate = useNavigate();
  const profile = useAtomValue(customerProfileState);
  const setProfile = useSetAtom(customerProfileState);
  const farmPartnerStatus = useAtomValue(farmPartnerStatusState);
  const ensureJwt = useEnsureJwt();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    ensureJwt();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (profile?.is_farm_partner) {
      navigate("/farm", { replace: true });
    } else if (farmPartnerStatus === "requested") {
      navigate("/profile", { replace: true });
    }
  }, [profile, farmPartnerStatus, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim()) {
      toast.error("Vui lòng nhập tên farm và địa chỉ.");
      return;
    }
    setSubmitting(true);
    try {
      await requestFarmPartnership({
        name: name.trim(),
        address: address.trim(),
        description: description.trim() || undefined,
      });
      // Optimistic update: cập nhật profile atom ngay để FarmEntryCard hiện "Đang chờ duyệt".
      if (profile) {
        setProfile({ ...profile, farm_partner_status: "requested" });
      }
      toast.success("Đã gửi yêu cầu. Vietponics sẽ liên hệ duyệt trong 1-3 ngày.", {
        duration: 5000,
      });
      navigate("/profile", { replace: true });
    } catch (err: any) {
      const status = err?.status;
      // 409: đã gửi yêu cầu trước đó (guard BE)
      if (status === 409) {
        const msg = err?.body
          ? (() => {
              try { return JSON.parse(err.body).message; } catch { return null; }
            })()
          : null;
        toast(msg || "Yêu cầu đã được gửi, đang chờ xét duyệt.", {
          icon: "ℹ️",
          duration: 5000,
        });
        navigate("/profile", { replace: true });
        return;
      }
      toast.error("Gửi yêu cầu thất bại. Vui lòng thử lại sau.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-gray-100">
      <div className="m-3 p-4 bg-white rounded-lg border border-gray-200">
        <h2 className="text-base font-semibold mb-1">Trở thành Farm Partner</h2>
        <p className="text-[12px] text-gray-500 mb-4 leading-relaxed">
          Vietponics phân phối rau sạch cho farm đối tác. Đăng ký để bán sản phẩm
          của bạn trên Mini App. Sau khi gửi, đội Vietponics sẽ liên hệ duyệt.
        </p>

        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div>
            <label className="block text-[12px] font-medium mb-1">
              Tên farm <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Joiley Farm"
              className="w-full border border-gray-300 rounded px-2.5 py-2 text-[13px]"
              maxLength={120}
              required
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium mb-1">
              Địa chỉ <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="VD: Đà Lạt, Lâm Đồng"
              className="w-full border border-gray-300 rounded px-2.5 py-2 text-[13px]"
              maxLength={200}
              required
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium mb-1">Mô tả ngắn</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Quy mô, loại rau chính, năng suất ước tính..."
              className="w-full border border-gray-300 rounded px-2.5 py-2 text-[13px] resize-none"
              rows={4}
              maxLength={500}
            />
            <div className="text-[10px] text-gray-400 mt-1 text-right">
              {description.length} / 500
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="bg-primary text-white rounded py-2.5 text-[13px] font-medium disabled:opacity-50"
          >
            {submitting ? "Đang gửi..." : "Gửi yêu cầu"}
          </button>
        </form>
      </div>
    </div>
  );
}
