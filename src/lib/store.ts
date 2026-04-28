// LunaDX Store (Stable Clean Version)

const BACKEND = "/api";

// ─────────────────────────────
// Types
// ─────────────────────────────

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

// ─────────────────────────────
// Keys
// ─────────────────────────────

const USER_KEY = "lunadx_current_user";
const PATIENTS_KEY = "lunadx_patients";
const SCANS_KEY = "lunadx_scans";

// ─────────────────────────────
// Auth (demo-safe)
// ─────────────────────────────

export function getCurrentUser(): User {
  const raw = localStorage.getItem(USER_KEY);

  if (raw) return JSON.parse(raw);

  return {
    id: "1",
    name: "Demo Admin",
    email: "admin@lunadx.com",
    role: "Admin",
  };
}

export function login(email: string): User {
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

// ─────────────────────────────
// Patients (FIXED EXPORTS)
// ─────────────────────────────

export function getPatients(): Patient[] {
  return JSON.parse(localStorage.getItem(PATIENTS_KEY) || "[]");
}

export function savePatient(patient: Patient) {
  const patients = getPatients();
  patients.push(patient);
  localStorage.setItem(PATIENTS_KEY, JSON.stringify(patients));
  return patient;
}

export function deletePatient(id: string) {
  const patients = getPatients();
  const updated = patients.filter((p) => p.id !== id);
  localStorage.setItem(PATIENTS_KEY, JSON.stringify(updated));
}

// ─────────────────────────────
// AI ANALYSIS (CLEAN)
// ─────────────────────────────

export async function analyzeXray(imageDataUrl: string): Promise<AIAnalysisResponse> {
  try {
    const res = await fetch(`${BACKEND}/chexpert`, {
      method: "POST",
      body: JSON.stringify({ image: imageDataUrl }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) throw new Error("API failed");

    return await res.json();
  } catch {
    return {
      pneumonia_probability: 0,
      tb_probability: 0,
      heatmap_overlay_url: null,
      ai_summary: "Backend unavailable",
    };
  }
}
export function canUploadScans(role?: UserRole) {
  return role === "Admin" || role === "Radiologist";
}
export function canManageOrganization(role?: UserRole) {
  return role === "Admin";
}
export function createOrganization(data: {
  name: string;
  location: string;
  adminEmail: string;
  adminName: string;
  password: string;
}) {
  const user = {
    id: "1",
    name: data.adminName,
    email: data.adminEmail,
    role: "Admin" as const,
  };

  localStorage.setItem("lunadx_current_user", JSON.stringify(user));

  return {
    org: {
      id: "org-1",
      name: data.name,
      location: data.location,
    },
    user,
  };
}
// ─────────────────────────────
// SCANS (MISSING EXPORTS FIX)
// ─────────────────────────────

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

// ─────────────────────────────
// PERMISSIONS (MISSING EXPORTS FIX)
// ─────────────────────────────

export function canUploadScans(role?: UserRole) {
  return role === "Admin" || role === "Radiologist";
}

export function canManageOrganization(role?: UserRole) {
  return role === "Admin";
}

// ─────────────────────────────
// ORGANIZATION (MISSING EXPORT)
// ─────────────────────────────

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
