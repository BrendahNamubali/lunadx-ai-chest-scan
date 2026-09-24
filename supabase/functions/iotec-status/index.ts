import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { adminClient, getCaller, json } from "../_shared/admin.ts";
import { syncPayment, type PaymentRow } from "../_shared/iotec.ts";

const PAYMENT_COLUMNS = "id, hospital_id, status, status_message, activated_at, created_at";

// Two modes:
//  - Signed-in user with { paymentId }: refreshes one payment of their hospital.
//  - Scheduled reconcile with header x-cron-secret: refreshes every pending payment,
//    so payments complete even if the browser was closed during approval.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = adminClient();
    const cronSecret = Deno.env.get("CRON_SECRET");

    if (cronSecret && req.headers.get("x-cron-secret") === cronSecret) {
      const { data: pending, error } = await admin
        .from("payments")
        .select(PAYMENT_COLUMNS)
        .or("status.eq.pending,and(status.eq.success,activated_at.is.null)")
        .lte("created_at", new Date(Date.now() - 60_000).toISOString())
        .order("created_at")
        .limit(100);
      if (error) throw error;

      const results = { checked: 0, success: 0, failed: 0, errors: 0 };
      for (const payment of pending ?? []) {
        results.checked += 1;
        try {
          const updated = await syncPayment(admin, payment as PaymentRow);
          if (updated.status === "success") results.success += 1;
          if (updated.status === "failed") results.failed += 1;
        } catch (e) {
          results.errors += 1;
          console.error("reconcile failed for payment", payment.id, e);
        }
      }
      return json(results, 200, corsHeaders);
    }

    const caller = await getCaller(req);
    if (!caller) return json({ error: "Not authenticated." }, 401, corsHeaders);

    const body = await req.json();
    const { data: payment } = await admin
      .from("payments")
      .select(PAYMENT_COLUMNS)
      .eq("id", String(body.paymentId ?? ""))
      .maybeSingle();
    if (!payment) return json({ error: "Payment not found." }, 404, corsHeaders);

    const { data: roles } = await admin
      .from("user_roles")
      .select("role, hospital_id")
      .eq("user_id", caller.id);
    const allowed = (roles ?? []).some(
      (r) => r.role === "super_admin" || (r.role === "hospital_admin" && r.hospital_id === payment.hospital_id),
    );
    if (!allowed) return json({ error: "Payment not found." }, 404, corsHeaders);

    const updated = await syncPayment(admin, payment as PaymentRow);
    return json(
      { paymentId: updated.id, status: updated.status, message: updated.status_message, activated: !!updated.activated_at },
      200,
      corsHeaders,
    );
  } catch (e) {
    console.error("iotec-status failed:", e);
    return json({ error: (e as Error).message ?? "Could not check payment." }, 500, corsHeaders);
  }
});
