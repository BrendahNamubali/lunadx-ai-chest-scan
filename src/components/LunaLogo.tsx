import logoAsset from "@/assets/lunadx-logo.png.asset.json";
import { cn } from "@/lib/utils";

/**
 * Official LunaDX mark. Rendered unmodified on a light surface so it stays
 * legible on both light and dark backgrounds.
 */
export default function LunaLogo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-lg bg-primary-foreground flex items-center justify-center overflow-hidden shrink-0",
        className ?? "w-9 h-9",
      )}
    >
      <img src={logoAsset.url} alt="LunaDX logo" className="w-full h-full object-contain p-[8%]" />
    </div>
  );
}
