import { useState } from "react";
import toast from "react-hot-toast";
import { Button, Input } from "zmp-ui";
import { AffiliateProfile, updateAffiliateBank } from "@/utils/affiliate";

export default function BankInfoForm({
  initial,
  onUpdated,
}: {
  initial: { bank_name: string; bank_account: string; bank_holder: string };
  onUpdated: (profile: AffiliateProfile) => void;
}) {
  const [bankName, setBankName] = useState(initial.bank_name);
  const [bankAccount, setBankAccount] = useState(initial.bank_account);
  const [bankHolder, setBankHolder] = useState(initial.bank_holder);
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await updateAffiliateBank({
        bank_name: bankName.trim(),
        bank_account: bankAccount.trim(),
        bank_holder: bankHolder.trim(),
      });
      if (updated) {
        onUpdated(updated);
        toast.success("Đã cập nhật thông tin nhận tiền");
      }
    } catch (err: any) {
      toast.error(err?.message || "Cập nhật thất bại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="bg-section rounded-lg p-4 border-[0.5px] border-black/15 space-y-3">
      <div className="text-sm font-medium">Thông tin nhận hoa hồng</div>
      <Input
        label="Tên ngân hàng"
        value={bankName}
        onChange={(e) => setBankName(e.target.value)}
        placeholder="Vietcombank, ACB, ..."
      />
      <Input
        label="Số tài khoản"
        value={bankAccount}
        onChange={(e) => setBankAccount(e.target.value)}
        placeholder="Số tài khoản"
      />
      <Input
        label="Chủ tài khoản"
        value={bankHolder}
        onChange={(e) => setBankHolder(e.target.value)}
        placeholder="Họ tên chủ tài khoản"
      />
      <Button htmlType="submit" fullWidth loading={saving} disabled={saving}>
        Lưu thông tin
      </Button>
    </form>
  );
}
