// Chest Findings Analysis — frontend placeholder service.
// Returns an empty response structure only. No diagnostic values are produced here.
// Later this will POST the image to the CheXpert model backend.

export type ChestFindingStatus = "detected" | "not_detected" | "review" | "pending";

export interface ChestFinding {
  /** Finding name as shown to clinicians */
  name: string;
  /** Detection status — "pending" until a backend result is available */
  status: ChestFindingStatus;
  /** Confidence 0-100, null while unavailable */
  confidence: number | null;
}

export interface ChestFindingsResult {
  studyId: string | null;
  analysedAt: string | null;
  findings: ChestFinding[];
  clinicalSummary: string;
  /** True while no backend model is connected */
  pending: boolean;
}

export const CHEST_FINDING_NAMES = [
  "Cardiomegaly",
  "Pleural Effusion",
  "Pneumothorax",
  "Lung Opacity",
  "Edema",
  "Consolidation",
  "Fracture",
] as const;

export const CLINICAL_SUMMARY_TEXT =
  "Potential findings identified from the chest X-ray. Results should be reviewed alongside clinical judgement.";

export function createEmptyChestFindingsResult(): ChestFindingsResult {
  return {
    studyId: null,
    analysedAt: null,
    findings: CHEST_FINDING_NAMES.map((name) => ({
      name,
      status: "pending" as ChestFindingStatus,
      confidence: null,
    })),
    clinicalSummary: CLINICAL_SUMMARY_TEXT,
    pending: true,
  };
}

/**
 * Placeholder analysis entry point for the Chest Findings module.
 * Accepts an uploaded X-ray (data URL or File) and returns an empty
 * result structure. Swap the body for a CheXpert backend call later.
 */
export async function analyzeChestFindings(
  _image: string | File,
  _options?: { patientId?: string; clinicalNotes?: string; viewPosition?: string }
): Promise<ChestFindingsResult> {
  // TODO: connect to CheXpert backend endpoint and map the response here.
  return createEmptyChestFindingsResult();
}
