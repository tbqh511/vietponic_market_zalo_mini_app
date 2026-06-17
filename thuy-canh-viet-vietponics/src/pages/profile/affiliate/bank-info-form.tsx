import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Button, Input, Sheet } from "zmp-ui";
import { AffiliateProfile, updateAffiliateBank } from "@/utils/affiliate";
import {
  BANKS,
  buildVietQrUrl,
  findBankByBin,
  findBankByNameLoose,
} from "@/utils/banks";

interface Props {
  initial: {
    bank_name: string;
    bank_bin: string;
    bank_account: string;
    bank_holder: string;
  };
  onUpdated: (profile: AffiliateProfile) => void;
}

// normalize không dấu để search
function norm(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export default function BankInfoForm({ initial, onUpdated }: Props) {
  // Nếu CTV cũ chỉ có bank_name text (chưa có bin) → thử preselect loose match
  const initBin = initial.bank_bin || findBankByNameLoose(initial.bank_name)?.bin || "";

  const hasBankInfo = !!initial.bank_account;
  const [editing, setEditing] = useState(!hasBankInfo);
  const [bankBin, setBankBin] = useState(initBin);
  const [bankAccount, setBankAccount] = useState(initial.bank_account);
  const [bankHolder, setBankHolder] = useState(initial.bank_holder);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedBank = findBankByBin(bankBin);

  const filteredBanks = useMemo(() => {
    const q = norm(search);
    if (!q) return BANKS;
    return BANKS.filter((b) =>
      norm(b.shortName).includes(q) ||
      norm(b.code).includes(q) ||
      norm(b.name).includes(q)
    );
  }, [search]);

  const qrUrl = buildVietQrUrl(bankBin, bankAccount, bankHolder);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bankAccount && !bankBin) {
      toast.error("Vui lòng chọn ngân hàng");
      return;
    }
    if (bankAccount && !/^\d{6,19}$/.test(bankAccount)) {
      toast.error("Số tài khoản phải là 6–19 chữ số");
      return;
    }
    if (bankAccount && !bankHolder.trim()) {
      toast.error("Vui lòng nhập tên chủ tài khoản");
      return;
    }
    setSaving(true);
    try {
      const updated = await updateAffiliateBank({
        bank_bin: bankBin,
        bank_account: bankAccount.trim(),
        bank_holder: bankHolder.trim(),
        bank_name: selectedBank?.shortName ?? "",
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

  // Màn hiển thị (không edit)
  if (!editing) {
    const displayName =
      selectedBank?.shortName || initial.bank_name || "—";
    const maskedAccount =
      bankAccount.length > 4 ? "****" + bankAccount.slice(-4) : bankAccount;

    return (
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">{displayName}</div>
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
    <>
      <form onSubmit={save} className="space-y-3">
        {/* Chọn ngân hàng */}
        <div>
          <div className="text-sm text-subtitle mb-1">Ngân hàng</div>
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="w-full flex items-center gap-2 border border-black/15 rounded-xl px-3 py-2.5 text-sm bg-background active:bg-gray-100"
          >
            {selectedBank?.logo && (
              <img
                src={selectedBank.logo}
                alt={selectedBank.shortName}
                className="w-6 h-6 object-contain rounded shrink-0"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            )}
            <span className={selectedBank ? "font-medium" : "text-subtitle"}>
              {selectedBank?.shortName ?? "Chọn ngân hàng"}
            </span>
            <span className="ml-auto text-subtitle">›</span>
          </button>
        </div>

        {/* Số tài khoản — bàn phím số */}
        <Input
          label="Số tài khoản"
          inputMode="numeric"
          value={bankAccount}
          onChange={(e) =>
            setBankAccount(e.target.value.replace(/\D/g, "").slice(0, 19))
          }
          placeholder="Chỉ nhập chữ số"
        />

        {/* Chủ tài khoản */}
        <Input
          label="Chủ tài khoản"
          value={bankHolder}
          onChange={(e) => setBankHolder(e.target.value)}
          placeholder="Họ tên IN HOA theo ngân hàng"
        />

        {/* Preview VietQR — hiện khi đủ thông tin */}
        {qrUrl && bankAccount.length >= 6 && (
          <div className="rounded-xl border border-black/10 bg-section p-3 flex flex-col items-center gap-2">
            <img
              src={qrUrl}
              alt="VietQR"
              className="w-40 h-40 object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).parentElement!.style.display =
                  "none";
              }}
            />
            <p className="text-2xs text-subtitle text-center">
              Đối chiếu tên & số TK trên mã QR khớp với tài khoản của bạn
            </p>
          </div>
        )}

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

      {/* Sheet chọn ngân hàng */}
      <Sheet
        visible={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
          setSearch("");
        }}
        autoHeight
      >
        <div className="px-4 pb-6 pt-2" style={{ maxHeight: "75vh" }}>
          <h3 className="font-semibold text-base mb-3">Chọn ngân hàng</h3>
          <Input
            placeholder="Tìm ngân hàng..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-3"
          />
          <div className="overflow-y-auto" style={{ maxHeight: "55vh" }}>
            {filteredBanks.map((bank) => (
              <button
                key={bank.bin}
                type="button"
                onClick={() => {
                  setBankBin(bank.bin);
                  setSheetOpen(false);
                  setSearch("");
                }}
                className={`w-full flex items-center gap-3 px-2 py-2.5 rounded-lg text-left active:bg-gray-100 ${
                  bankBin === bank.bin ? "bg-primary/8" : ""
                }`}
              >
                {bank.logo ? (
                  <img
                    src={bank.logo}
                    alt={bank.shortName}
                    className="w-8 h-8 object-contain rounded shrink-0"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display =
                        "none";
                    }}
                  />
                ) : (
                  <div className="w-8 h-8 rounded bg-gray-200 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {bank.shortName}
                  </div>
                  <div className="text-2xs text-subtitle truncate">
                    {bank.name}
                  </div>
                </div>
                {bankBin === bank.bin && (
                  <span className="text-primary shrink-0">✓</span>
                )}
              </button>
            ))}
            {filteredBanks.length === 0 && (
              <div className="text-sm text-subtitle text-center py-6">
                Không tìm thấy ngân hàng
              </div>
            )}
          </div>
        </div>
      </Sheet>
    </>
  );
}
