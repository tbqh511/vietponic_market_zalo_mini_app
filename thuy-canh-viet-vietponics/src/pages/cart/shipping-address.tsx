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
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { Button, Icon, Input, Select } from "zmp-ui";

function ShippingAddressPage() {
  const [address, setAddress] = useAtom(shippingAddressState);
  const resetAddress = useResetAtom(shippingAddressState);
  const navigate = useNavigate();
  const userInfoLoadable = useAtomValue(loadableUserInfoState);
  const setSelectedService = useSetAtom(selectedShippingServiceState);

  // ── Location cascading state (v3: 2 cấp Tỉnh/TP → Phường/Xã) ────────────
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

  // Fetch provinces một lần khi mount (cache ở atom)
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

  // Fetch wards khi province thay đổi (v3: query theo province_id)
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
    // Khi địa chỉ thay đổi, reset dịch vụ ship đã chọn để buộc estimate lại
    setSelectedService(null);
    toast.success("Đã cập nhật địa chỉ");
    navigate(-1);
  };

  return (
    <form className="h-full flex flex-col justify-between" onSubmit={handleSubmit}>
      <div className="py-2 space-y-2">
        {/* ── Thông tin người nhận ── */}
        <div className="bg-section p-4 grid gap-4">
          <Input
            name="name"
            label="Tên người nhận"
            placeholder="Nhập tên người nhận"
            defaultValue={address?.name}
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

        {/* ── Địa chỉ giao hàng (2 cấp + chi tiết) ── */}
        <div className="bg-section p-4 grid gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Tỉnh / Thành phố <span className="text-danger">*</span>
            </label>
            <Select
              placeholder={
                loadingProvinces ? "Đang tải..." : "Chọn tỉnh/thành"
              }
              value={selectedProvince?.id?.toString() ?? ""}
              onChange={(val) => {
                const prov = provinces.find((p) => p.id === Number(val)) ?? null;
                setSelectedProvince(prov);
                setSelectedWard(null);
              }}
            >
              {provinces.map((p) => (
                <Select.Option key={p.id} value={p.id.toString()} title={p.name} />
              ))}
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Phường / Xã <span className="text-danger">*</span>
            </label>
            <Select
              placeholder={
                !selectedProvince
                  ? "Chọn tỉnh/thành trước"
                  : loadingWards
                  ? "Đang tải..."
                  : "Chọn phường/xã"
              }
              value={selectedWard?.id?.toString() ?? ""}
              onChange={(val) => {
                const ward = wards.find((w) => w.id === Number(val)) ?? null;
                setSelectedWard(ward);
              }}
              disabled={!selectedProvince || loadingWards}
            >
              {wards.map((w) => (
                <Select.Option key={w.id} value={w.id.toString()} title={w.name} />
              ))}
            </Select>
          </div>

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
              e.currentTarget.setCustomValidity(
                "Vui lòng nhập số nhà, tên đường"
              );
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
