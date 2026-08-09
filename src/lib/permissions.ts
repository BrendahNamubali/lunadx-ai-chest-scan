import { useAuth, type AppRole } from "@/lib/auth";
import { getCurrentUser, type UserRole } from "@/lib/store";

/**
 * Single source of truth for clinical workflow permissions.
 *
 * LunaDX exists to let clinicians run AI-assisted X-ray screening when no
 * radiologist is available, so clinicians have full access to upload, analysis
 * (pneumonia AND chest findings) and results. Radiologists are optional and
 * simply inherit the same clinical capabilities.
 */
export type AnyRole = AppRole | UserRole | undefined | null;

const CLINICAL_ROLES: string[] = [
  // Lovable Cloud roles
  "super_admin",
  "hospital_admin",
  "clinician",
  // legacy local roles
  "Admin",
  "Radiologist",
  "Clinician",
];

const ORG_ROLES: string[] = ["super_admin", "hospital_admin", "Admin"];

export function roleCanUploadScans(role: AnyRole): boolean {
  return !!role && CLINICAL_ROLES.includes(role as string);
}

export function roleCanManagePatients(role: AnyRole): boolean {
  return roleCanUploadScans(role);
}

export function roleCanManageOrganization(role: AnyRole): boolean {
  return !!role && ORG_ROLES.includes(role as string);
}

/** Combines the Lovable Cloud session role with the legacy local user role. */
export function usePermissions() {
  const { role, session, loading } = useAuth();
  const legacyRole = getCurrentUser()?.role;
  const effectiveRole: AnyRole = role ?? legacyRole ?? (session ? "clinician" : undefined);

  return {
    loading,
    role: effectiveRole,
    canUploadScans: roleCanUploadScans(effectiveRole),
    canAnalyze: roleCanUploadScans(effectiveRole),
    canManagePatients: roleCanManagePatients(effectiveRole),
    canManageOrganization: roleCanManageOrganization(effectiveRole),
  };
}
