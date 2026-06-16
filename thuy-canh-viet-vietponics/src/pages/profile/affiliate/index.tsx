import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Button, Icon } from "zmp-ui";
import {
  AffiliateProfile,
  fetchAffiliateProfile,
  registerAffiliate,
} from "@/utils/affiliate";
import { useEnsureJwt } from "@/hooks";
import CommissionSummary from "./commission-summary";
import CommissionList from "./commission-list";
import ReferralsList from "./referrals-list";
import BankInfoForm from "./bank-info-form";
import InviteCard from "./invite-card";
import CollapsibleSection from "./collapsible-section";
import ReferralShareButton from "./referral-share-button";

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
        if (!cancelled)
          setError(e?.message || "Không thể tải thông tin cộng tác viên.");
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

  const copyLink = async () => {
    if (!profile?.share_url) return;
    try {
      await navigator.clipboard.writeText(profile.share_url);
      toast.success("Đã copy link giới thiệu");
    } catch {
      toast.error("Không thể copy.");
    }
  };

  if (loading) {
    return <div className="p-4 text-center text-subtitle">Đang tải...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-danger">{error}</div>;
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

  const statusConfig = statusMeta(profile.affiliate_status);
  const hasBankInfo = !!(profile.bank_name && profile.bank_account);

  return (
    <div className="p-4 space-y-3 pb-8">
      {/* Hero card */}
      <div className="bg-section rounded-lg p-4 border-[0.5px] border-black/15 space-y-3">
        {/* Status + code row */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <span
              className={
                "inline-block text-2xs font-medium px-2 py-0.5 rounded-full " +
                statusConfig.className
              }
            >
              {statusConfig.label}
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-bold tracking-wider text-primary">
                {profile.affiliate_code}
              </span>
              <button
                type="button"
                onClick={copyLink}
                className="text-subtitle active:opacity-60"
              >
                <Icon icon="zi-copy" />
              </button>
            </div>
          </div>
          <div className="text-right text-xs text-subtitle shrink-0">
            <div className="font-medium text-sm text-primary">
              {profile.commission_rate}% hoa hồng
            </div>
            <div>{profile.referrals_count} khách đã giới thiệu</div>
          </div>
        </div>

        {profile.locked && (
          <p className="text-2xs text-yellow-800 bg-yellow-50 rounded px-2 py-1.5 border border-yellow-200">
            Thông tin đăng ký đã khoá. Liên hệ admin để thay đổi.
          </p>
        )}

        {/* Action buttons */}
        {profile.share_url && (
          <div className="flex gap-2 pt-1">
            <ReferralShareButton
              code={profile.affiliate_code ?? ""}
              refUrl={profile.share_url}
            />
            <button
              type="button"
              onClick={copyLink}
              className="flex-1 flex items-center justify-center gap-1.5 border border-primary/30 text-primary rounded-lg py-2 text-sm font-medium active:opacity-70"
            >
              <Icon icon="zi-copy" />
              Copy link
            </button>
          </div>
        )}
      </div>

      {/* Commission summary */}
      <CommissionSummary stats={profile.commission_stats} />

      {/* Invite section */}
      {profile.share_url && (
        <CollapsibleSection title="Mời bạn bè" defaultOpen={false}>
          <div className="p-4">
            <InviteCard
              url={profile.share_url}
              affiliateCode={profile.affiliate_code ?? ""}
            />
          </div>
        </CollapsibleSection>
      )}

      {/* Bank info */}
      <CollapsibleSection
        title="Tài khoản nhận tiền"
        subtitle={hasBankInfo ? undefined : "Chưa thiết lập"}
        defaultOpen={!hasBankInfo}
      >
        <div className="p-4">
          <BankInfoForm
            initial={{
              bank_name: profile.bank_name ?? "",
              bank_account: profile.bank_account ?? "",
              bank_holder: profile.bank_holder ?? "",
            }}
            onUpdated={(p) => setProfile(p)}
          />
        </div>
      </CollapsibleSection>

      {/* Referrals */}
      <CollapsibleSection
        title="Khách đã giới thiệu"
        subtitle={`${profile.referrals_count} người`}
        defaultOpen={false}
      >
        <div className="p-4 pt-2">
          <ReferralsList />
        </div>
      </CollapsibleSection>

      {/* Commission history */}
      <CollapsibleSection title="Lịch sử hoa hồng" defaultOpen={false}>
        <div className="p-4 pt-2">
          <CommissionList />
        </div>
      </CollapsibleSection>
    </div>
  );
}

function statusMeta(status: string | null): {
  label: string;
  className: string;
} {
  switch (status) {
    case "approved":
      return {
        label: "Đã duyệt",
        className: "bg-green-100 text-green-800",
      };
    case "pending":
      return {
        label: "Chờ duyệt",
        className: "bg-yellow-100 text-yellow-800",
      };
    case "suspended":
      return {
        label: "Tạm khoá",
        className: "bg-orange-100 text-orange-800",
      };
    case "rejected":
      return {
        label: "Từ chối",
        className: "bg-red-100 text-red-800",
      };
    default:
      return { label: "—", className: "bg-gray-100 text-gray-600" };
  }
}
