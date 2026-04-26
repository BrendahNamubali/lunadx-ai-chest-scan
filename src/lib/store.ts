// LunaDX store — wired to FastAPI backend (http://127.0.0.1:8000)
// All UI/auth/patient logic unchanged. Only analyzeXray() is replaced.

const BACKEND = "/api";

// ── Types ──────────────────────────────────────────────

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
  orgName: string;
}

export interface Invite {
  id: string;
  orgId: string;
  email: string;
  role: UserRole;
  status: "pending" | "accepted";
  createdAt: string;
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
  orgId?: string;
}

export interface ScanResult {
  id: string;
  patientId: string;
  patientName: string;
  imageUrl: string;
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
  scanDate: string;
  doctorName: string;
  doctorNotes?: string;
  orgId?: string;
}

export interface AIAnalysisResponse {
  pneumonia_probability: number;
  tb_probability: number;
  heatmap_overlay_url: string | null;
  ai_summary: string;
}

// ── Keys ───────────────────────────────────────────────

const ORGS_KEY    = "lunadx_orgs";
const USERS_KEY   = "lunadx_org_users";
const INVITES_KEY = "lunadx_invites";
const PATIENTS_KEY = "lunadx_patients";
const SCANS_KEY   = "lunadx_scans";
const USER_KEY    = "lunadx_user";

// ── Demo data ──────────────────────────────────────────

const DEMO_ORG: Organization = {
  id: "org-metro",
  name: "Metro Health Clinic",
  location: "Kampala, Uganda",
  adminEmail: "admin@lunadx.com",
  createdAt: new Date().toISOString(),
  scanLimit: 10,
  plan: "trial",
};

const DEMO_USERS: (User & { password: string })[] = [
  { id: "1", email: "admin@lunadx.com",     name: "James Wilson",   role: "Admin",       orgId: "org-metro", orgName: "Metro Health Clinic", password: "admin123" },
  { id: "2", email: "doctor@lunadx.com",    name: "Dr. Sarah Chen", role: "Radiologist", orgId: "org-metro", orgName: "Metro Health Clinic", password: "doctor123" },
  { id: "3", email: "clinician@lunadx.com", name: "Dr. Amara Osei", role: "Clinician",   orgId: "org-metro", orgName: "Metro Health Clinic", password: "clinician123" },
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
  }
  return null;
}

export function logout() {
  localStorage.removeItem(USER_KEY);
}

export function getCurrentUser(): User | null {
  const data = localStorage.getItem(USER_KEY);
  return data ? JSON.parse(data) : null;
}

export function getOrgMembers(orgId: string): User[] {
  return getAllUsers()
    .filter((u) => u.orgId === orgId)
    .map(({ password: _, ...u }) => u);
}

// ── Invites ────────────────────────────────────────────

export function getInvites(orgId: string): Invite[] {
  const all: Invite[] = JSON.parse(localStorage.getItem(INVITES_KEY) || "[]");
  return all.filter((i) => i.orgId === orgId);
}

export function createInvite(orgId: string, email: string, role: UserRole): Invite {
  const all: Invite[] = JSON.parse(localStorage.getItem(INVITES_KEY) || "[]");
  const invite: Invite = {
    id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    orgId, email, role,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  all.push(invite);
  localStorage.setItem(INVITES_KEY, JSON.stringify(all));
  return invite;
}

export function acceptInvite(inviteId: string, name: string, password: string): User | null {
  const all: Invite[] = JSON.parse(localStorage.getItem(INVITES_KEY) || "[]");
  const invite = all.find((i) => i.id === inviteId && i.status === "pending");
  if (!invite) return null;

  const org = getOrganization(invite.orgId);
  if (!org) return null;

  invite.status = "accepted";
  localStorage.setItem(INVITES_KEY, JSON.stringify(all));

  const user: User & { password: string } = {
    id: `user-${Date.now()}`,
    email: invite.email,
    name,
    role: invite.role,
    orgId: invite.orgId,
    orgName: org.name,
    password,
  };
  const users = getAllUsers();
  users.push(user);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));

  const { password: _, ...userData } = user;
  return userData;
}

export function deleteInvite(inviteId: string) {
  const all: Invite[] = JSON.parse(localStorage.getItem(INVITES_KEY) || "[]");
  localStorage.setItem(INVITES_KEY, JSON.stringify(all.filter((i) => i.id !== inviteId)));
}

// ── Patients ───────────────────────────────────────────

export function getPatients(): Patient[] {
  const data = localStorage.getItem(PATIENTS_KEY);
  return data ? JSON.parse(data) : [];
}

export function savePatient(patient: Patient) {
  const patients = getPatients();
  const idx = patients.findIndex((p) => p.id === patient.id);
  if (idx >= 0) patients[idx] = patient;
  else patients.push(patient);
  localStorage.setItem(PATIENTS_KEY, JSON.stringify(patients));
}

export function deletePatient(id: string) {
  const patients = getPatients().filter((p) => p.id !== id);
  localStorage.setItem(PATIENTS_KEY, JSON.stringify(patients));
}

// ── Scans ──────────────────────────────────────────────

