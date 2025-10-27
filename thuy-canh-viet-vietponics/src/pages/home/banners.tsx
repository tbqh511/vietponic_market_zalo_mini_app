import Carousel from "@/components/carousel";
import { useAtomValue } from "jotai";
import { bannersState } from "@/state";

export default function Banners() {
  const banners = useAtomValue(bannersState);

  // // Debug: log the raw banners value (set localStorage.DEBUG_API = '1' to enable request logging)
  // if (typeof window !== "undefined" && (localStorage.getItem("DEBUG_API") === "1" || /localhost|127\.0\.0\.1/.test(window.location.hostname))) {
  //   console.debug("banners raw:", banners);
  // }

  // Normalize banners: accept array of strings or array of objects with common image fields
  const slides: string[] = [];
  if (Array.isArray(banners)) {
    for (const item of banners as any[]) {
      if (typeof item === "string") {
        slides.push(item);
      } else if (item && typeof item === "object") {
        const src = (item as any).image || (item as any).url || (item as any).src || (item as any).path;
        if (typeof src === "string") slides.push(src);
        else {
          // fallback: push empty string so UI doesn't crash; developer can enable DEBUG to inspect
          slides.push("");
        }
      }
    }
  }

  return <Carousel slides={slides.map((s) => <img className="w-full rounded" src={s} />)} />;
}
