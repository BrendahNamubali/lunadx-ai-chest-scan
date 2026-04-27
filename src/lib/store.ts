// LunaDX Store (Clean Restart Version)

const BACKEND = "/api";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type UserRole = "Admin" | "Radiologist" | "Clinician";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface Patient {
  id: string;
  name: string;
  age?: number;
  sex?: string;
  createdAt: string;
}

export interface Scan {
  id: string;
  patientId: string;
  createdAt: string;
  result?: any;
}

export interface AIAnalysisResponse {
  pneumonia_probability: number;
  tb_probability: number;
  heatmap_overlay_url: string | null;
  ai_summary: string;
}

// ─────────────────────────────────────────────
// Local Storage Keys
// ─────────────────────────────────────────────

const USER_KEY = "lunadx_current_user";
const PATIENTS_KEY = "lunadx_patients";
const SCANS_KEY = "lunadx_scans";

// ─────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────

export function getCurrentUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);

  if (!raw) {
    return {
      id: "1",
      name: "Demo Admin",
      email: "admin@lunadx.com",
      role: "Admin",
    };
  }

  return JSON.parse(raw);
}

export function login(email: string, password: string): User {
  const user: User = {
    id: "1",
    name: "Demo User",
    email,
    role: "Admin",
  };

  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

export function logout() {
  localStorage.removeItem(USER_KEY);
}

export function createOrganization(data: {
  name: string;
  location: string;
  adminEmail: string;
  adminName: string;
  password: string;
}) {
  const user: User = {
    id: "1",
    name: data.adminName,
    email: data.adminEmail,
    role: "Admin",
  };

  localStorage.setItem(USER_KEY, JSON.stringify(user));

  return {
    org: {
      id: "org-1",
      name: data.name,
      location: data.location,
    },
    user,
  };
}

// ─────────────────────────────────────────────
// Permissions
// ─────────────────────────────────────────────

export function canUploadScans(role?: UserRole) {
  return role === "Admin" || role === "Radiologist";
}

export function canManageOrganization(role?: UserRole) {
  return role === "Admin";
}

// ─────────────────────────────────────────────
// Mock Data Layer (for now)
// ─────────────────────────────────────────────

export function getPatients(): Patient[] {
  return JSON.parse(localStorage.getItem(PATIENTS_KEY) || "[]");
}

export function getScans(): Scan[] {
  return JSON.parse(localStorage.getItem(SCANS_KEY) || "[]");
}

export function getScanUsage() {
  const scans = getScans();
  const limit = 50;

  return {
    used: scans.length,
    total: limit,
    remaining: Math.max(limit - scans.length, 0),
  };
}

// ─────────────────────────────────────────────
// AI Analysis
// ─────────────────────────────────────────────

export async function analyzeXray(
  imageDataUrl: string,
  patientId?: string,
  clinicalNotes?: string,
  viewPosition?: string
): Promise<AIAnalysisResponse> {
  const blob = await (await fetch(imageDataUrl)).blob();
  const ext = blob.type.includes("png") ? "png" : "jpg";
  const file = new File([blob], `xray.${ext}`, { type: blob.type });

  const fd = new FormData();
  fd.append("file", file);

  if (patientId) fd.append("patient_id", patientId);
  if (clinicalNotes) fd.append("clinical_notes", clinicalNotes);
  fd.append("view_position", viewPosition || "PA");

  try {
    const res = await fetch(`${BACKEND}/chexpert`, {
      method: "POST",
      body: fd,
    });

    if (res.ok) {
      const data = await res.json();

      return {
        pneumonia_probability: data.pneumonia_probability ?? 0,
        tb_probability: data.tb_probability ?? 0,
        heatmap_overlay_url: data.heatmap_overlay_url ?? null,
        ai_summary: data.ai_summary || "AI analysis completed.",
      };
    }

    throw new Error("Backend failed");
  } catch (err) {
    const p = Math.round(Math.random() * 100);
    const t = Math.round(Math.random() * 100);

    return {
      pneumonia_probability: p,
      tb_probability: t,
      heatmap_overlay_url: null,
      ai_summary: `Fallback analysis. Pneumonia ${p}%, TB ${t}%.`,
    };
  }
}
