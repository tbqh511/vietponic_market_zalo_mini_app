import { selectedShippingServiceState } from "@/state";
import { ShippingService } from "@/types";
import { formatPrice } from "@/utils/format";
import { useAtom } from "jotai";

interface Props {
  services: ShippingService[];
  loading: boolean;
}

export default function ShippingMethodPicker({ services, loading }: Props) {
  const [selected, setSelected] = useAtom(selectedShippingServiceState);

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-16 rounded-lg bg-gray-100 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (services.length === 0) return null;

  return (
    <div className="space-y-2">
      {services.map((svc) => {
        const isSelected = selected?.service_code === svc.service_code;
        return (
          <button
            key={svc.service_code}
            type="button"
            onClick={() => setSelected(svc)}
            className={[
              "w-full text-left rounded-lg border px-4 py-3 flex items-center justify-between transition-colors",
              isSelected
                ? "border-primary bg-primary/5"
                : "border-gray-200 bg-white",
            ].join(" ")}
          >
            <div className="flex items-center gap-3">
              {/* Radio indicator */}
              <span
                className={[
                  "w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center",
                  isSelected ? "border-primary" : "border-gray-300",
                ].join(" ")}
              >
                {isSelected && (
                  <span className="w-2 h-2 rounded-full bg-primary" />
                )}
              </span>

              <div>
                <p className="text-sm font-medium leading-tight">
                  {svc.service_name}
                </p>
                {svc.kpi_ht && (
                  <p className="text-xs text-inactive mt-0.5">
                    Dự kiến: {svc.kpi_ht}
                  </p>
                )}
              </div>
            </div>

            <span
              className={[
                "text-sm font-semibold flex-shrink-0",
                isSelected ? "text-primary" : "text-gray-700",
              ].join(" ")}
            >
              {formatPrice(svc.total_fee)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
