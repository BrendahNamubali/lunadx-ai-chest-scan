import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { adminClient, json } from "../_shared/admin.ts";

// One-time bootstrap: creates the first LunaDX internal super admin.
// Refuses to run once a super admin already exists.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = adminClient();
    const { count } = await admin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "super_admin");
    if ((count ?? 0) > 0) {
      return json({ error: "A super admin already exists." }, 409, corsHeaders);
    }

    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const fullName = String(body.fullName ?? "LunaDX Administrator");
    if (!email || password.length < 8) {
      return json({ error: "Email and a password of at least 8 characters are required." }, 400, corsHeaders);
    }

    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error || !created.user) {
      return json({ error: error?.message ?? "Could not create the account." }, 400, corsHeaders);
    }

    await admin.from("profiles").insert({ id: created.user.id, email, full_name: fullName });
    await admin.from("user_roles").insert({ user_id: created.user.id, role: "super_admin" });

    return json({ success: true }, 200, corsHeaders);
  } catch (e) {
    console.error("bootstrap-super-admin failed:", e);
    return json({ error: (e as Error).message ?? "Bootstrap failed." }, 500, corsHeaders);
  }
});