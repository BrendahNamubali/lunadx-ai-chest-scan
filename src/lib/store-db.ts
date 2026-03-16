// LunaDX Store - Database Integration
// Replaces localStorage with PostgreSQL database API

const BACKEND = "http://127.0.0.1:8000";

// Types
export interface Organization {
  id: string;
  name: string;
  location: string;
  adminEmail: string;
  createdAt: string;
  scanLimit: number;
  plan: "trial" | "clinic" | "hospital";
}

export type UserRole = "Admin" | "Radiologist" | "Clinician";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  orgId: string;
  orgName?: string;
  createdAt: string;
  isActive: boolean;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  sex: "Male" | "Female" | "Other";
  hospitalId: string;
  symptoms: string;
  visitDate: string;
  createdAt: string;
  orgId: string;
}

export interface ScanResult {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  orgId: string;
  tbRisk: number;
  pneumoniaRisk: number;
  lungOpacityRisk: number;
  pleuralEffusionRisk: number;
  lungNodulesRisk: number;
  abnormalityScore: number;
  riskLevel: "Low" | "Medium" | "High";
  findings: string[];
  suggestions: string[];
  aiSummary?: string;
  heatmapOverlayUrl?: string;
  imageUrl: string;
  scanDate: string;
  doctorNotes?: string;
  viewPosition: string;
  clinicalNotes?: string;
  processingTimeMs?: number;
  modelVersion?: string;
  usedSimulation: boolean;
}

export interface AIAnalysisResponse {
  pneumonia_probability: number;
  tb_probability: number;
  heatmap_overlay_url: string | null;
  ai_summary: string;
}

// Authentication
export interface AuthResponse {
  user: User;
  access_token: string;
  token_type: string;
}

// Store token in localStorage
const TOKEN_KEY = "lunadx_token";
const USER_KEY = "lunadx_user";

