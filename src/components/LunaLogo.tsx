import { Link } from "react-router-dom";
import logoAsset from "@/assets/lunadx-logo.png.asset.json";
import logoLightAsset from "@/assets/lunadx-logo-light.png.asset.json";
import { cn } from "@/lib/utils";
import { useAuth, dashboardPathFor } from "@/lib/auth";

type LunaLogoProps = {
  className?: string;
  /** "dark" renders the navy mark (light surfaces), "light" the white mark (dark surfaces). */
  variant?: "dark" | "light";
  /** When true, wraps the mark in a role-aware home link. */
  asLink?: boolean;
  /** Home path used when there is no role-based session (defaults to "/"). */
  fallbackTo?: string;
};

/** Official LunaDX mark, transparent — no container, border or shadow. */
export default function LunaLogo({ className, variant = "dark", asLink, fallbackTo = "/" }: LunaLogoProps) {
  const asset = variant === "light" ? logoLightAsset : logoAsset;
  const img = (
    <img
      src={asset.url}
      alt="LunaDX logo"
      className={cn("object-contain shrink-0 select-none", className ?? "w-9 h-9")}
    />
  );

  if (!asLink) return img;
  return <LunaLogoLink fallbackTo={fallbackTo}>{img}</LunaLogoLink>;
}

function LunaLogoLink({ children, fallbackTo }: { children: React.ReactNode; fallbackTo: string }) {
  const { session, role } = useAuth();
  const to = session && role ? dashboardPathFor(role) : fallbackTo;
  return (
    <Link to={to} aria-label="LunaDX home" className="cursor-pointer shrink-0">
      {children}
    </Link>
  );
}
