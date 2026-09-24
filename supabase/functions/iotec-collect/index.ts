import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { adminClient, getCaller, json } from "../_shared/admin.ts";
import { iotecCollect, type IotecTransaction } from "../_shared/iotec.ts";
import { mapIotecStatus, normalizeUgandaPhone } from "../_shared/payments-core.ts";

const DUPLICATE_WINDOW_MS = 3 * 60 * 1000;

// Starts a mobile money collection for a subscription plan. The amount is
// always taken from the plan in the database, never from the request.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const caller = await getCaller(req);
    if (!caller) return json({ error: "Not authenticated." }, 401, corsHeaders);

    const admin = adminClient();
    const { data: roles } = await admin
      .from("user_roles")
      .select("role, hospital_id")
      .eq("user_id", caller.id);
    const adminRole = (roles ?? []).find((r) => r.role === "hospital_admin");
    if (!adminRole?.hospital_id) {
      return json({ error: "Only hospital admins can pay for a subscription." }, 403, corsHeaders);
    }

    const { data: hospital } = await admin
      .from("hospitals")
      .select("id, name, hospital_number, status")
      .eq("id", adminRole.hospital_id)
      .single();
    if (!hospital || hospital.status !== "approved") {
      return json({ error: "Your hospital account must be approved before you can subscribe." }, 403, corsHeaders);
    }

    const body = await req.json();
    const phone = normalizeUgandaPhone(String(body.phone ?? ""));
    if (!phone) {
      return json({ error: "Enter a valid MTN or Airtel Uganda mobile money number." }, 400, corsHeaders);
    }

    const { data: plan } = await admin
      .from("subscription_plans")
      .select("slug, name, price_ugx, is_active")
      .eq("slug", String(body.planSlug ?? ""))
      .maybeSingle();
    if (!plan || !plan.is_active) return json({ error: "That plan is not available." }, 400, corsHeaders);
    if (!plan.price_ugx || plan.price_ugx <= 0) {
      return json({ error: "This plan has custom pricing. Please contact LunaDX." }, 400, corsHeaders);
    }

    const { data: recent } = await admin
      .from("payments")
      .select("id")
      .eq("hospital_id", hospital.id)
      .eq("status", "pending")
      .gte("created_at", new Date(Date.now() - DUPLICATE_WINDOW_MS).toISOString())
      .limit(1);
    if (recent && recent.length > 0) {
      return json(
        { error: "A payment is already waiting for approval on a phone. Approve or wait a few minutes.", paymentId: recent[0].id },
        409,
        corsHeaders,
      );
    }

    const { data: payment, error: insertError } = await admin
      .from("payments")
      .insert({
        hospital_id: hospital.id,
        plan_slug: plan.slug,
        amount: plan.price_ugx,
        currency: "UGX",
        period_months: 1,
        phone: phone.msisdn,
        created_by: caller.id,
      })
      .select("id")
      .single();
    if (insertError || !payment) throw insertError ?? new Error("Could not create payment.");

    const result = await iotecCollect({
      externalId: payment.id,
      payer: phone.msisdn,
      amount: plan.price_ugx,
      payerNote: `LunaDX ${plan.name} - 1 month`,
      payeeNote: `${hospital.hospital_number ?? hospital.name} ${plan.slug}`,
    });
    const tx = (result.body ?? {}) as IotecTransaction;

    if (!result.ok) {
      console.error("ioTec collect failed", result.status, result.body);
      const message = tx.statusMessage ?? (tx as { message?: string }).message ?? "The payment could not be started.";
      await admin.from("payments").update({
        status: "failed",
        status_message: String(message),
        raw_response: tx,
        updated_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      }).eq("id", payment.id);
      return json({ error: String(message), paymentId: payment.id }, 502, corsHeaders);
    }

    const status = mapIotecStatus(tx.status);
    await admin.from("payments").update({
      provider_reference: tx.id ?? null,
      status: status === "success" ? "pending" : status,
      status_message: tx.statusMessage ?? null,
      raw_response: tx,
      updated_at: new Date().toISOString(),
      completed_at: status === "failed" ? new Date().toISOString() : null,
    }).eq("id", payment.id);

    return json({ paymentId: payment.id, status: status === "failed" ? "failed" : "pending", network: phone.network }, 200, corsHeaders);
  } catch (e) {
    console.error("iotec-collect failed:", e);
    return json({ error: (e as Error).message ?? "Payment failed." }, 500, corsHeaders);
  }
});
