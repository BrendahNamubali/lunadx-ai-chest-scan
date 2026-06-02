// LunaDX Store (Clean Restart Version)

const BACKEND = "https://breekie-lunadx-backend.hf.space";

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

<<<<<<< HEAD
  if (!raw) {
    return {
      id: "1",
      name: "Demo Admin",
      email: "admin@lunadx.com",
      role: "Admin",
    };
=======
const DEMO_USERS: (User & { password: string })[] = [
  { id: "1", email: "admin@lunadx.com",     name: "LunaDX Admin",   role: "Admin",       orgId: "org-metro", orgName: "Metro Health Clinic", password: "LunaDX@2026!" },
  { id: "2", email: "doctor@lunadx.com",    name: "Dr. Sarah Malaika", role: "Radiologist", orgId: "org-metro", orgName: "Metro Health Clinic", password: "LunaDX@2026!" },
  { id: "3", email: "clinician@lunadx.com", name: "Dr. Amara Joan", role: "Clinician",   orgId: "org-metro", orgName: "Metro Health Clinic", password: "LunaDX@2026!" },
];

function ensureDemoData() {
  if (!localStorage.getItem(ORGS_KEY))  localStorage.setItem(ORGS_KEY,  JSON.stringify([DEMO_ORG]));
  if (!localStorage.getItem(USERS_KEY)) localStorage.setItem(USERS_KEY, JSON.stringify(DEMO_USERS));
}

// ── Organization CRUD ──────────────────────────────────

export function getOrganizations(): Organization[] {
  ensureDemoData();
  return JSON.parse(localStorage.getItem(ORGS_KEY) || "[]");
}

export function getOrganization(id: string): Organization | undefined {
  return getOrganizations().find((o) => o.id === id);
}

export function createOrganization(data: {
  name: string; location: string; adminEmail: string; adminName: string; password: string;
}): { org: Organization; user: User } {
  const orgs = getOrganizations();
  const org: Organization = {
    id: `org-${Date.now()}`,
    name: data.name,
    location: data.location,
    adminEmail: data.adminEmail,
    createdAt: new Date().toISOString(),
    scanLimit: 10,
    plan: "trial",
  };
  orgs.push(org);
  localStorage.setItem(ORGS_KEY, JSON.stringify(orgs));

  const user: User & { password: string } = {
    id: `user-${Date.now()}`,
    email: data.adminEmail,
    name: data.adminName,
    role: "Admin",
    orgId: org.id,
    orgName: org.name,
    password: data.password,
  };
  const users = getAllUsers();
  users.push(user);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));

  const { password: _, ...userData } = user;
  return { org, user: userData };
}

// ── User / Auth ────────────────────────────────────────

function getAllUsers(): (User & { password: string })[] {
  ensureDemoData();
  return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
}

export function login(email: string, password: string): User | null {
  const users = getAllUsers();
  const user = users.find((u) => u.email === email && u.password === password);
  if (user) {
    const { password: _, ...userData } = user;
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    return userData;
>>>>>>> clean-baseline
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
<<<<<<< HEAD
  const limit = 50;
=======
  // Strip image data before saving - images are too large for localStorage
  const scanToSave = { ...scan, imageUrl: "" };
  scans.unshift(scanToSave);
  // Keep only last 20 scans to prevent quota issues
  const trimmed = scans.slice(0, 20);
  try {
    localStorage.setItem(SCANS_KEY, JSON.stringify(trimmed));
  } catch (e) {
    // If still too large, keep only last 5
    localStorage.setItem(SCANS_KEY, JSON.stringify(trimmed.slice(0, 5)));
  }
}
>>>>>>> clean-baseline

  return {
    used: scans.length,
    total: limit,
    remaining: Math.max(limit - scans.length, 0),
  };
}

<<<<<<< HEAD
// ─────────────────────────────────────────────
// AI Analysis
// ─────────────────────────────────────────────
=======
// ── PATHOLOGY MAP: CheXNet → LunaDX fields ────────────
// Backend returns 14 CheXNet pathologies. We map them to
// the 5 risk scores the UI expects.

interface BackendFinding {
  pathology: string;
  probability: number;
  severity: string;
  icd10_code: string;
}

