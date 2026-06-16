import { useState } from "react";
import toast from "react-hot-toast";
import { Button, Input } from "zmp-ui";
import { AffiliateProfile, updateAffiliateBank } from "@/utils/affiliate";

interface Props {
  initial: { bank_name: string; bank_account: string; bank_holder: string };
  onUpdated: (profile: AffiliateProfile) => void;
}

export default function BankInfoForm({ initial, onUpdated }: Props) {
  const hasBankInfo = !!(initial.bank_name && initial.bank_account);
  const [editing, setEditing] = useState(!hasBankInfo);
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
        setEditing(false);
      }
    } catch (err: any) {
      toast.error(err?.message || "Cập nhật thất bại");
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    const maskedAccount =
      bankAccount.length > 4
        ? "****" + bankAccount.slice(-4)
        : bankAccount;

    return (
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">{bankName}</div>
          <div className="text-xs text-subtitle">
            {maskedAccount}
            {bankHolder ? ` · ${bankHolder}` : ""}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs text-primary underline ml-3 shrink-0"
        >
          Sửa
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={save} className="space-y-3">
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
      <div className="flex gap-2">
        {hasBankInfo && (
          <Button
            variant="secondary"
            onClick={() => setEditing(false)}
            className="flex-1"
          >
            Huỷ
          </Button>
        )}
        <Button
          htmlType="submit"
          loading={saving}
          disabled={saving}
          className="flex-1"
        >
          Lưu
        </Button>
      </div>
    </form>
  );
}
