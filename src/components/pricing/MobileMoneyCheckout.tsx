import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, Smartphone, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatUGX, normalizeUgandaPhone, type Plan } from "@/lib/pricing";

const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS = 3 * 60 * 1000;

type Step =
  | { kind: "form" }
  | { kind: "waiting"; paymentId: string }
  | { kind: "success" }
  | { kind: "failed"; message: string }
  | { kind: "timeout"; paymentId: string };

interface Props {
  plan: Plan | null;
  defaultPhone?: string | null;
  onClose: () => void;
  onPaid: () => void;
}

async function invoke<T>(name: string, body: unknown): Promise<T & { error?: string }> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (data) return data as T & { error?: string };
  // Non-2xx responses carry the JSON body on error.context.
  const ctx = (error as { context?: Response } | null)?.context;
  if (ctx && typeof ctx.json === "function") {
    try {
      return (await ctx.json()) as T & { error?: string };
    } catch {
      /* fall through */
    }
  }
  return { error: error?.message ?? "Request failed." } as T & { error?: string };
}

export function MobileMoneyCheckout({ plan, defaultPhone, onClose, onPaid }: Props) {
  const [phone, setPhone] = useState(defaultPhone ?? "");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<Step>({ kind: "form" });
  const startedAt = useRef(0);
  const onPaidRef = useRef(onPaid);
  onPaidRef.current = onPaid;

  useEffect(() => {
    if (plan) {
      setStep({ kind: "form" });
      setError("");
    }
  }, [plan]);

  useEffect(() => {
    if (step.kind !== "waiting") return;
    let cancelled = false;
    const timer = setInterval(async () => {
      const res = await invoke<{ status: string; message?: string | null }>("iotec-status", { paymentId: step.paymentId });
      if (cancelled) return;
      if (res.status === "success") {
        setStep({ kind: "success" });
        onPaidRef.current();
      } else if (res.status === "failed") {
        setStep({ kind: "failed", message: res.message ?? "The payment was declined or cancelled." });
      } else if (Date.now() - startedAt.current > POLL_TIMEOUT_MS) {
        setStep({ kind: "timeout", paymentId: step.paymentId });
      }
    }, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [step]);

  const parsed = normalizeUgandaPhone(phone);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan) return;
    if (!parsed) {
      setError("Enter a valid MTN or Airtel Uganda number, e.g. 0772 123456.");
      return;
    }
    setError("");
    setSubmitting(true);
    const res = await invoke<{ paymentId?: string; status?: string }>("iotec-collect", {
      planSlug: plan.slug,
      phone: parsed.msisdn,
    });
    setSubmitting(false);
    if (res.paymentId && !res.error && res.status !== "failed") {
      startedAt.current = Date.now();
      setStep({ kind: "waiting", paymentId: res.paymentId });
    } else if (res.paymentId && res.error?.includes("already waiting")) {
      startedAt.current = Date.now();
      setStep({ kind: "waiting", paymentId: res.paymentId });
    } else {
      setError(res.error ?? "The payment could not be started.");
    }
  };

  return (
    <Dialog open={!!plan} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pay with Mobile Money</DialogTitle>
          <DialogDescription>
            {plan?.name}: {plan ? formatUGX(plan.price_ugx) : ""} for 1 month
          </DialogDescription>
        </DialogHeader>

        {step.kind === "form" && (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="momo-phone">MTN or Airtel number</Label>
              <Input
                id="momo-phone"
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0772 123456"
                className="mt-1.5"
                required
              />
              {parsed && <p className="text-xs text-muted-foreground mt-1">{parsed.network} Mobile Money · +{parsed.msisdn}</p>}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Smartphone className="w-4 h-4 mr-2" />}
              Pay {plan ? formatUGX(plan.price_ugx) : ""}
            </Button>
            <p className="text-[11px] text-muted-foreground text-center">
              You'll receive a prompt on your phone. Enter your Mobile Money PIN to approve.
            </p>
          </form>
        )}

        {step.kind === "waiting" && (
          <div className="text-center py-6 space-y-3">
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
            <p className="font-medium text-foreground">Approve the payment on your phone</p>
            <p className="text-sm text-muted-foreground">
              Check your phone for the Mobile Money prompt and enter your PIN. This page updates automatically.
            </p>
          </div>
        )}

        {step.kind === "success" && (
          <div className="text-center py-6 space-y-3">
            <CheckCircle2 className="w-12 h-12 text-primary mx-auto" />
            <p className="font-medium text-foreground">Payment received</p>
            <p className="text-sm text-muted-foreground">Your {plan?.name} is active. Thank you!</p>
            <Button className="w-full" onClick={onClose}>Done</Button>
          </div>
        )}

        {step.kind === "failed" && (
          <div className="text-center py-6 space-y-3">
            <XCircle className="w-12 h-12 text-destructive mx-auto" />
            <p className="font-medium text-foreground">Payment not completed</p>
            <p className="text-sm text-muted-foreground">{step.message}</p>
            <Button className="w-full" onClick={() => setStep({ kind: "form" })}>Try again</Button>
          </div>
        )}

        {step.kind === "timeout" && (
          <div className="text-center py-6 space-y-3">
            <Smartphone className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="font-medium text-foreground">Still waiting for approval</p>
            <p className="text-sm text-muted-foreground">
              If you approved the prompt, your plan will activate within a few minutes. You can close this window.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>Close</Button>
              <Button
                className="flex-1"
                onClick={() => {
                  startedAt.current = Date.now();
                  setStep({ kind: "waiting", paymentId: step.paymentId });
                }}
              >
                Keep waiting
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
