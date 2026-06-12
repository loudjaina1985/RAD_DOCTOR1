export type ActiveTab = "WORKSPACE" | "ROLES" | "BLUEPRINTS";

export type Language = "English" | "French" | "Arabic";

export type BodyRegion = 
  | "Chest X-ray"
  | "Pelvis X-ray"
  | "Spine X-ray"
  | "Upper Limb X-ray"
  | "Lower Limb X-ray"
  | "Hand and Foot X-ray";

export interface Patient {
  id: string;
  name: string;
  gender: "Male" | "Female" | "Other";
  age: number;
  mrn: string;
}

export interface Study {
  id: string;
  patientId: string;
  date: string;
  bodyRegion: BodyRegion;
  pathologyType: "Normal study" | "Bone fracture" | "Pneumonia" | "Pneumothorax" | "Bone Lesion";
  confidenceScore: number;
  boundingBoxes: Array<{ x: number; y: number; w: number; h: number; label: string }>;
  heatmapCenters: Array<{ x: number; y: number; r: number; intensity: number }>;
  customImageSrc?: string;
  preliminaryFindings?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  action: string;
  details: string;
  ip: string;
}

export interface Annotation {
  type: "line" | "freehand";
  points: Array<{ x: number; y: number }>;
  color: string;
  label?: string;
  value?: string; // e.g. "45.2 mm"
}
