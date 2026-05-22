import {
  shippingAddressState,
  loadableUserInfoState,
  vtpProvincesState,
  vtpWardsState,
  selectedShippingServiceState,
} from "@/state";
import { VtpLocation } from "@/types";
import { request } from "@/utils/request";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useResetAtom } from "jotai/utils";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { Button, Icon, Input } from "zmp-ui";

// ── Custom searchable location picker ────────────────────────────────────────

interface LocationPickerProps {
  label: string;
  placeholder: string;
  selected: VtpLocation | null;
  items: VtpLocation[];
  loading?: boolean;
  disabled?: boolean;
  onSelect: (item: VtpLocation) => void;
}

function LocationPicker({
  label,
  placeholder,
  selected,
  items,
  loading,
  disabled,
  onSelect,
}: LocationPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = query.trim()
    ? items.filter((item) =>
        item.name.toLowerCase().includes(query.trim().toLowerCase())
      )
    : items;

  const handleOpen = () => {
    if (disabled || loading) return;
    setQuery("");
    setOpen(true);
    setTimeout(() => searchRef.current?.focus(), 100);
  };

  const handleSelect = (item: VtpLocation) => {
    onSelect(item);
    setOpen(false);
    setQuery("");
  };

  const displayValue = loading
    ? "Đang tải..."
    : disabled
    ? "Chọn tỉnh/thành trước"
    : selected?.name ?? placeholder;

  return (
    <>
      {/* Trigger button */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">
          {label}
        </label>
        <button
          type="button"
          onClick={handleOpen}
          disabled={disabled || loading}
          className={[
            "w-full flex items-center justify-between px-3 py-3 rounded-xl border text-left transition-colors",
            disabled || loading
              ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-white border-gray-300 text-gray-800 active:border-primary",
          ].join(" ")}
        >
          <span className={selected ? "text-gray-900" : "text-gray-400"}>
            {displayValue}
          </span>
          {loading ? (
            <span className="text-xs text-gray-400">...</span>
          ) : (
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Bottom sheet overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />

          {/* Sheet */}
          <div className="relative bg-white rounded-t-2xl flex flex-col max-h-[75vh] shadow-xl">
            {/* Header */}
            <div className="px-4 pt-4 pb-3 border-b border-gray-100">
              <p className="text-center text-xs text-gray-400 mb-3">
                ── Kéo xuống để đóng ──
              </p>
              <p className="text-base font-semibold text-gray-900 text-center mb-3">
                {label}
              </p>

              {/* Search box */}
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm kiếm..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-primary"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {filtered.length > 0 && (
                <p className="text-xs text-gray-400 mt-2 text-right">
                  {filtered.length} kết quả
                </p>
              )}
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1">
              {filtered.length === 0 ? (
                <div className="py-12 text-center text-gray-400 text-sm">
                  Không tìm thấy kết quả
                </div>
              ) : (
                filtered.map((item) => {
                  const isActive = selected?.id === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelect(item)}
                      className={[
                        "w-full text-left px-4 py-3.5 text-sm border-b border-gray-50 flex items-center justify-between transition-colors",
                        isActive
                          ? "bg-green-50 text-green-700 font-medium"
                          : "text-gray-800 active:bg-gray-50",
                      ].join(" ")}
                    >
                      <span>{item.name}</span>
                      {isActive && (
                        <svg
                          className="w-4 h-4 text-green-600 flex-shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Close button — tách biệt hẳn với nút X của Zalo */}
            <div className="p-4 pb-8 border-t border-gray-100 bg-white">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-full py-3 rounded-xl bg-gray-100 text-gray-700 font-medium text-sm active:bg-gray-200 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

function ShippingAddressPage() {
  const [address, setAddress] = useAtom(shippingAddressState);
  const resetAddress = useResetAtom(shippingAddressState);
  const navigate = useNavigate();
  const userInfoLoadable = useAtomValue(loadableUserInfoState);
  const setSelectedService = useSetAtom(selectedShippingServiceState);

  const [provinces, setProvinces] = useAtom(vtpProvincesState);
  const [wards, setWards] = useAtom(vtpWardsState);

  const [selectedProvince, setSelectedProvince] = useState<VtpLocation | null>(
    address?.province_id
      ? { id: address.province_id, name: address.province_name ?? "" }
      : null
  );
  const [selectedWard, setSelectedWard] = useState<VtpLocation | null>(
    address?.ward_id
      ? { id: address.ward_id, name: address.ward_name ?? "" }
      : null
  );

  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);

  useEffect(() => {
    if (provinces.length > 0) return;
    setLoadingProvinces(true);
    request<any>("/locations/provinces")
      .then((res) => {
        const data: VtpLocation[] = res?.data ?? res ?? [];
        setProvinces(data);
      })
      .catch(() => toast.error("Không tải được danh sách tỉnh/thành"))
      .finally(() => setLoadingProvinces(false));
  }, []);

  useEffect(() => {
    if (!selectedProvince) {
      setWards([]);
      return;
    }
    setLoadingWards(true);
    setWards([]);
    request<any>(`/locations/wards?province_id=${selectedProvince.id}`)
      .then((res) => {
        const data: VtpLocation[] = res?.data ?? res ?? [];
        setWards(data);
      })
      .catch(() => toast.error("Không tải được danh sách phường/xã"))
      .finally(() => setLoadingWards(false));
  }, [selectedProvince?.id]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedProvince || !selectedWard) {
      toast.error("Vui lòng chọn Tỉnh/Thành và Phường/Xã");
      return;
    }

    const data = new FormData(e.currentTarget);
    const newAddress = {
      alias: (data.get("alias") as string) ?? "",
      address: (data.get("address") as string) ?? "",
      name: (data.get("name") as string) ?? "",
      phone: (data.get("phone") as string) ?? "",
      province_id: selectedProvince.id,
      district_id: selectedWard.district_id ?? undefined,
      ward_id: selectedWard.id,
      province_name: selectedProvince.name,
      district_name: undefined,
      ward_name: selectedWard.name,
    };

    setAddress(newAddress);
    setSelectedService(null);
    toast.success("Đã cập nhật địa chỉ");
    navigate(-1);
  };

  return (
    <form className="h-full flex flex-col justify-between" onSubmit={handleSubmit}>
      <div className="py-2 space-y-2">
        {/* Thông tin người nhận */}
        <div className="bg-section p-4 grid gap-4">
          <Input
            name="name"
            label="Tên người nhận"
            placeholder="Nhập tên người nhận"
            defaultValue={
              address?.name ||
              (userInfoLoadable.state === "hasData"
                ? userInfoLoadable.data?.name
                : "") ||
              ""
            }
          />
          <Input
            name="phone"
            label="Số điện thoại"
            placeholder="0912345678"
            defaultValue={
              address?.phone ||
              (userInfoLoadable.state === "hasData"
                ? userInfoLoadable.data?.phone
                : "") ||
              ""
            }
          />
        </div>

        {/* Địa chỉ giao hàng */}
        <div className="bg-section p-4 grid gap-4">
          <LocationPicker
            label="Tỉnh / Thành phố *"
            placeholder="Chọn tỉnh/thành"
            selected={selectedProvince}
            items={provinces}
            loading={loadingProvinces}
            onSelect={(prov) => {
              setSelectedProvince(prov);
              setSelectedWard(null);
            }}
          />

          <LocationPicker
            label="Phường / Xã *"
            placeholder="Chọn phường/xã"
            selected={selectedWard}
            items={wards}
            loading={loadingWards}
            disabled={!selectedProvince}
            onSelect={setSelectedWard}
          />

          <Input
            name="address"
            label={
              <>
                Số nhà, tên đường <span className="text-danger">*</span>
              </>
            }
            placeholder="Ví dụ: 123 Nguyễn Huệ"
            required
            defaultValue={address?.address}
            onInvalid={(e) => {
              e.currentTarget.setCustomValidity("Vui lòng nhập số nhà, tên đường");
              e.currentTarget.reportValidity();
            }}
            onInput={(e) => e.currentTarget.setCustomValidity("")}
          />

          <Input
            name="alias"
            label="Tên địa chỉ (tuỳ chọn)"
            placeholder="Ví dụ: nhà riêng, công ty"
            defaultValue={address?.alias}
          />
        </div>

        <Button
          fullWidth
          className="!bg-section !text-danger !rounded-none"
          type="danger"
          prefixIcon={<Icon icon="zi-delete" />}
          onClick={() => {
            resetAddress();
            setSelectedService(null);
            toast.success("Đã xóa địa chỉ");
            navigate(-1);
          }}
        >
          Xóa địa chỉ này
        </Button>
      </div>

      <div className="p-6 pt-4 bg-section">
        <Button htmlType="submit" fullWidth>
          Xong
        </Button>
      </div>
    </form>
  );
}

export default ShippingAddressPage;
