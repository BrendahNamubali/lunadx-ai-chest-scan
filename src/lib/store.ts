// Simple localStorage-based store for prototype
export interface Patient {
  id: string;
  name: string;
  age: number;
  sex: "Male" | "Female" | "Other";
  hospitalId: string;
  symptoms: string;
  visitDate: string;
  createdAt: string;
}

export interface ScanResult {
  id: string;
  patientId: string;
  patientName: string;
  imageUrl: string;
  tbRisk: number;
  pneumoniaRisk: number;
  abnormalityScore: number;
  riskLevel: "Low" | "Medium" | "High";
  findings: string[];
  suggestions: string[];
  scanDate: string;
  doctorName: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: "Doctor" | "Admin";
  clinicName: string;
}

const PATIENTS_KEY = "lunadx_patients";
const SCANS_KEY = "lunadx_scans";
const USER_KEY = "lunadx_user";

// Demo users
const DEMO_USERS: Record<string, User & { password: string }> = {
  "doctor@lunadx.com": { id: "1", email: "doctor@lunadx.com", name: "Dr. Sarah Chen", role: "Doctor", clinicName: "Metro Health Clinic", password: "doctor123" },
  "admin@lunadx.com": { id: "2", email: "admin@lunadx.com", name: "James Wilson", role: "Admin", clinicName: "Metro Health Clinic", password: "admin123" },
};

export function login(email: string, password: string): User | null {
  const user = DEMO_USERS[email];
  if (user && user.password === password) {
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

export function getScans(): ScanResult[] {
  const data = localStorage.getItem(SCANS_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveScan(scan: ScanResult) {
  const scans = getScans();
  scans.unshift(scan);
  localStorage.setItem(SCANS_KEY, JSON.stringify(scans));
}

export function simulateAI(): Omit<ScanResult, "id" | "patientId" | "patientName" | "imageUrl" | "scanDate" | "doctorName"> {
  const tbRisk = Math.round(Math.random() * 100);
  const pneumoniaRisk = Math.round(Math.random() * 100);
  const abnormalityScore = Math.round((tbRisk * 0.5 + pneumoniaRisk * 0.3 + Math.random() * 20));
  const maxRisk = Math.max(tbRisk, pneumoniaRisk);
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
  const findings = allFindings.sort(() => Math.random() - 0.5).slice(0, numFindings);
  const suggestions = allSuggestions.sort(() => Math.random() - 0.5).slice(0, numFindings + 1);

  return { tbRisk, pneumoniaRisk, abnormalityScore: Math.min(abnormalityScore, 100), riskLevel, findings, suggestions };
}