interface BackendResponse {
  study_id: string;
  findings: BackendFinding[];
  heatmap_b64: string;
  draft_report: {
    indication?: string;
    technique?: string;
    findings_text?: string;
    impression?: string;
    recommendation?: string;
    source?: string;
  };
  processing_time_ms: number;
  used_simulation: boolean;
}

function mapBackendToUI(data: BackendResponse, imageDataUrl: string): AIAnalysisResponse {
  const find = (name: string) =>
    (data.findings.find((f) => f.pathology === name)?.probability ?? 0) * 100;

  // Map CheXNet pathologies to the 5 UI scores
  const pneumoniaRisk  = Math.round(find("Pneumonia") * 100);
  const tbRisk         = 0;
  const lungOpacity    = 0;
  const pleuralEff     = 0;
  const lungNodules    = 0;
  const topFinding = [...data.findings].sort((a, b) => b.probability - a.probability)[0];

  // Build AI summary from draft report
  const r = data.draft_report;
  const aiSummary = r.impression
    ? `${r.impression}${r.recommendation ? " " + r.recommendation : ""}`
    : topFinding
    ? `Analysis complete. Primary finding: ${topFinding.pathology} (${Math.round(topFinding.probability * 100)}% confidence).`
    : "Analysis complete. No significant findings detected.";

  // Store heatmap in sessionStorage so ResultsPage can pick it up
  if (data.heatmap_b64) {
    sessionStorage.setItem("lunadx_last_heatmap", `data:image/png;base64,${data.heatmap_b64}`);
    sessionStorage.setItem("lunadx_last_study_id", data.study_id);
  }

  // Store full findings for display
  sessionStorage.setItem("lunadx_last_findings", JSON.stringify(data.findings));
  sessionStorage.setItem("lunadx_last_report", JSON.stringify(data.draft_report));

  return {
    pneumonia_probability: pneumoniaRisk,
    tb_probability: tbRisk,
    heatmap_overlay_url: data.heatmap_b64
      ? `data:image/png;base64,${data.heatmap_b64}`
      : null,
    ai_summary: aiSummary,
    // Extra fields passed through for UploadPage to build ScanResult
    _lungOpacityRisk:    lungOpacity,
    _pleuralEffusionRisk: pleuralEff,
    _lungNodulesRisk:    lungNodules,
    _findings:           data.findings
      .filter((f) => f.severity !== "normal")
      .map((f) => `${f.pathology}: ${(f.probability * 100).toFixed(0)}% [${f.icd10_code}]`),
    _suggestions:        buildSuggestions(data.findings),
    _studyId:            data.study_id,
    _usedSimulation:     data.used_simulation,
    _draftReport:        data.draft_report,
  } as AIAnalysisResponse & Record<string, unknown>;
}

function buildSuggestions(findings: BackendFinding[]): string[] {
  const flagged = findings.filter((f) => f.severity === "flagged");
  const suggestions: string[] = [];

  if (flagged.some((f) => f.pathology === "Pneumothorax"))
    suggestions.push("URGENT: Possible pneumothorax - immediate review required.");
  if (flagged.some((f) => ["Pneumonia", "Consolidation"].includes(f.pathology)))
    suggestions.push("Recommend clinical correlation and possible antibiotic therapy.");
  if (flagged.some((f) => ["Nodule", "Mass"].includes(f.pathology)))
    suggestions.push("CT scan recommended for detailed nodule/mass characterisation.");
  if (flagged.some((f) => f.pathology === "Effusion"))
    suggestions.push("Consider thoracentesis if effusion is clinically significant.");
  if (flagged.some((f) => ["Fibrosis", "Emphysema"].includes(f.pathology)))
    suggestions.push("Pulmonology referral recommended for chronic lung disease evaluation.");
  if (suggestions.length === 0)
    suggestions.push("Routine radiologist review. No urgent findings identified.");

  suggestions.push("All AI findings must be reviewed and confirmed by a qualified radiologist.");
  return suggestions;
}

