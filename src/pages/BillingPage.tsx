import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CreditCard, Info } from "lucide-react";
import { getScanUsage, getCurrentUser, getOrganization } from "@/lib/store";
import { CurrencyToggle, PricingFootnote, PricingPlans } from "@/components/pricing/PricingPlans";
import { TRIAL_DAYS, isCustomPriced, useDisplayCurrency, usePlans } from "@/lib/pricing";

export default function BillingPage() {
  const user = getCurrentUser();
  const org = user ? getOrganization(user.orgId) : undefined;
  const { used: scansUsed, total: scansTotal, remaining: scansRemaining } = getScanUsage();
  const scansPercent = (scansUsed / scansTotal) * 100;
  const { plans } = usePlans();
  const [currency, setCurrency] = useDisplayCurrency();

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Billing & Subscription</h1>
        <p className="text-sm text-muted-foreground mt-1">{org?.name ? `${org.name} · ` : ""}Manage your organization plan and scan usage</p>
      </div>

      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg">Current Plan</CardTitle>
                <CardDescription>Your active subscription details</CardDescription>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs font-semibold uppercase tracking-wider">
              Demo / Trial
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">Scans Remaining</span>
              <span className="text-sm text-muted-foreground">
                {scansUsed} / {scansTotal} used
              </span>
            </div>
            <Progress value={Math.min(scansPercent, 100)} className="h-2.5" />
            <p className="text-xs text-muted-foreground mt-1.5">
              {scansRemaining} scans remaining in your trial
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-accent/30 bg-accent/5">
        <CardContent className="flex items-center gap-3 py-4">
          <Info className="w-5 h-5 text-accent shrink-0" />
          <p className="text-sm text-foreground">
            This is a demo workspace. Register your hospital to get a {TRIAL_DAYS}-day free trial and pay with Mobile Money.
          </p>
        </CardContent>
      </Card>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-foreground">Available Plans</h2>
          <CurrencyToggle value={currency} onChange={setCurrency} />
        </div>
        <PricingPlans
          plans={plans}
          currency={currency}
          renderAction={(plan) => (
            <Link to={`/register-hospital?plan=${plan.slug}`}>
              <Button className="w-full" variant={plan.slug === "professional" ? "default" : "outline"}>
                {isCustomPriced(plan) ? "Talk to sales" : "Register hospital"}
              </Button>
            </Link>
          )}
        />
        <PricingFootnote currency={currency} />
      </div>
    </div>
  );
}
