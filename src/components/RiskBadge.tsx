import { cn } from "@/lib/utils";

export default function RiskBadge({ level }: { level: "Low" | "Medium" | "High" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
        level === "Low" && "bg-success/10 text-success",
        level === "Medium" && "bg-warning/10 text-warning",
        level === "High" && "bg-destructive/10 text-destructive"
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          level === "Low" && "bg-success",
          level === "Medium" && "bg-warning",
          level === "High" && "bg-destructive animate-pulse-soft"
        )}
      />
      {level} Risk
    </span>
  );
}
