import { Button } from "zmp-ui";
import { MinusIcon, PlusIcon } from "./vectors";
import { useEffect, useState } from "react";

export interface QuantityInputProps {
  value: number;
  onChange: (value: number) => void;
  minValue?: number;
  /**
   * Cap số lượng theo tồn kho (STOCK-04). `undefined` = không biết tồn (mock/offline)
   * → không cap (giữ behaviour cũ). Khi đạt max thì disable nút "+" và hiện "Còn lại X".
   */
  maxValue?: number;
}

export default function QuantityInput(props: QuantityInputProps) {
  const [localValue, setLocalValue] = useState(String(props.value));

  // Chỉ cap khi backend khẳng định tồn là số hữu hạn.
  const hasCap =
    typeof props.maxValue === "number" && Number.isFinite(props.maxValue);
  const clamp = (n: number) => {
    const lower = Math.max(props.minValue ?? 0, n);
    return hasCap ? Math.min(props.maxValue!, lower) : lower;
  };
  const atMax = hasCap && props.value >= props.maxValue!;

  useEffect(() => {
    setLocalValue(String(props.value));
  }, [props.value]);

  return (
    <div className="w-full">
      <div className="flex items-center">
        <Button
          size="small"
          variant="tertiary"
          className="min-w-0 aspect-square"
          onClick={() => props.onChange(clamp(props.value - 1))}
        >
          <MinusIcon width={14} height={14} />
        </Button>
        <input
          style={{ width: `calc(${String(props.value).length}ch + 16px)` }}
          className="flex-1 text-center font-medium text-xs px-2 focus:outline-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          type="number"
          inputMode="numeric"
          value={localValue}
          onChange={(e) => setLocalValue(e.currentTarget.value)}
          onBlur={() => props.onChange(clamp(Number(localValue)))}
        />
        <Button
          size="small"
          variant="tertiary"
          className="min-w-0 aspect-square"
          disabled={atMax}
          onClick={() => props.onChange(clamp(props.value + 1))}
        >
          <PlusIcon width={14} height={14} />
        </Button>
      </div>
      {atMax && (
        <div className="text-3xs text-subtitle text-center mt-0.5">
          Còn lại {props.maxValue}
        </div>
      )}
    </div>
  );
}
