export type ScreeningMode = "pneumonia" | "tuberculosis";

export const SCREENING_OPTIONS: { value: ScreeningMode; label: string }[] = [
  { value: "pneumonia", label: "Pneumonia Screening" },
  { value: "tuberculosis", label: "Tuberculosis Screening" },
];

export function normalizeScreeningMode(mode?: string | null): ScreeningMode {
  if (mode === "tuberculosis" || mode === "tb") return "tuberculosis";
  return "pneumonia";
}

export function getScreeningCopy(mode?: ScreeningMode | null) {
  const m = mode ?? "pneumonia";
  if (m === "tuberculosis") {
    return {
      analysisTitle: "Tuberculosis Analysis",
      uploadSubtitle: "Upload a chest X-ray for AI-assisted tuberculosis screening.",
      primaryMetricLabel: "TB Risk",
      secondaryMetricLabel: "Tuberculosis",
      analyzeButton: "Analyze for Tuberculosis",
      analyzingLabel: "Running tuberculosis model…",
    };
  }
  return {
    analysisTitle: "Pneumonia Analysis",
    uploadSubtitle: "Upload a chest X-ray for AI-assisted pneumonia screening.",
    primaryMetricLabel: "Pneumonia Risk",
    secondaryMetricLabel: "Pneumonia",
    analyzeButton: "Analyze for Pneumonia",
    analyzingLabel: "Running pneumonia model…",
  };
}

export function primaryRiskForScan(scan: {
  screeningMode?: ScreeningMode;
  tbRisk: number;
  pneumoniaRisk: number;
}): number {
  const mode = normalizeScreeningMode(scan.screeningMode);
  return mode === "tuberculosis" ? scan.tbRisk : scan.pneumoniaRisk;
}
