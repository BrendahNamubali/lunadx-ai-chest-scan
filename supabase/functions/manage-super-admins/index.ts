import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { adminClient, getCaller, json } from "../_shared/admin.ts";

async function activeSuperAdmins(admin: ReturnType<typeof adminClient>) {
  const { data: roles } = await admin.from("user_roles").select("user_id").eq("role", "super_admin");
  const ids = (roles ?? []).map((r) => r.user_id as string);
  if (ids.length === 0) return [] as { id: string; email: string; full_name: string | null; is_active: boolean }[];
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, email, full_name, is_active, created_at")
    .in("id", ids);
  return (profiles ?? []) as any[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const caller = await getCaller(req);
    if (!caller) return json({ error: "Not authenticated." }, 401, corsHeaders);

    const admin = adminClient();
    const { data: callerRoles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "super_admin");
    if (!callerRoles || callerRoles.length === 0) {
      return json({ error: "Only LunaDX super admins can manage super admin accounts." }, 403, corsHeaders);
    }
    const { data: callerProfile } = await admin
      .from("profiles")
      .select("is_active")
      .eq("id", caller.id)
      .maybeSingle();
    if (callerProfile && callerProfile.is_active === false) {
      return json({ error: "Your super admin account is deactivated." }, 403, corsHeaders);
    }

    const body = await req.json().catch(() => ({}));
    const action = String((body as any).action ?? "list");

    if (action === "list") {
      const list = await activeSuperAdmins(admin);
      return json({ superAdmins: list }, 200, corsHeaders);
    }

    if (action === "create") {
      const email = String((body as any).email ?? "").trim().toLowerCase();
      const fullName = String((body as any).fullName ?? "").trim();
      const password = String((body as any).password ?? "");
      if (!email || !fullName || password.length < 8) {
        return json({ error: "Name, email and a password of at least 8 characters are required." }, 400, corsHeaders);
      }

      const { data: existingProfile } = await admin
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      if (existingProfile) {
        const { error: roleErr } = await admin
          .from("user_roles")
          .insert({ user_id: existingProfile.id, role: "super_admin" });
        if (roleErr && !roleErr.message.includes("duplicate")) {
          return json({ error: roleErr.message }, 400, corsHeaders);
        }
        await admin.from("profiles").update({ is_active: true }).eq("id", existingProfile.id);
        return json({ success: true, userId: existingProfile.id }, 200, corsHeaders);
      }

      const { data: created, error: userError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      if (userError || !created.user) {
        return json({ error: userError?.message ?? "Could not create the account." }, 400, corsHeaders);
      }
      await admin.from("profiles").insert({ id: created.user.id, email, full_name: fullName, is_active: true });
      const { error: roleError } = await admin
        .from("user_roles")
        .insert({ user_id: created.user.id, role: "super_admin" });
      if (roleError) {
        await admin.auth.admin.deleteUser(created.user.id);
        return json({ error: roleError.message }, 400, corsHeaders);
      }
      return json({ success: true, userId: created.user.id }, 200, corsHeaders);
    }

    const userId = String((body as any).userId ?? "");
    if (!userId) return json({ error: "A target account is required." }, 400, corsHeaders);
    const all = await activeSuperAdmins(admin);
    const target = all.find((a) => a.id === userId);
    if (!target) return json({ error: "That account is not a super admin." }, 404, corsHeaders);
    const activeCount = all.filter((a) => a.is_active !== false).length;
    const lastActive = target.is_active !== false && activeCount <= 1;

    if (action === "update") {
      const fullName = (body as any).fullName as string | undefined;
      const email = (body as any).email as string | undefined;
      const password = (body as any).password as string | undefined;
      if (password && password.length < 8) {
        return json({ error: "Password must be at least 8 characters." }, 400, corsHeaders);
      }
      const authPatch: Record<string, unknown> = {};
      if (email) authPatch.email = email.trim().toLowerCase();
      if (password) authPatch.password = password;
      if (fullName) authPatch.user_metadata = { full_name: fullName };
      if (Object.keys(authPatch).length > 0) {
        const { error } = await admin.auth.admin.updateUserById(userId, authPatch as any);
        if (error) return json({ error: error.message }, 400, corsHeaders);
      }
      const profilePatch: Record<string, unknown> = {};
      if (email) profilePatch.email = email.trim().toLowerCase();
      if (fullName) profilePatch.full_name = fullName;
      if (Object.keys(profilePatch).length > 0) {
        await admin.from("profiles").update(profilePatch).eq("id", userId);
      }
      return json({ success: true }, 200, corsHeaders);
    }

    if (action === "deactivate") {
      if (lastActive) {
        return json(
          { error: "This is the last active super admin. Add another super admin before deactivating this one.", code: "LAST_SUPER_ADMIN" },
          409,
          corsHeaders,
        );
      }
      await admin.from("profiles").update({ is_active: false }).eq("id", userId);
      await admin.auth.admin.updateUserById(userId, { ban_duration: "876000h" } as any);
      return json({ success: true }, 200, corsHeaders);
    }

    if (action === "activate") {
      await admin.from("profiles").update({ is_active: true }).eq("id", userId);
      await admin.auth.admin.updateUserById(userId, { ban_duration: "none" } as any);
      return json({ success: true }, 200, corsHeaders);
    }

    if (action === "delete") {
      if (lastActive) {
        return json(
          { error: "This is the last active super admin. Add another super admin before removing this one.", code: "LAST_SUPER_ADMIN" },
          409,
          corsHeaders,
        );
      }
      await admin.from("user_roles").delete().eq("user_id", userId).eq("role", "super_admin");
      await admin.from("profiles").delete().eq("id", userId);
      await admin.auth.admin.deleteUser(userId);
      return json({ success: true }, 200, corsHeaders);
    }

    return json({ error: "Unknown action." }, 400, corsHeaders);
  } catch (e) {
    console.error("manage-super-admins failed:", e);
    return json({ error: (e as Error).message ?? "Request failed." }, 500, corsHeaders);
  }
});