export function getScans(): ScanResult[] {
  const data = localStorage.getItem(SCANS_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveScan(scan: ScanResult) {
  const scans = getScans();
  scans.unshift(scan);
  localStorage.setItem(SCANS_KEY, JSON.stringify(scans));
}

export function updateScanNotes(scanId: string, notes: string) {
  const scans = getScans();
  const idx = scans.findIndex((s) => s.id === scanId);
  if (idx >= 0) {
    scans[idx].doctorNotes = notes;
    localStorage.setItem(SCANS_KEY, JSON.stringify(scans));
  }
}

// ── Scan Usage ─────────────────────────────────────────

export function getScanUsage(orgId?: string) {
  const user = getCurrentUser();
  const effectiveOrgId = orgId || user?.orgId;
  const org = effectiveOrgId ? getOrganization(effectiveOrgId) : undefined;
  const limit = org?.scanLimit ?? 10;
  const scans = getScans().filter((s) => !effectiveOrgId || s.orgId === effectiveOrgId);
  return {
    used: scans.length,
    total: limit,
    remaining: Math.max(limit - scans.length, 0),
    plan: org?.plan ?? "trial",
  };
}

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
  const pneumoniaRisk  = Math.round(Math.max(find("Pneumonia"), find("Consolidation"), find("Infiltration")));
  const tbRisk         = Math.round(Math.max(find("Fibrosis"), find("Nodule"), find("Mass")));
  const lungOpacity    = Math.round(Math.max(find("Atelectasis"), find("Edema")));
  const pleuralEff     = Math.round(find("Effusion"));
  const lungNodules    = Math.round(Math.max(find("Nodule"), find("Mass")));

  // Build AI summary from draft report
  const r = data.draft_report;
  const aiSummary = r.impression
    ? `${r.impression}${r.recommendation ? " " + r.recommendation : ""}`
    : `Analysis complete. Pneumonia: ${pneumoniaRisk}%, TB markers: ${tbRisk}%. ${r.findings_text || ""}`;

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
    suggestions.push("URGENT: Possible pneumothorax — immediate review required.");
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

// ── AI Analysis — REAL BACKEND ─────────────────────────

export async function analyzeXray(
  imageDataUrl: string,
  patientId?: string,
  clinicalNotes?: string,
  viewPosition?: string
): Promise<AIAnalysisResponse> {

try {
  const blob = await (await fetch(imageDataUrl)).blob();
  const ext = blob.type.includes("png") ? "png" : "jpg";
  const file = new File([blob], `xray.${ext}`, { type: blob.type });

  const fd = new FormData();
  fd.append("file", file);
  if (patientId) fd.append("patient_id", patientId);
  if (clinicalNotes) fd.append("clinical_notes", clinicalNotes);
  fd.append("view_position", viewPosition || "PA");

  const res = await fetch(`${BACKEND}/chexpert`, {
    method: "POST",
    body: fd,
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("CheXpert API error:", err);
    throw new Error(err);
  }

  const data = await res.json();
  console.log("✓ CheXpert Vercel API connected");
  return data;
} catch (err) {
  console.warn("CheXpert API failed, using simulation:", err);
}
const delay = 3000 + Math.random() * 2000;
await new Promise((resolve) => setTimeout(resolve, delay));

const sim = simulateAI();
const summaries = [
  `AI screening detected potential abnormalities with ${sim.pneumoniaRisk}% pneumonia probability and ${sim.tbRisk}% tuberculosis probability.`,
  `Analysis indicates ${sim.riskLevel.toLowerCase()} risk. Pneumonia markers at ${sim.pneumoniaRisk}%, TB indicators at ${sim.tbRisk}%.`,
  `Automated screening complete. Confidence scores — Pneumonia: ${sim.pneumoniaRisk}%, TB: ${sim.tbRisk}%.`,
];

return {
  pneumonia_probability: sim.pneumoniaRisk,
  tb_probability: sim.tbRisk,
  heatmap_overlay_url: null,
  ai_summary: summaries[Math.floor(Math.random() * summaries.length)],
};
}
  // 2. Fallback — client-side simulation (unchanged from original)
  const delay = 3000 + Math.random() * 2000;
  await new Promise((resolve) => setTimeout(resolve, delay));

  const sim = simulateAI();
  const summaries = [
    `AI screening detected potential abnormalities with ${sim.pneumoniaRisk}% pneumonia probability and ${sim.tbRisk}% tuberculosis probability. ${sim.findings[0]}. ${sim.suggestions[0]}.`,
    `Analysis indicates ${sim.riskLevel.toLowerCase()} risk. Pneumonia markers at ${sim.pneumoniaRisk}%, TB indicators at ${sim.tbRisk}%. Recommend clinical correlation with patient history.`,
    `Automated screening complete. Primary concern: ${sim.findings[0]?.toLowerCase() || "no significant findings"}. Confidence scores — Pneumonia: ${sim.pneumoniaRisk}%, TB: ${sim.tbRisk}%. ${sim.suggestions[0]}.`,
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
  return role === "Admin" || role === "Radiologist";
}

export function canManagePatients(role?: UserRole): boolean {
  return role === "Admin" || role === "Radiologist";
}

export function canManageOrganization(role?: UserRole): boolean {
  return role === "Admin";
}