// ── AI Analysis - REAL BACKEND ─────────────────────────
>>>>>>> clean-baseline

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
<<<<<<< HEAD
=======

  const data = await res.json();
  console.log("✓ CheXpert Vercel API connected");
  return mapBackendToUI(data, imageDataUrl);
} catch (err) {
  console.warn("CheXpert API failed, using simulation:", err);
}

  // 2. Fallback - client-side simulation (unchanged from original)
  const delay = 3000 + Math.random() * 2000;
  await new Promise((resolve) => setTimeout(resolve, delay));

  const sim = simulateAI();
  const summaries = [
    `AI screening detected potential abnormalities with ${sim.pneumoniaRisk}% pneumonia probability and ${sim.tbRisk}% tuberculosis probability. ${sim.findings[0]}. ${sim.suggestions[0]}.`,
    `Analysis indicates ${sim.riskLevel.toLowerCase()} risk. Pneumonia markers at ${sim.pneumoniaRisk}%, TB indicators at ${sim.tbRisk}%. Recommend clinical correlation with patient history.`,
    `Automated screening complete. Primary concern: ${sim.findings[0]?.toLowerCase() || "no significant findings"}. Confidence scores - Pneumonia: ${sim.pneumoniaRisk}%, TB: ${sim.tbRisk}%. ${sim.suggestions[0]}.`,
  ];

  return {
    pneumonia_probability: sim.pneumoniaRisk,
    tb_probability: sim.tbRisk,
    heatmap_overlay_url: null,
    ai_summary: summaries[Math.floor(Math.random() * summaries.length)],
  };
}

// ── simulateAI (unchanged) ─────────────────────────────

export function simulateAI(): Omit<ScanResult, "id" | "patientId" | "patientName" | "imageUrl" | "scanDate" | "doctorName"> {
  const tbRisk             = Math.round(Math.random() * 100);
  const pneumoniaRisk      = Math.round(Math.random() * 100);
  const lungOpacityRisk    = Math.round(Math.random() * 100);
  const pleuralEffusionRisk = Math.round(Math.random() * 100);
  const lungNodulesRisk    = Math.round(Math.random() * 100);
  const abnormalityScore   = Math.round(tbRisk * 0.3 + pneumoniaRisk * 0.2 + lungOpacityRisk * 0.2 + pleuralEffusionRisk * 0.15 + lungNodulesRisk * 0.15);
  const maxRisk = Math.max(tbRisk, pneumoniaRisk, lungOpacityRisk, pleuralEffusionRisk, lungNodulesRisk);
  const riskLevel: "Low" | "Medium" | "High" = maxRisk > 70 ? "High" : maxRisk > 40 ? "Medium" : "Low";

  const allFindings = [
    "Opacity detected in upper right lobe",
    "Bilateral hilar lymphadenopathy noted",
    "Pleural effusion suspected in left lower zone",
    "Patchy consolidation in right middle lobe",
    "Cavitary lesion in left upper lobe",
    "Miliary pattern observed",
    "Cardiomegaly noted",
    "No significant abnormalities detected",
  ];

  const allSuggestions = [
    "Recommend sputum AFB smear and culture",
    "Suggest CT scan for detailed evaluation",
    "Refer to radiologist for confirmation",
    "Schedule follow-up imaging in 2 weeks",
    "Consider GeneXpert MTB/RIF test",
    "Routine follow-up recommended",
    "Initiate empiric antibiotic therapy pending results",
  ];

  const numFindings = riskLevel === "High" ? 3 : riskLevel === "Medium" ? 2 : 1;
  const findings    = allFindings.sort(() => Math.random() - 0.5).slice(0, numFindings);
  const suggestions = allSuggestions.sort(() => Math.random() - 0.5).slice(0, numFindings + 1);

  return {
    tbRisk, pneumoniaRisk, lungOpacityRisk, pleuralEffusionRisk, lungNodulesRisk,
    abnormalityScore: Math.min(abnormalityScore, 100),
    riskLevel, findings, suggestions,
  };
}

// ── Role helpers (unchanged) ───────────────────────────

export function canUploadScans(role?: UserRole): boolean {
  return role === "Admin" || role === "Radiologist" || role === "Clinician";
}

export function canManagePatients(role?: UserRole): boolean {
  return role === "Admin" || role === "Radiologist";
}

export function canManageOrganization(role?: UserRole): boolean {
  return role === "Admin";
>>>>>>> clean-baseline
}
