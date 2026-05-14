import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "zmp-ui";
import {
  AffiliateProfile,
  fetchAffiliateProfile,
  registerAffiliate,
} from "@/utils/affiliate";
import { useEnsureJwt } from "@/hooks";
import ReferralLinkCard from "./referral-link-card";
import ReferralQRCard from "./referral-qr-card";
import CommissionSummary from "./commission-summary";
import CommissionList from "./commission-list";
import ReferralsList from "./referrals-list";
import LockedInfoNotice from "./locked-info-notice";
import BankInfoForm from "./bank-info-form";

export default function AffiliatePage() {
  const ensureJwt = useEnsureJwt();
  const [profile, setProfile] = useState<AffiliateProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const token = await ensureJwt();
      if (!token) {
        if (!cancelled) {
          setError("Không thể xác thực với Zalo. Vui lòng thử lại.");
          setLoading(false);
        }
        return;
      }
      try {
        const data = await fetchAffiliateProfile();
        if (!cancelled) setProfile(data);
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "Không thể tải thông tin cộng tác viên.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRegister = async () => {
    setRegistering(true);
    try {
      const token = await ensureJwt();
      if (!token) {
        toast.error("Cần đăng nhập Zalo trước.");
        return;
      }
      const updated = await registerAffiliate();
      if (updated) {
        setProfile(updated);
        toast.success(
          updated.affiliate_status === "approved"
            ? "Đăng ký thành công!"
            : "Đăng ký thành công, đang chờ duyệt."
        );
      }
    } catch (e: any) {
      toast.error(e?.message || "Đăng ký thất bại.");
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-subtitle">Đang tải...</div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-danger">{error}</div>
    );
  }

  if (!profile?.is_registered) {
    return (
      <div className="p-4 space-y-4">
        <div className="bg-section rounded-lg p-6 text-center space-y-2 border-[0.5px] border-black/15">
          <div className="text-lg font-semibold">Trở thành Cộng tác viên</div>
          <p className="text-sm text-subtitle">
            Giới thiệu bạn bè đặt hàng tại Vietponics — nhận{" "}
            <strong className="text-primary">
              {profile?.commission_rate ?? 5}%
            </strong>{" "}
            hoa hồng trên mọi đơn của họ.
          </p>
          <Button
            fullWidth
            onClick={handleRegister}
            loading={registering}
            disabled={registering}
          >
            Đăng ký ngay
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="bg-section rounded-lg p-4 border-[0.5px] border-black/15">
        <div className="text-sm text-subtitle">Mã giới thiệu</div>
        <div className="text-2xl font-bold tracking-wider mt-1 text-primary">
          {profile.affiliate_code}
        </div>
        <div className="text-xs text-subtitle mt-1">
          Trạng thái:{" "}
          <span className="font-medium">
            {labelForStatus(profile.affiliate_status)}
          </span>
          {" · "}
          {profile.referrals_count} khách đã giới thiệu
        </div>
      </div>

      {profile.locked && <LockedInfoNotice />}

      <CommissionSummary stats={profile.commission_stats} />

      {profile.share_url && <ReferralLinkCard url={profile.share_url} />}
      {profile.share_url && <ReferralQRCard url={profile.share_url} />}

      <BankInfoForm
        initial={{
          bank_name: profile.bank_name ?? "",
          bank_account: profile.bank_account ?? "",
          bank_holder: profile.bank_holder ?? "",
        }}
        onUpdated={(p) => setProfile(p)}
      />

      <ReferralsList />

      <CommissionList />
    </div>
  );
}

function labelForStatus(status: string | null): string {
  switch (status) {
    case "approved":
      return "Đã duyệt";
    case "pending":
      return "Chờ duyệt";
    case "suspended":
      return "Tạm khoá";
    case "rejected":
      return "Từ chối";
    default:
      return "—";
  }
}