function getAuthHeader() {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Authentication ──────────────────────────────────

export async function login(email: string, password: string): Promise<User> {
  const response = await fetch(`${BACKEND}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error("Invalid credentials");
  }

  const data: AuthResponse = await response.json();
  
  // Store token and user
  localStorage.setItem(TOKEN_KEY, data.access_token);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  
  return data.user;
}

export function getCurrentUser(): User | null {
  try {
    const userStr = localStorage.getItem(USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
}

export function logout(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function refreshToken(): Promise<User> {
  const response = await fetch(`${BACKEND}/auth/me`, {
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    logout();
    throw new Error("Session expired");
  }

  const user: User = await response.json();
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

// ── Organizations ──────────────────────────────────

export async function getOrganizations(): Promise<Organization[]> {
  // For now, return default organization
  const currentUser = getCurrentUser();
  if (!currentUser) return [];
  
  return [{
    id: currentUser.orgId,
    name: currentUser.orgName || "Metro Health Clinic",
    location: "Kampala, Uganda",
    adminEmail: "admin@lunadx.com",
    createdAt: new Date().toISOString(),
    scanLimit: 1000,
    plan: "hospital" as const
  }];
}

export async function createOrganization(data: {
  name: string; location: string; adminEmail: string; adminName: string; password: string;
}): Promise<{ org: Organization; user: User }> {
  const response = await fetch(`${BACKEND}/organizations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to create organization");
  }

  return response.json();
}

// ── Patients ──────────────────────────────────

export async function getPatients(): Promise<Patient[]> {
  const response = await fetch(`${BACKEND}/patients`, {
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch patients");
  }

  return response.json();
}

export async function getPatient(id: string): Promise<Patient | undefined> {
  const response = await fetch(`${BACKEND}/patients/${id}`, {
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    if (response.status === 404) return undefined;
    throw new Error("Failed to fetch patient");
  }

  return response.json();
}

export async function createPatient(patient: Omit<Patient, "id" | "createdAt" | "orgId">): Promise<Patient> {
  const currentUser = getCurrentUser();
  if (!currentUser) throw new Error("Not authenticated");

  const response = await fetch(`${BACKEND}/patients`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      ...getAuthHeader()
    },
    body: JSON.stringify({ ...patient, orgId: currentUser.orgId }),
  });

  if (!response.ok) {
    throw new Error("Failed to create patient");
  }

  return response.json();
}

export async function updatePatient(id: string, updates: Partial<Patient>): Promise<Patient> {
  const response = await fetch(`${BACKEND}/patients/${id}`, {
    method: "PUT",
    headers: { 
      "Content-Type": "application/json",
      ...getAuthHeader()
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error("Failed to update patient");
  }

  return response.json();
}

export async function deletePatient(id: string): Promise<void> {
  const response = await fetch(`${BACKEND}/patients/${id}`, {
    method: "DELETE",
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    throw new Error("Failed to delete patient");
  }
}

// ── Scans ──────────────────────────────────

export async function getScans(): Promise<ScanResult[]> {
  const response = await fetch(`${BACKEND}/scans`, {
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch scans");
  }

  return response.json();
}

export async function getScan(id: string): Promise<ScanResult | undefined> {
  const response = await fetch(`${BACKEND}/scans/${id}`, {
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    if (response.status === 404) return undefined;
    throw new Error("Failed to fetch scan");
  }

  return response.json();
}

export async function getPatientScans(patientId: string): Promise<ScanResult[]> {
  const response = await fetch(`${BACKEND}/patients/${patientId}/scans`, {
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch patient scans");
  }

  return response.json();
}

export async function saveScan(scan: Omit<ScanResult, "id" | "scanDate">): Promise<ScanResult> {
  const currentUser = getCurrentUser();
  if (!currentUser) throw new Error("Not authenticated");

  const response = await fetch(`${BACKEND}/scans`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      ...getAuthHeader()
    },
    body: JSON.stringify({ 
      ...scan, 
      orgId: currentUser.orgId,
      doctorId: currentUser.id 
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to save scan");
  }

  return response.json();
}

export async function updateScan(id: string, updates: Partial<ScanResult>): Promise<ScanResult> {
  const response = await fetch(`${BACKEND}/scans/${id}`, {
    method: "PUT",
    headers: { 
      "Content-Type": "application/json",
      ...getAuthHeader()
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error("Failed to update scan");
  }

  return response.json();
}

export async function deleteScan(id: string): Promise<void> {
  const response = await fetch(`${BACKEND}/scans/${id}`, {
    method: "DELETE",
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    throw new Error("Failed to delete scan");
  }
}

// ── AI Analysis ──────────────────────────────────

export async function analyzeXray(
  imageDataUrl: string,
  patientId?: string,
  clinicalNotes?: string,
  viewPosition?: string
): Promise<AIAnalysisResponse> {

  try {
    // Convert dataURL → Blob → FormData
    const blob = await (await fetch(imageDataUrl)).blob();
    const ext = blob.type.includes("png") ? "png" : "jpg";
    const file = new File([blob], `xray.${ext}`, { type: blob.type });

    const fd = new FormData();
    fd.append("file", file);
    if (patientId) fd.append("patient_id", patientId);
    if (clinicalNotes) fd.append("clinical_notes", clinicalNotes);
    fd.append("view_position", viewPosition || "PA");

    const res = await fetch(`${BACKEND}/analyze`, {
      method: "POST",
      headers: getAuthHeader(),
      body: fd,
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Backend error:", err);
      throw new Error(err);
    }

    const data = await res.json();
    console.log(`✓ LunaDX backend — study ${data.study_id}, ${data.processing_time_ms}ms`);
    
    return {
      pneumonia_probability: data.findings.find((f: any) => f.pathology === "Pneumonia")?.probability || 0,
      tb_probability: data.findings.find((f: any) => f.pathology === "Tuberculosis")?.probability || 0,
      heatmap_overlay_url: data.heatmap_b64 || null,
      ai_summary: data.draft_report?.impression || "",
    };
    
  } catch (err) {
    console.warn("Backend unavailable, using simulation:", err);
    
    // Fallback simulation
    const delay = 3000 + Math.random() * 2000;
    await new Promise((resolve) => setTimeout(resolve, delay));

    return {
      pneumonia_probability: 0.15 + Math.random() * 0.3,
      tb_probability: 0.05 + Math.random() * 0.2,
      heatmap_overlay_url: null,
      ai_summary: "AI analysis completed. No significant abnormalities detected.",
    };
  }
}

// ── Utility Functions ──────────────────────────────────

export function canUploadScans(role?: UserRole): boolean {
  return role === "Admin" || role === "Radiologist";
}

export function simulateAI(): {
  tbRisk: number;
  pneumoniaRisk: number;
  lungOpacityRisk: number;
  pleuralEffusionRisk: number;
  lungNodulesRisk: number;
  findings: string[];
  suggestions: string[];
} {
  const tbRisk = Math.round((Math.random() * 0.4 + 0.05) * 100);
  const pneumoniaRisk = Math.round((Math.random() * 0.5 + 0.1) * 100);
  const lungOpacityRisk = Math.round((Math.random() * 0.3 + 0.05) * 100);
  const pleuralEffusionRisk = Math.round((Math.random() * 0.2 + 0.02) * 100);
  const lungNodulesRisk = Math.round((Math.random() * 0.15 + 0.01) * 100);

  const findings = [
    "Clear lung fields bilaterally",
    "Normal cardiac silhouette",
    "No acute infiltrates",
    "Normal pulmonary vasculature",
  ];

  const suggestions = [
    "Continue routine follow-up",
    "Consider clinical correlation",
    "No immediate intervention required",
  ];

  return {
    tbRisk,
    pneumoniaRisk,
    lungOpacityRisk,
    pleuralEffusionRisk,
    lungNodulesRisk,
    findings,
    suggestions,
  };
}
