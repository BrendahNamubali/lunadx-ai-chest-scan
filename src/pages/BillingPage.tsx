import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Check, Zap, Building2, FlaskConical, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { getScanUsage, getCurrentUser, getOrganization } from "@/lib/store";

const plans = [
  {
    id: "trial",
    name: "Trial",
    price: "Free",
    period: "",
    description: "Explore the platform with limited scans",
    scansLabel: "10 scans included",
    features: ["AI-powered TB & Pneumonia detection", "Basic reporting", "1 user account", "Email support"],
    highlight: false,
    icon: FlaskConical,
  },
  {
    id: "clinic",
    name: "Clinic",
    price: "$49",
    period: "/month",
    description: "For small to mid-size clinics",
    scansLabel: "200 scans / month",
    features: ["Everything in Trial", "Priority AI analysis", "Up to 5 user accounts", "Patient record management", "PDF export & sharing"],
    highlight: true,
    icon: Zap,
  },
  {
    id: "hospital",
    name: "Hospital",
    price: "Custom",
    period: "",
    description: "Enterprise-grade deployment",
    scansLabel: "Unlimited scans",
    features: ["Everything in Clinic", "Unlimited users & roles", "On-premise deployment option", "DICOM/PACS integration", "Dedicated account manager", "SLA & compliance support"],
    highlight: false,
    icon: Building2,
  },
];

export default function BillingPage() {
  const [showUpgradeMsg, setShowUpgradeMsg] = useState(false);

  const user = getCurrentUser();
  const org = user ? getOrganization(user.orgId) : undefined;
  const { used: scansUsed, total: scansTotal, remaining: scansRemaining, plan: currentPlan } = getScanUsage();
  const scansPercent = (scansUsed / scansTotal) * 100;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Billing & Subscription</h1>
        <p className="text-sm text-muted-foreground mt-1">{org?.name ? `${org.name} · ` : ""}Manage your organization plan and scan usage</p>
      </div>

      {/* Current Plan Card */}
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

      {/* Upgrade Message */}
      {showUpgradeMsg && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-accent/30 bg-accent/5">
            <CardContent className="flex items-center gap-3 py-4">
              <AlertCircle className="w-5 h-5 text-accent shrink-0" />
              <p className="text-sm font-medium text-foreground">
                Payment integration coming soon.{" "}
                <span className="text-muted-foreground font-normal">
                  We'll notify you when plan upgrades become available.
                </span>
              </p>
              <Button variant="ghost" size="sm" className="ml-auto shrink-0" onClick={() => setShowUpgradeMsg(false)}>
                Dismiss
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Plans */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {plans.map((plan) => {
            const isCurrent = plan.id === currentPlan;
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: plans.indexOf(plan) * 0.1 }}
              >
                <Card
                  className={`relative h-full flex flex-col ${
                    plan.highlight
                      ? "border-accent shadow-md ring-1 ring-accent/20"
                      : "border-border"
                  }`}
                >
                  {plan.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-accent text-accent-foreground text-[10px] uppercase tracking-wider px-3">
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <plan.icon className={`w-4 h-4 ${plan.highlight ? "text-accent" : "text-muted-foreground"}`} />
                      <CardTitle className="text-base">{plan.name}</CardTitle>
                    </div>
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                      {plan.period && <span className="text-sm text-muted-foreground">{plan.period}</span>}
                    </div>
                    <CardDescription className="text-xs">{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-3">
                    <Badge variant="outline" className="text-xs font-medium">
                      {plan.scansLabel}
                    </Badge>
                    <Separator />
                    <ul className="space-y-2">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <Check className="w-3.5 h-3.5 text-accent mt-0.5 shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    {isCurrent ? (
                      <Button variant="secondary" className="w-full" disabled>
                        Current Plan
                      </Button>
                    ) : (
                      <Button
                        className={`w-full ${plan.highlight ? "bg-accent text-accent-foreground hover:bg-accent/90" : ""}`}
                        variant={plan.highlight ? "default" : "outline"}
                        onClick={() => setShowUpgradeMsg(true)}
                      >
                        Upgrade Plan
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
