import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { adminClient, getCaller, json } from "../_shared/admin.ts";

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
      return json({ error: "Only hospital admins can manage clinician accounts." }, 403, corsHeaders);
    }
    const hospitalId = adminRole.hospital_id;

    const { data: hospital } = await admin
      .from("hospitals")
      .select("id, status, max_clinicians, subscription_status")
      .eq("id", hospitalId)
      .single();
    if (!hospital || hospital.status !== "approved") {
      return json({ error: "Your hospital account is not active yet." }, 403, corsHeaders);
    }

    const body = await req.json();
    const action = body.action as string;

    if (action === "create") {
      if (!["trial", "active"].includes(hospital.subscription_status)) {
        return json({ error: "Your subscription has expired. Renew it to add clinician accounts." }, 402, corsHeaders);
      }
      const email = String(body.email ?? "").trim().toLowerCase();
      const fullName = String(body.fullName ?? "").trim();
      const password = String(body.password ?? "");
      if (!email || !fullName || password.length < 8) {
        return json({ error: "Name, email and a password of at least 8 characters are required." }, 400, corsHeaders);
      }

      const { count } = await admin
        .from("user_roles")
        .select("id", { count: "exact", head: true })
        .eq("hospital_id", hospitalId)
        .eq("role", "clinician");
      if ((count ?? 0) >= (hospital.max_clinicians ?? 3)) {
        return json(
          {
            error: `Your hospital account has reached the maximum of ${hospital.max_clinicians ?? 3} clinician accounts. Please upgrade your subscription plan to add more users.`,
            code: "CLINICIAN_LIMIT_REACHED",
          },
          403,
          corsHeaders,
        );
      }

      const { data: created, error: userError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      if (userError || !created.user) {
        return json({ error: userError?.message ?? "Could not create clinician." }, 400, corsHeaders);
      }

      await admin.from("profiles").insert({
        id: created.user.id,
        email,
        full_name: fullName,
        hospital_id: hospitalId,
        is_active: true,
      });
      const { error: roleError } = await admin
        .from("user_roles")
        .insert({ user_id: created.user.id, role: "clinician", hospital_id: hospitalId });
      if (roleError) {
        await admin.auth.admin.deleteUser(created.user.id);
        const limitHit = roleError.message.includes("CLINICIAN_LIMIT_REACHED");
        return json(
          {
            error: limitHit
              ? `Your hospital account has reached the maximum of ${hospital.max_clinicians ?? 3} clinician accounts. Please upgrade your subscription plan to add more users.`
              : roleError.message,
          },
          403,
          corsHeaders,
        );
      }

      return json({ success: true, userId: created.user.id }, 200, corsHeaders);
    }

    if (action === "delete") {
      const userId = String(body.userId ?? "");
      const { data: target } = await admin
        .from("user_roles")
        .select("role, hospital_id")
        .eq("user_id", userId)
        .maybeSingle();
      if (!target || target.hospital_id !== hospitalId || target.role !== "clinician") {
        return json({ error: "That clinician does not belong to your hospital." }, 403, corsHeaders);
      }
      await admin.auth.admin.deleteUser(userId);
      await admin.from("profiles").delete().eq("id", userId);
      await admin.from("user_roles").delete().eq("user_id", userId);
      return json({ success: true }, 200, corsHeaders);
    }

    return json({ error: "Unknown action." }, 400, corsHeaders);
  } catch (e) {
    console.error("manage-clinicians failed:", e);
    return json({ error: (e as Error).message ?? "Request failed." }, 500, corsHeaders);
  }
});