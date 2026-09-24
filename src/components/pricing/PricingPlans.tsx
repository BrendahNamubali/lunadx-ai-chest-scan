import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatPlanPrice, isCustomPriced, type DisplayCurrency, type Plan } from "@/lib/pricing";

export function CurrencyToggle({ value, onChange }: { value: DisplayCurrency; onChange: (c: DisplayCurrency) => void }) {
  return (
    <div role="radiogroup" aria-label="Display currency" className="inline-flex rounded-full border border-border bg-muted p-1 text-xs font-medium">
      {(["UGX", "USD"] as const).map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          onClick={() => onChange(c)}
          className={`px-4 py-1.5 rounded-full transition-colors ${
            value === c ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {c}
        </button>
      ))}
    </div>
  );
}

interface PricingPlansProps {
  plans: Plan[];
  currency: DisplayCurrency;
  highlightSlug?: string;
  currentSlug?: string;
  renderAction: (plan: Plan) => ReactNode;
}

export function PricingPlans({ plans, currency, highlightSlug = "professional", currentSlug, renderAction }: PricingPlansProps) {
  return (
    <div className={`grid gap-6 ${plans.length >= 3 ? "lg:grid-cols-3" : "sm:grid-cols-2"}`}>
      {plans.map((plan) => {
        const highlighted = plan.slug === highlightSlug;
        const custom = isCustomPriced(plan);
        return (
          <div
            key={plan.id}
            className={`relative flex flex-col rounded-2xl border bg-card p-6 ${
              highlighted ? "border-primary shadow-lg ring-1 ring-primary/20" : "border-border"
            }`}
          >
            {highlighted && (
              <Badge className="absolute -top-3 left-6">Most popular</Badge>
            )}
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className="font-semibold text-foreground">{plan.name}</h3>
              {plan.slug === currentSlug && <Badge variant="secondary">Current</Badge>}
            </div>
            <p className="text-sm text-muted-foreground mb-5 min-h-[40px]">{plan.description}</p>
            <div className="mb-6">
              <span className="text-3xl font-bold text-foreground">{formatPlanPrice(plan, currency)}</span>
              {!custom && <span className="text-sm text-muted-foreground"> /month</span>}
            </div>
            <ul className="space-y-2 mb-6 flex-1">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" /> {f}
                </li>
              ))}
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                Up to {plan.max_scans_per_month.toLocaleString()} scans / month
              </li>
            </ul>
            {renderAction(plan)}
          </div>
        );
      })}
    </div>
  );
}

export function PricingFootnote({ currency }: { currency: DisplayCurrency }) {
  return (
    <p className="text-xs text-muted-foreground text-center mt-6">
      Payments are made in Uganda Shillings via MTN MoMo or Airtel Money.
      {currency === "USD" && " USD prices are shown for reference; you are charged the UGX price."}
    </p>
  );
}
