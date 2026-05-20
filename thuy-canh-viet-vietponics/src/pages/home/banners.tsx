import Carousel from "@/components/carousel";
import { useAtomValue, useSetAtom } from "jotai";
import { useEffect } from "react";
import { bannersState, bannersRefresh } from "@/state";

const FALLBACK_ASPECT = "1312 / 708";

export default function Banners() {
  const banners = useAtomValue(bannersState);
  const refresh = useSetAtom(bannersRefresh);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (banners.length === 0) {
    return (
      <div className="bg-section">
        <div
          className="mt-2 mx-4 rounded bg-skeleton animate-pulse"
          style={{ aspectRatio: FALLBACK_ASPECT }}
        />
      </div>
    );
  }

  return (
    <div className="bg-section">
      <Carousel
        slides={banners.map((b, i) => {
          const ratio =
            b.intrinsic_width && b.intrinsic_height
              ? `${b.intrinsic_width} / ${b.intrinsic_height}`
              : FALLBACK_ASPECT;
          return (
            <div
              key={i}
              className="w-full rounded overflow-hidden bg-skeleton"
              style={{ aspectRatio: ratio }}
            >
              <img
                src={b.image}
                alt=""
                className="w-full h-full object-cover"
                width={b.intrinsic_width}
                height={b.intrinsic_height}
                loading={i === 0 ? "eager" : "lazy"}
                {...({ fetchpriority: i === 0 ? "high" : "low" } as any)}
                decoding="async"
              />
            </div>
          );
        })}
      />
    </div>
  );
}
