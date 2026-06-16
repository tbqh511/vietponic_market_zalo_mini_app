import { useState } from "react";
import { Icon } from "zmp-ui";

interface Props {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export default function CollapsibleSection({
  title,
  subtitle,
  defaultOpen = false,
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-section rounded-lg border-[0.5px] border-black/15 overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between p-4 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <div>
          <div className="text-sm font-medium">{title}</div>
          {subtitle && (
            <div className="text-2xs text-subtitle mt-0.5">{subtitle}</div>
          )}
        </div>
        <Icon
          icon="zi-chevron-down"
          className={
            "text-subtitle transition-transform duration-200 " +
            (open ? "rotate-180" : "")
          }
        />
      </button>
      {open && <div className="border-t border-black/8">{children}</div>}
    </div>
  );
}
