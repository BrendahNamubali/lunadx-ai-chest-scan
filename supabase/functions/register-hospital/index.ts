import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { adminClient, json } from "../_shared/admin.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const required = ["hospitalName", "contactPerson", "email", "password"];
    for (const key of required) {
      if (!body[key] || String(body[key]).trim().length === 0) {
        return json({ error: `Missing field: ${key}` }, 400, corsHeaders);
      }
    }
    if (String(body.password).length < 8) {
      return json({ error: "Password must be at least 8 characters." }, 400, corsHeaders);
    }
    const email = String(body.email).trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return json({ error: "Enter a valid contact email address." }, 400, corsHeaders);
    }

    const admin = adminClient();

    const { data: chosenPlan } = await admin
      .from("subscription_plans")
      .select("slug, max_clinicians")
      .eq("slug", String(body.plan ?? "basic"))
      .eq("is_active", true)
      .maybeSingle();
    const plan = chosenPlan ?? { slug: "basic", max_clinicians: 3 };

    const { data: existing } = await admin
      .from("hospitals")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (existing) {
      return json({ error: "A hospital registration already exists for this email." }, 409, corsHeaders);
    }

    const { data: hospital, error: hospitalError } = await admin
      .from("hospitals")
      .insert({
        name: String(body.hospitalName).trim(),
        facility_type: body.facilityType ?? null,
        location: body.location ?? null,
        address: body.address ?? null,
        contact_person: String(body.contactPerson).trim(),
        email,
        phone: body.phone ?? null,
        expected_clinicians: body.expectedClinicians ? Number(body.expectedClinicians) : null,
        license_info: body.licenseInfo ?? null,
        status: "pending",
        subscription_plan: plan.slug,
        subscription_status: "pending",
        max_clinicians: plan.max_clinicians,
      })
      .select()
      .single();
    if (hospitalError) throw hospitalError;

    const { data: created, error: userError } = await admin.auth.admin.createUser({
      email,
      password: String(body.password),
      email_confirm: true,
      user_metadata: { full_name: body.contactPerson },
    });
    if (userError || !created.user) {
      await admin.from("hospitals").delete().eq("id", hospital.id);
      return json({ error: userError?.message ?? "Could not create the admin account." }, 400, corsHeaders);
    }

    await admin.from("profiles").insert({
      id: created.user.id,
      email,
      full_name: String(body.contactPerson).trim(),
      hospital_id: hospital.id,
      is_active: false,
    });
    await admin.from("user_roles").insert({
      user_id: created.user.id,
      role: "hospital_admin",
      hospital_id: hospital.id,
    });
    await admin.from("subscriptions").insert({
      hospital_id: hospital.id,
      plan_name: plan.slug,
      status: "pending",
    });

    return json({ success: true, hospitalId: hospital.id }, 200, corsHeaders);
  } catch (e) {
    console.error("register-hospital failed:", e);
    return json({ error: (e as Error).message ?? "Registration failed." }, 500, corsHeaders);
  }
});