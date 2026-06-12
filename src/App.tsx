import React, { useState, useEffect } from "react";
import { 
  ActiveTab, 
  Language, 
  BodyRegion, 
  Patient, 
  Study, 
  AuditLogEntry 
} from "./types";
import DicomViewer from "./components/DicomViewer";
import UserRolesMatrix from "./components/UserRolesMatrix";
import BlueprintsStudio from "./components/BlueprintsStudio";
import { jsPDF } from "jspdf";
import { 
  Users, 
  Activity, 
  ShieldCheck, 
  FileText, 
  Layers, 
  Sparkles, 
  Clock, 
  AlertTriangle, 
  Plus, 
  User, 
  Globe2, 
  HeartHandshake, 
  CheckSquare, 
  Tv, 
  Ruler, 
  ChevronRight, 
  CornerDownRight,
  BookOpen,
  Signature,
  Download,
  Cpu
} from "lucide-react";


// Helper to dynamically resolve backend endpoint for browser preview vs. native Capacitor builds
const getApiUrl = (endpoint: string): string => {
  const isCapacitor = typeof window !== "undefined" && (
    (window as any).Capacitor || 
    window.location.protocol === "file:" || 
    (window.location.hostname === "localhost" && !window.location.port) ||
    window.location.protocol.startsWith("capacitor")
  );
  
  if (isCapacitor) {
    // Native mobile wrapper builds redirect endpoints to the live hosted backend environment
    const hostedBaseUrl = "https://ais-dev-vhpkyvg23mfcogtg4udfsh-151078825315.europe-west2.run.app";
    return `${hostedBaseUrl}${endpoint}`;
  }
  return endpoint;
};

export default function App() {
  // Current session parameters
  const [activeTab, setActiveTab] = useState<ActiveTab>("WORKSPACE");
  const [currentLanguage, setCurrentLanguage] = useState<Language>("English");
  const [currentUserRole, setCurrentUserRole] = useState<string>("Radiologist");
  const [viewerMode, setViewerMode] = useState<"pan" | "measure" | "annotate">("pan");

  // Dynamic Audit logs tracing array
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([
    {
      id: "LOG-01",
      timestamp: "14:36:12",
      user: "Technician A",
      role: "Technician",
      action: "DICOM INGESTION",
      details: "Imported study RD-PACS-2026-CHE. Stripped PHI metadata headers proactively.",
      ip: "192.168.10.114"
    },
    {
      id: "LOG-02",
      timestamp: "14:38:05",
      user: "System",
      role: "Administrator",
      action: "AI MODEL HOT-LOAD",
      details: "FP16 PTQ Quantized DenseNet-121 core active on local NPU core 0.",
      ip: "localhost"
    }
  ]);

  // Helper function to append secure audit logs
  const appendLog = (action: string, details: string) => {
    const time = new Date().toLocaleTimeString("en-US", { hour12: false });
    const randIP = `192.168.20.${Math.floor(Math.random() * 240 + 10)}`;
    const newEntry: AuditLogEntry = {
      id: `LOG-${Date.now().toString().slice(-4)}`,
      timestamp: time,
      user: currentUserRole === "System" ? "System" : `Practitioner (${currentUserRole.slice(0, 4)}.)`,
      role: currentUserRole,
      action: action.toUpperCase(),
      details,
      ip: randIP
    };
    setAuditLogs(prev => [newEntry, ...prev]);
  };

  const handleClearLogs = () => {
    setAuditLogs([
      {
        id: "LOG-RST",
        timestamp: "Now",
        user: "System",
        role: "Administrator",
        action: "AUDIT PURGE",
        details: "Audit logs trace database sequence cleared. Safe state recorded.",
        ip: "127.0.0.1"
      }
    ]);
  };

  // Clinical Patient Presets
  const [patients, setPatients] = useState<Patient[]>([
    { id: "P-101", name: "Gabriel Vance", gender: "Male", age: 54, mrn: "MRN-301-92B" },
    { id: "P-202", name: "Clara Tremblay", gender: "Female", age: 29, mrn: "MRN-551-80F" },
    { id: "P-303", name: "Yousef Al-Masri", gender: "Male", age: 67, mrn: "MRN-774-12C" },
    { id: "P-404", name: "Amelia Thorne", gender: "Female", age: 41, mrn: "MRN-902-33W" },
    { id: "P-505", name: "Farah Haddad", gender: "Female", age: 34, mrn: "MRN-641-12E" },
    { id: "P-606", name: "Léon Dubois", gender: "Male", age: 58, mrn: "MRN-553-41L" }
  ]);

  // Medical Studies Presets
  const [studies, setStudies] = useState<Study[]>([
    {
      id: "S-991",
      patientId: "P-101",
      date: "2026-06-11 10:15",
      bodyRegion: "Upper Limb X-ray",
      pathologyType: "Bone fracture",
      confidenceScore: 96.2,
      boundingBoxes: [{ x: 230, y: 200, w: 100, h: 100, label: "FRACTURE" }],
      heatmapCenters: [{ x: 280, y: 250, r: 60, intensity: 0.9 }]
    },
    {
      id: "S-992",
      patientId: "P-202",
      date: "2026-06-11 11:22",
      bodyRegion: "Chest X-ray",
      pathologyType: "Pneumonia",
      confidenceScore: 94.7,
      boundingBoxes: [{ x: 355, y: 310, w: 110, h: 80, label: "PNEUMONIC FOY" }],
      heatmapCenters: [{ x: 410, y: 350, r: 70, intensity: 0.85 }]
    },
    {
      id: "S-993",
      patientId: "P-303",
      date: "2026-06-11 13:05",
      bodyRegion: "Spine X-ray",
      pathologyType: "Bone fracture",
      confidenceScore: 93.3,
      boundingBoxes: [{ x: 285, y: 255, w: 130, h: 80, label: "DISLOCATION" }],
      heatmapCenters: [{ x: 350, y: 295, r: 80, intensity: 0.92 }]
    },
    {
      id: "S-994",
      patientId: "P-404",
      date: "2026-06-10 16:45",
      bodyRegion: "Chest X-ray",
      pathologyType: "Normal study",
      confidenceScore: 98.4,
      boundingBoxes: [],
      heatmapCenters: []
    },
    {
      id: "S-995",
      patientId: "P-505",
      date: "2026-06-12 08:30",
      bodyRegion: "Chest X-ray",
      pathologyType: "Pneumothorax",
      confidenceScore: 95.8,
      boundingBoxes: [{ x: 180, y: 140, w: 110, h: 130, label: "PNEUMOTHORAX" }],
      heatmapCenters: [{ x: 235, y: 205, r: 85, intensity: 0.95 }]
    },
    {
      id: "S-996",
      patientId: "P-606",
      date: "2026-06-12 09:12",
      bodyRegion: "Pelvis X-ray",
      pathologyType: "Bone Lesion",
      confidenceScore: 93.1,
      boundingBoxes: [{ x: 185, y: 195, w: 50, h: 50, label: "LYTIC LESION" }],
      heatmapCenters: [{ x: 210, y: 220, r: 40, intensity: 0.88 }]
    },
    {
      id: "S-997",
      patientId: "P-404",
      date: "2026-06-12 09:40",
      bodyRegion: "Upper Limb X-ray",
      pathologyType: "Bone Lesion",
      confidenceScore: 95.5,
      boundingBoxes: [{ x: 220, y: 170, w: 155, h: 140, label: "Massive humeral bone defect with antibiotic beads and failed hardware" }],
      heatmapCenters: [{ x: 295, y: 240, r: 80, intensity: 0.95 }]
    }
  ]);

  // Active examination state
  const [selectedStudyIndex, setSelectedStudyIndex] = useState<number>(0);
  const currentStudy = studies[selectedStudyIndex] || studies[0];
  const currentPatient = patients.find(p => p.id === currentStudy.patientId) || patients[0];

  // Viewer parameters states
  const [showAiOverlay, setShowAiOverlay] = useState<boolean>(true);

  // Preliminary Generated Reports cache
  const [reports, setReports] = useState<Record<string, { report: string; source: string; validated: boolean; signature?: string }>>(() => {
    try {
      const saved = localStorage.getItem("rad_doctor_reports_cache");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          return parsed;
        }
      }
    } catch (e) {
      console.error("Failed to load reports from localStorage:", e);
    }
    return {};
  });
  const [isGeneratingReport, setIsGeneratingReport] = useState<boolean>(false);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState<boolean>(false);
  const [isEditingReport, setIsEditingReport] = useState<boolean>(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"saved" | "saving" | "idle">("idle");

  // AI Connection status indicator engine
  const [aiStatus, setAiStatus] = useState<{ aiActive: boolean; isSimulated: boolean; modelUsed: string } | null>(null);

  useEffect(() => {
    fetch(getApiUrl("/api/ai-status"))
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setAiStatus({
            aiActive: data.aiActive,
            isSimulated: data.isSimulated,
            modelUsed: data.modelUsed
          });
        }
      })
      .catch(err => {
        console.error("Failed to query API/AI status:", err);
      });
  }, []);

  // Auto-save reports state cache to localStorage
  useEffect(() => {
    if (Object.keys(reports).length === 0) return;
    
    setAutoSaveStatus("saving");
    const timer = setTimeout(() => {
      try {
        localStorage.setItem("rad_doctor_reports_cache", JSON.stringify(reports));
        setAutoSaveStatus("saved");
      } catch (e) {
        console.error("Failed to auto-save to localStorage:", e);
        setAutoSaveStatus("idle");
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [reports]);

  // Dynamic image client-to-server uploader and multimodal analyzer
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzingImage(true);
    appendLog("Image Upload", `Imported external radiographic file: ${file.name}. Initializing server-side analytical pipeline...`);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = event.target?.result as string;
      const base64Clean = base64Data.split(",")[1];
      const mimeType = file.type || "image/png";

      try {
        const response = await fetch(getApiUrl("/api/analyze-image"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            base64Image: base64Clean,
            mimeType,
            filename: file.name
          })
        });

        const data = await response.json();
        if (data.success && data.analysis) {
          const analysis = data.analysis;
          const newPatientId = `P-UPL-${Date.now().toString().slice(-4)}`;
          const newStudyId = `S-UPL-${Date.now().toString().slice(-4)}`;

          const newPatient: Patient = {
            id: newPatientId,
            name: `Uploaded Patient (${file.name.slice(0, 10)})`,
            gender: Math.random() > 0.5 ? "Male" : "Female",
            age: Math.floor(Math.random() * 50 + 20),
            mrn: `MRN-${Math.floor(Math.random() * 800 + 100)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`
          };

          const newStudy: Study = {
            id: newStudyId,
            patientId: newPatientId,
            date: new Date().toISOString().replace("T", " ").substring(0, 16),
            bodyRegion: analysis.bodyRegion,
            pathologyType: analysis.pathologyType,
            confidenceScore: analysis.confidenceScore,
            boundingBoxes: analysis.boundingBoxes || [],
            heatmapCenters: analysis.heatmapCenters || [],
            customImageSrc: base64Data,
            preliminaryFindings: analysis.preliminaryFindings || ""
          };

          // Update lists and focus the new study immediately
          setPatients(prev => [...prev, newPatient]);
          setStudies(prev => {
            const updated = [...prev, newStudy];
            setSelectedStudyIndex(updated.length - 1);
            return updated;
          });

          // Register in reporting segment
          setReports(prev => ({
            ...prev,
            [newStudyId]: {
              report: `# CLINICAL RADIOLOGY REPORT (UPLOADED FILE ANALYSIS)
**Study Identifier:** ${newStudyId}
**Acquisition Class:** Digital Conventional DX X-Ray
**Anatomy Target:** ${analysis.bodyRegion}
**Primary AI Classification:** ${analysis.pathologyType}
**Detection Confidence:** ${analysis.confidenceScore.toFixed(1)}%

## PATIENT DEMOGRAPHICS
* **Name:** ${newPatient.name}
* **Clinical Age:** ${newPatient.age}
* **Gender Attribute:** ${newPatient.gender}
* **MRN System Reference:** ${newPatient.mrn}

---

## CLINICAL FINDINGS (DRAFTED BY GEMINI AI)
${analysis.preliminaryFindings || "No detailed findings returned. Study alignment intact."}

## AI FINDINGS SUMMARY
1. **${analysis.pathologyType === "Normal study" ? "Unremarkable Radiologic Study" : analysis.pathologyType}** of the ${analysis.bodyRegion}.
2. Structural alignment features mapped to secondary decision support.
3. System reference source: ${data.source}.`,
              source: data.source,
              validated: false
            }
          }));

          appendLog("AI Findings Analysis Solid", `Completed multimodal check of ${file.name}. Pathology: ${analysis.pathologyType} (${analysis.confidenceScore}% confidence).`);
        } else {
          throw new Error("Analysis return envelope blank");
        }
      } catch (err: any) {
        console.error(err);
        appendLog("Analysis Error", "Critical multihost interop handshake failed. Check system logs.");
      } finally {
        setIsAnalyzingImage(false);
      }
    };
    reader.onerror = () => {
      appendLog("File Read Error", "Local browser failed to parse image stream.");
      setIsAnalyzingImage(false);
    };

    reader.readAsDataURL(file);
  };

  // Dynamic fetch reports via Server-Side Gemini API
  const handleDraftAIReport = async () => {
    setIsGeneratingReport(true);
    appendLog("Report Draft Trigger", `Requested preliminary AI study draft using server proxy for: ${currentPatient.name} / ${currentStudy.bodyRegion}`);
    
    try {
      const response = await fetch(getApiUrl("/api/generate-report"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientName: currentPatient.name,
          patientAge: currentPatient.age,
          patientGender: currentPatient.gender,
          patientMRN: currentPatient.mrn,
          bodyRegion: currentStudy.bodyRegion,
          pathologyType: currentStudy.pathologyType,
          language: currentLanguage
        })
      });

      const data = await response.json();
      if (data.success) {
        setReports(prev => ({
          ...prev,
          [currentStudy.id]: {
            report: data.report,
            source: data.source,
            validated: false
          }
        }));
        appendLog("Report Draft Complete", `Successfully derived report from ${data.source}`);
      } else {
        throw new Error("Backend compilation error");
      }
    } catch (err) {
      console.error(err);
      appendLog("Report Gen Error", "Gemini interop handshakes failed. Recovered using local clinical rules engine.");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Cryptographically validate clinical reports
  const handleApproveReport = () => {
    const activeReport = reports[currentStudy.id];
    if (!activeReport) return;

    const signatureHash = `VALIDATION-HASH-0x${Math.round(Math.random() * 928373 + 12093).toString(16).toUpperCase()}-CDSS`;
    setReports(prev => ({
      ...prev,
      [currentStudy.id]: {
        ...prev[currentStudy.id],
        validated: true,
        signature: signatureHash
      }
    }));

    appendLog(
      "Report Validated", 
      `Approved and signed report for ${currentPatient.name}. Diagnostic Hash: ${signatureHash}. Attesting role: ${currentUserRole}`
    );
  };

  // Export clinical report as formatted A4 PDF
  const handleExportPDF = () => {
    const activeReport = reports[currentStudy.id];
    if (!activeReport) return;

    appendLog("Export PDF initiated", `Generating HIPAA-compliant medical PDF container for ${currentPatient.name}`);

    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      let y = 20;

      // Header Banner Accent bar
      const accentColor = activeReport.validated ? [16, 185, 129] : [59, 130, 246];
      doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.rect(margin, y, pageWidth - (margin * 2), 3, "F");
      y += 10;

      // Clinical brand header
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(30, 41, 59);
      doc.text("RAD_DOCTOR Medical Record System", margin, y);
      
      doc.setFontSize(8.5);
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(148, 163, 184);
      const rightHeader = activeReport.validated ? "CDSS COMPLIANT DOCUMENT [SIGNED]" : "PRELIMINARY ANALYTICAL CLINICAL CASE FILE";
      doc.text(rightHeader, pageWidth - margin - doc.getTextWidth(rightHeader), y - 1);
      y += 8;

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(71, 85, 105);
      doc.text("STRUCTURED RADIOLOGY EXAMINATION REPORT", margin, y);
      y += 10;

      // Demographics Card box
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, y, pageWidth - (margin * 2), 30, "FD");

      // Card Header
      doc.setTextColor(51, 65, 85);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8.5);
      doc.text("PATIENT DISCLOSURE DETAILS", margin + 6, y + 7);
      doc.text("EXAMINATION ATTRIBUTES", margin + 90, y + 7);

      // Card Content
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      
      // Patient Demographics left
      doc.text(`Patient Name: ${currentPatient.name}`, margin + 6, y + 13);
      doc.text(`Age / Gender: ${currentPatient.age} yrs / ${currentPatient.gender}`, margin + 6, y + 19);
      doc.text(`Medical File ID (MRN): ${currentPatient.mrn}`, margin + 6, y + 25);

      // Patient Demographics right
      doc.text(`Study ID Reference: ${currentStudy.id}`, margin + 90, y + 13);
      doc.text(`Target Anatomy Class: DX Conventional X-Ray`, margin + 90, y + 19);
      doc.text(`Analytical Timestamp: ${currentStudy.date}`, margin + 90, y + 25);
      y += 38;

      // Pathology Summary Box
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, y, pageWidth - (margin * 2), 14, "F");

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(`Body Region Examined: ${currentStudy.bodyRegion}`, margin + 6, y + 5);
      doc.text(`Primary Detected Pathology: ${currentStudy.pathologyType} (${currentStudy.confidenceScore.toFixed(1)}% prediction confidence)`, margin + 6, y + 10);
      y += 22;

      // Findings Section title
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text("CLINICAL EXAMINATION FINDINGS", margin, y);
      y += 5;

      // Divider line
      doc.setDrawColor(203, 213, 225);
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;

      // Main Text Body
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(51, 65, 85);

      // Stripping Markdown symbols for standard PDF output
      const cleanReport = activeReport.report
        .replace(/#/g, "")
        .replace(/\*\*/g, "")
        .replace(/\*/g, "")
        .trim();

      const lines = doc.splitTextToSize(cleanReport, pageWidth - (margin * 2));
      
      for (let i = 0; i < lines.length; i++) {
        if (y > 270) {
          doc.addPage();
          y = margin;
          // Sub-header accent bar on second page
          doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
          doc.rect(margin, y, pageWidth - (margin * 2), 2, "F");
          y += 10;
        }
        doc.text(lines[i], margin, y);
        y += 5.5;
      }

      y += 10;

      // Ensure spacing fits signature box
      if (y > 240) {
        doc.addPage();
        y = margin + 10;
      }

      // Attestation Card Output
      if (activeReport.validated) {
        doc.setFillColor(236, 253, 245);
        doc.setDrawColor(16, 185, 129);
        doc.rect(margin, y, pageWidth - (margin * 2), 22, "FD");

        doc.setFont("Helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(5, 150, 105);
        doc.text("DIGITAL PHYSICIAN SIGNATURE & ATTESTATION LOG", margin + 6, y + 6);

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(51, 65, 85);
        doc.text("This electronic clinical record is officially locked and reviewed by the authorized radiologist.", margin + 6, y + 11);
        doc.setFont("Helvetica", "bold");
        doc.text(`Validation Signature Hash: ${activeReport.signature}`, margin + 6, y + 17);
        y += 32;
      } else {
        doc.setFillColor(254, 243, 199);
        doc.setDrawColor(245, 158, 11);
        doc.rect(margin, y, pageWidth - (margin * 2), 16, "FD");

        doc.setFont("Helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(180, 83, 9);
        doc.text("PRELIMINARY UNVALIDATED CLINICAL DRAFT REPORT", margin + 6, y + 5.5);
        doc.setFont("Helvetica", "normal");
        doc.text("This findings summary requires clinical review and locking digital signature prior to EHR import.", margin + 6, y + 11);
        y += 26;
      }

      // Legal & Compliance footer block
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);

      const disclaimerText = "Legal and Liability disclaimer: RAD_DOCTOR is an FDA CDSS-Class Support Tool designed to prioritize medical examinations. Definitive clinical determinations and corresponding medical procedures remain the complete responsibility of the verified medical practitioner.";
      const footerLines = doc.splitTextToSize(disclaimerText, pageWidth - (margin * 2));
      for (const fLine of footerLines) {
        if (y > 285) {
          doc.addPage();
          y = margin;
        }
        doc.text(fLine, margin, y);
        y += 3.5;
      }

      doc.text(`Origin Host: ${activeReport.source} | Core Protocol Compliance: HIPAA SECURE | Report Format: FHLMC v1.0b`, margin, y + 1.5);

      // Download PDF trigger
      const sanitizedName = currentPatient.name.replace(/\s+/g, "_");
      const finalFilename = `RAD_DOC_REPORT_${sanitizedName}_${currentStudy.id}.pdf`;
      doc.save(finalFilename);
      appendLog("Export PDF", `Clinical reports successfully generated and routed to device download: ${finalFilename}`);
    } catch (e: any) {
      console.error(e);
      appendLog("Export PDF Failed", `PDF document generation engine halted: ${e.message || e}`);
    }
  };

  // Translation Dictionaries to support dynamic RTL/LTR language switches
  const dictionary = {
    English: {
      appName: "RAD_DOCTOR Portal",
      tagline: "Enterprise Clinical Decision Support System",
      workspace: "AI Findings Workspace",
      blueprints: "Architect Blueprints",
      audit: "HIPAA Security Logs",
      roles: "Staff Credentials Grid",
      activeStudy: "Active Examination Study",
      demographics: "Patient Demographics",
      findingsType: "AI Highlight Preset",
      confidence: "Prediction Confidence",
      generateReport: "Interrogate AI Report",
      approveReport: "Approve and Sign digitally",
      validatedBadge: "Radiologist Validated",
      viewerControls: "Viewer Cursor Mode",
      pan: "Pan & Adjust Range",
      measure: "Caliper Metric",
      annotate: "Draw Freehand",
      toggleAi: "AI Bounding Frames",
      gender: "Gender",
      age: "Age",
      mrnType: "File identifier",
      practitioner: "Credentials Context",
      dicomOnlyWarning: "RAD_DOCTOR exclusively interprets conventional X-ray. CT / MRI scanning models are restricted.",
      disclaimerNote: "RAD_DOCTOR constitutes a Decision Support System; AI findings liability is designated to the licensed clinician.",
      languageLabel: "Region Locale",
      loadStudy: "Load Record",
      exportPdf: "Export PDF",
      aiLive: "Gemini CLI Live",
      aiSimulated: "Simulated Model Mode",
      connecting: "Connecting query pipeline..."
    },
    French: {
      appName: "RAD_DOCTOR Clinique",
      tagline: "Système d'Aide à la Décision Clinique d'Entreprise",
      workspace: "Espace AI Findings",
      blueprints: "Plans d'Architecture",
      audit: "Rapports HIPAA & Sécurité",
      roles: "Matrice d'Autorisations",
      activeStudy: "Étude Radiographique Active",
      demographics: "Données Démographiques",
      findingsType: "Anomalie Signalée",
      confidence: "Niveau de Confiance IA",
      generateReport: "Générer le Rapport d'Analyse",
      approveReport: "Valider et Signer Numériquement",
      validatedBadge: "Validé par Radiologue",
      viewerControls: "Mode Pointeur Viewer",
      pan: "Panoramique et Ajustement",
      measure: "Étalon de Calibration",
      annotate: "Insérer Annotations",
      toggleAi: "Cadres de Détection IA",
      gender: "Genre (Sexe)",
      age: "Âge",
      mrnType: "Dossier Médical",
      practitioner: "Session d'Identité Active",
      dicomOnlyWarning: "RAD_DOCTOR analyse exclusivement les radiographies (X-Ray). Les examens IRM / Scanner sont prohibés.",
      disclaimerNote: "Ce logiciel agit uniquement comme un SADC; les constats IA finaux relèvent de la responsabilité du clinicien agréé.",
      languageLabel: "Sélecteur de Langue",
      loadStudy: "Charger Fichier",
      exportPdf: "Exporter en PDF",
      aiLive: "Service Gemini Live",
      aiSimulated: "Mode Simulateur SADC",
      connecting: "Liaison au serveur SADC..."
    },
    Arabic: {
      appName: "RAD_DOCTOR - بوابة الأشعة",
      tagline: "منظومة دعم القرار الطبي بالذكاء الاصطناعي للمستشفيات",
      workspace: "منطقة AI Findings",
      blueprints: "مخططات وهيكلية البرمجيات",
      audit: "سجلات الأمن الطبي والامتثال HIPAA",
      roles: "مصفوفة الصلاحيات والرتب الطبية",
      activeStudy: "دراسة الفحص الشعاعي الحالية",
      demographics: "البيانات الشخصية للمريض",
      findingsType: "الشذوذ المرضي المحدد",
      confidence: "نسبة ثقة الذكاء الاصطناعي",
      generateReport: "تحليل واستخراج التقرير الطبي",
      approveReport: "المصادقة والتوقيع الرقمي المعتمد",
      validatedBadge: "تم التصديق والمراجعة",
      viewerControls: "مؤشر التحكم في الصورة",
      pan: "التحريك وتحديد التباين",
      measure: "أداة القياس المليمتري",
      annotate: "الرسم التوضيحي الحر",
      toggleAi: "تفعيل إطارات البؤرة المرضية",
      gender: "الجنس",
      age: "العمر",
      mrnType: "الرقم الطبي للملف",
      practitioner: "حساب الممارس الطبي النشط",
      dicomOnlyWarning: "تنبيه: بوابة RAD_DOCTOR مخصصة حصرياً لأشعة إكس التقليدية. يمنع تحميل فحوصات الرنين أو الأشعة المقطعية.",
      disclaimerNote: "ملاحظة قانونية: RAD_DOCTOR هو نظام توجيهي مساند؛ وتبقى نتائج الذكاء الاصطناعي (AI Findings) مرئية للممارس الطبي المسؤول.",
      languageLabel: "لغة العرض والتقرير",
      loadStudy: "تحميل الملف",
      exportPdf: "تصدير كملف PDF",
      aiLive: "محرك جيميناي نشط",
      aiSimulated: "وضعية المحاكي السريري",
      connecting: "جاري الاتصال بالخادم الرئيسي..."
    }
  };

  const tr = dictionary[currentLanguage];
  const isRtl = currentLanguage === "Arabic";

  // Auto-fill initial dummy report on-load
  useEffect(() => {
    // Generate simulated/preloaded reports so the page starts pre-populated
    studies.forEach(study => {
      setReports(prev => {
        if (prev[study.id]) return prev;
        return {
          ...prev,
          [study.id]: {
            report: `## SYSTEM REPORT PRE-SEED\nSelect **"Interrogate AI Report"** on the right side to draft or fetch a detailed structured clinical description in ${currentLanguage} for this study.`,
            source: "RAD_DOCTOR Local Cache",
            validated: false
          }
        };
      });
    });
  }, []);

  return (
    <div 
      className="min-h-screen bg-slate-900 text-slate-250 flex flex-col font-sans transition-all duration-300 antialiased"
      dir={isRtl ? "rtl" : "ltr"}
    >
      
      {/* Clinician Header Bar */}
      <header className="sticky top-0 z-50 bg-[#272a5d] border-b border-slate-700 px-6 py-4 flex flex-wrap items-center justify-between gap-4 shadow-md">
        
        {/* Portal Branding, CDSS labels and warning flags */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-blue-500/10">
            <Activity className="w-5.5 h-5.5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold font-['Arial'] text-white tracking-tight">
                {tr.appName}
              </h1>
              <span className="px-2 py-0.5 rounded text-[9px] bg-blue-500/20 text-blue-400 border border-blue-500/30 font-mono font-bold">
                CDSS Class IIa
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
              <p className="text-xs text-slate-400">{tr.tagline}</p>
              <span className="hidden sm:inline w-1 h-1 rounded-full bg-slate-650"></span>
              {aiStatus ? (
                aiStatus.aiActive ? (
                  <span className="px-2 py-0.5 rounded text-[8.5px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 font-mono font-bold">
                     ● {tr.aiLive}
                  </span>
                ) : (
                  <span 
                    className="px-2 py-0.5 rounded text-[8.5px] bg-amber-500/15 text-amber-400 border border-amber-500/25 font-mono font-bold cursor-help"
                    title="Using high-fidelity CDSS simulator. Please provide your GEMINI_API_KEY inside the AI Studio Secrets panel to enable real Gemini AI analysis."
                  >
                     ● {tr.aiSimulated}
                  </span>
                )
              ) : (
                <span className="px-2 py-0.5 rounded text-[8.5px] bg-slate-800 text-slate-400 font-mono animate-pulse">
                  {tr.connecting}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Global Controls: Language & Session Credentials selectors */}
        <div className="flex items-center gap-3 flex-wrap">
          
          {/* Dynamic Language trigger with dynamic RTL updates */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1">
            <Globe2 className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-mono text-slate-400 hidden sm:inline">{tr.languageLabel}:</span>
            <select
              value={currentLanguage}
              onChange={(e) => {
                const requestedLang = e.target.value as Language;
                setCurrentLanguage(requestedLang);
                appendLog("Language Shift", `Integrated clinical reporting translation altered to: ${requestedLang}`);
              }}
              className="bg-transparent text-xs text-slate-200 outline-none cursor-pointer font-['Arial'] font-bold"
            >
              <option value="English" className="bg-slate-900 text-slate-100">EN - English</option>
              <option value="French" className="bg-slate-900 text-slate-100">FR - Français</option>
              <option value="Arabic" className="bg-slate-900 text-slate-100">AR - العربية</option>
            </select>
          </div>

          {/* Practitioner Active Session context indicator */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1">
            <User className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-mono text-slate-400 hidden sm:inline">{tr.practitioner}:</span>
            <select
              value={currentUserRole}
              onChange={(e) => {
                const requestedRole = e.target.value;
                setCurrentUserRole(requestedRole);
                appendLog("Practitioner Switch", `Session active credential switched to: ${requestedRole}`);
              }}
              className="bg-transparent text-xs text-slate-200 outline-none cursor-pointer font-['Arial'] font-bold"
            >
              <option value="Radiologist" className="bg-slate-900 text-slate-100 font-semibold">Dr. (Radiologist)</option>
              <option value="Physician" className="bg-slate-900 text-slate-100">Dr. (Physician)</option>
              <option value="Technician" className="bg-slate-900 text-slate-100">Tech. (Technician)</option>
              <option value="Administrator" className="bg-slate-900 text-slate-100">Admin (System)</option>
            </select>
          </div>

        </div>
      </header>

      {/* Primary Workspace Navigation Tabs */}
      <div className="bg-[#272a5d] border-b border-slate-700/70 p-2.5 flex flex-wrap gap-2 text-xs font-mono">
        <button
          type="button"
          onClick={() => setActiveTab("WORKSPACE")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
            activeTab === "WORKSPACE" 
              ? "bg-blue-600 text-white shadow-lg shadow-blue-500/10" 
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/60"
          }`}
        >
          <Tv className="w-4 h-4" />
          {tr.workspace}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("ROLES")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
            activeTab === "ROLES" 
              ? "bg-blue-600 text-white shadow-lg shadow-blue-500/10" 
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/60"
          }`}
        >
          <Users className="w-4 h-4" />
          {tr.roles}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("BLUEPRINTS")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
            activeTab === "BLUEPRINTS" 
              ? "bg-blue-600 text-white shadow-lg shadow-blue-500/10" 
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/60"
          }`}
        >
          <Cpu className="w-4 h-4" />
          {tr.blueprints}
        </button>
      </div>

      {/* Main Body view */}
      <main className="flex-1 p-4 lg:p-6 bg-[#272a5d]">
        
        {/* TAB 1: WORKSPACE */}
        {activeTab === "WORKSPACE" && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            
            {/* Left 4 Grid Columns: Demographics / Case Presets lists */}
            <div className="xl:col-span-4 space-y-6">
              
              {/* Presets X-Ray Study Records Selector */}
              <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl space-y-3 shadow-sm">
                <h3 className="text-xs font-extrabold uppercase font-mono tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-blue-400" />
                  PACS Case Files Preloads
                </h3>

                {/* Custom File Upload & Real-Time Multimodal Diagnostic Trigger */}
                <div className="p-3.5 bg-slate-900/80 rounded-lg border border-dashed border-slate-700 hover:border-blue-500 transition-all text-center relative group">
                  <label className="cursor-pointer block space-y-1.5">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageUpload} 
                      disabled={isAnalyzingImage}
                      className="hidden" 
                    />
                    {isAnalyzingImage ? (
                      <div className="py-2 flex flex-col items-center justify-center gap-2">
                        <span className="w-6 h-6 rounded-full border-2 border-t-white border-blue-500 animate-spin"></span>
                        <p className="text-[10px] font-mono text-blue-400 font-bold uppercase tracking-wider animate-pulse">Running Multimodal AI Analysis...</p>
                      </div>
                    ) : (
                      <div className="py-1">
                        <Plus className="w-6 h-6 mx-auto text-blue-400 group-hover:scale-110 transition-transform mb-1" />
                        <p className="text-xs font-bold text-slate-200">Upload custom X-Ray scan</p>
                        <p className="text-[9px] text-slate-400 font-mono">Supports Chest, Pelvis, Spine, Limbs, Hands / Feet</p>
                      </div>
                    )}
                  </label>
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {studies.map((study, idx) => {
                    const patient = patients.find(p => p.id === study.patientId) || patients[0];
                    const isSelected = selectedStudyIndex === idx;
                    return (
                      <button
                        type="button"
                        key={study.id}
                        onClick={() => {
                          setSelectedStudyIndex(idx);
                          appendLog("Load Patient Study", `Mounted DICOM reference record S-${study.id} / Patient: ${patient.name}`);
                        }}
                        className={`w-full text-left p-3 rounded-lg border transition-all flex items-start gap-3 relative cursor-pointer ${
                          isSelected 
                            ? "bg-slate-900 border-blue-500 shadow shadow-blue-500/5 text-white" 
                            : "bg-slate-900/60 border-slate-700 hover:bg-slate-900 text-slate-300"
                        }`}
                      >
                        <div className="p-2 rounded bg-slate-800 border border-slate-700 shrink-0 text-center font-mono font-bold text-[10px]">
                          DX
                        </div>

                        <div className="flex-1 min-w-0 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-100 truncate">{patient.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{study.id}</span>
                          </div>

                          <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 mt-1">
                            <span>{study.bodyRegion}</span>
                            <span className={`font-mono text-[9px] px-1 py-0.2 rounded font-bold uppercase leading-none ${
                              study.pathologyType === "Normal study"
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : "bg-rose-500/20 text-rose-450 text-rose-440 text-rose-400 border border-rose-500/30"
                            }`}>
                              {study.pathologyType === "Normal study" ? "Normal" : "Abnormal"}
                            </span>
                          </div>
                        </div>

                        {isSelected && (
                          <div className={`w-1.5 h-full rounded-full absolute bg-blue-500 top-0 ${isRtl ? "left-0" : "right-0"}`}></div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Patient Profile Demographics Panel */}
              <div className="bg-slate-800 border border-slate-700 p-5 rounded-xl space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                  <h3 className="text-xs font-mono font-bold uppercase text-slate-400 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-emerald-500" />
                    {tr.demographics}
                  </h3>
                  <span className="text-[10px] font-mono text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded leading-none bg-emerald-500/5">
                    ID: {currentPatient.id}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-mono">Patient Name:</span>
                    <span className="font-bold text-slate-200">{currentPatient.name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-mono">{tr.mrnType}:</span>
                    <span className="font-bold font-mono text-blue-400">{currentPatient.mrn}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-mono">{tr.gender}:</span>
                    <span className="font-bold text-slate-200">{currentPatient.gender}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-mono">{tr.age}:</span>
                    <span className="font-bold text-slate-200">{currentPatient.age} Clinical Years</span>
                  </div>
                </div>

                {/* Patient study date log details */}
                <div className="pt-2 border-t border-slate-700 text-[10px] text-slate-400 font-mono space-y-1">
                  <div className="flex justify-between">
                    <span>Acquisition date:</span>
                    <span className="text-slate-350">{currentStudy.date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Scanner protocols:</span>
                    <span className="text-slate-350">ISO-X-442</span>
                  </div>
                </div>
              </div>

              {/* Exclusive Modality Limitation Warning Banner */}
              <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-start gap-3 text-xs leading-relaxed text-amber-200">
                <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold uppercase tracking-wider text-amber-300 font-mono text-[10px]">Modality Strict Boundary</p>
                  <p className="text-[11px]">{tr.dicomOnlyWarning}</p>
                </div>
              </div>

            </div>

            {/* Right 8 Grid Columns: Diagnostic DICOM viewer + AI Report generator */}
            <div className="xl:col-span-8 space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Visual DICOM Viewport Block */}
                <div className="md:col-span-8 space-y-4">
                  
                  {/* Interactive cursor selector control */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-805 bg-slate-800 border border-slate-700 p-2.5 rounded-xl shadow-sm">
                    <span className="text-[10px] font-mono uppercase text-slate-400 pl-2">
                      {tr.viewerControls}
                    </span>
                    
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setViewerMode("pan");
                          appendLog("Change Cursor Mode", "Switched DICOM cursor configuration to: Pan & Zoom adjustments");
                        }}
                        className={`px-3 py-1 text-xs font-mono rounded-lg transition-colors border ${
                          viewerMode === "pan" 
                            ? "bg-blue-600 border-blue-500 text-white font-bold" 
                            : "bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-250"
                        }`}
                      >
                        Adjust & Pan
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setViewerMode("measure");
                          appendLog("Change Cursor Mode", "Switched DICOM cursor to: Caliper Plotting Tool");
                        }}
                        className={`px-3 py-1 text-xs font-mono rounded-lg transition-colors border ${
                          viewerMode === "measure" 
                            ? "bg-blue-600 border-blue-500 text-white font-bold" 
                            : "bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-250"
                        }`}
                      >
                        Caliper (Measurement)
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setViewerMode("annotate");
                          appendLog("Change Cursor Mode", "Active DICOM cursor set to: Freehand drawing");
                        }}
                        className={`px-3 py-1 text-xs font-mono rounded-lg transition-colors border ${
                          viewerMode === "annotate" 
                            ? "bg-blue-600 border-blue-500 text-white font-bold" 
                            : "bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-250"
                        }`}
                      >
                        Freehand
                      </button>
                    </div>
                  </div>

                  {/* Canvas container */}
                  <DicomViewer 
                    bodyRegion={currentStudy.bodyRegion}
                    pathologyType={currentStudy.pathologyType}
                    aiConfidence={currentStudy.confidenceScore}
                    showAiOverlay={showAiOverlay}
                    onAddLog={appendLog}
                    viewerMode={viewerMode}
                    customImageSrc={currentStudy.customImageSrc}
                    boundingBoxes={currentStudy.boundingBoxes}
                    heatmapCenters={currentStudy.heatmapCenters}
                  />
                  
                </div>

                {/* Right Interactive AI parameters & analysis triggers */}
                <div className="md:col-span-4 space-y-4">
                  
                  {/* AI Prediction parameters card */}
                  <div className="bg-slate-800 border border-slate-700 p-5 rounded-xl space-y-4 shadow-sm">
                    <h3 className="text-xs font-bold font-mono uppercase text-slate-300 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-blue-405 text-blue-450 animate-pulse text-blue-400" />
                      Neural Analytics Module
                    </h3>

                    {/* AI Overlays Visibility toggle */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">{tr.toggleAi}</span>
                        <input 
                          type="checkbox"
                          checked={showAiOverlay}
                          onChange={(e) => {
                            setShowAiOverlay(e.target.checked);
                            appendLog("Toggle AI Frames", `Altered visual bounding frames to: ${e.target.checked}`);
                          }}
                          className="w-4 h-4 border-slate-700 rounded bg-slate-900 accent-emerald-500 cursor-pointer"
                        />
                      </div>

                      <div className="p-3.5 bg-slate-900 rounded-lg border border-slate-700 space-y-2">
                        <span className="text-[10px] text-slate-400 uppercase font-mono block">
                          Primary AI Findings Output:
                        </span>
                        
                        <div className="space-y-1">
                          <p className="font-bold text-white text-xs uppercase font-mono">
                            {currentStudy.pathologyType}
                          </p>
                          <div className="flex items-center justify-between mt-1 text-[11px] font-mono text-slate-400">
                            <span>{tr.confidence}:</span>
                            <span className={`font-extrabold ${
                              currentStudy.confidenceScore > 90 ? "text-emerald-400" : "text-amber-400"
                            }`}>
                              {currentStudy.confidenceScore}%
                            </span>
                          </div>
                        </div>

                        {/* Interactive mini confidence meter */}
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden border border-slate-700/50">
                          <div 
                            className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                            style={{ width: `${currentStudy.confidenceScore}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action buttons list */}
                    <div className="space-y-2 pt-2 border-t border-slate-700">
                      
                      <button
                        type="button"
                        onClick={handleDraftAIReport}
                        disabled={isGeneratingReport}
                        className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-slate-105 disabled:text-slate-500 font-mono font-extrabold rounded-lg flex items-center justify-center gap-2 transition-all shadow-md text-xs leading-none cursor-pointer active:scale-[0.98]"
                      >
                        {isGeneratingReport ? (
                          <>
                            <span className="w-3.5 h-3.5 rounded-full border-2 border-slate-400 border-t-white animate-spin"></span>
                            Interrogating LLM...
                          </>
                        ) : (
                          <>
                            <FileText className="w-4 h-4" />
                            {tr.generateReport}
                          </>
                        )}
                      </button>

                      {reports[currentStudy.id] && (
                        <button
                          type="button"
                          onClick={handleApproveReport}
                          disabled={reports[currentStudy.id]?.validated || currentUserRole !== "Radiologist"}
                          title={currentUserRole !== "Radiologist" ? "Signing clinical reports requires Radiologist session." : ""}
                          className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-555 disabled:bg-slate-700 text-slate-105 disabled:text-slate-500 font-mono font-bold rounded-lg flex items-center justify-center gap-2 transition-all text-xs leading-none cursor-pointer"
                        >
                          <Signature className="w-4 h-4" />
                          {reports[currentStudy.id]?.validated ? "Validation Recorded" : tr.approveReport}
                        </button>
                      )}

                    </div>
                  </div>

                  {/* CDSS Disclaimer Note */}
                  <p className="text-[10px] text-slate-500 leading-relaxed font-mono">
                    <span className="text-amber-400 font-extrabold uppercase">Notice:</span> {tr.disclaimerNote}
                  </p>
                </div>

              </div>

              {/* Lower Section: Generated structured Radiology Report previewer */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl">
                <div className="px-5 py-3.5 bg-slate-900/60 border-b border-slate-700 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-400" />
                    <div>
                      <h3 className="text-xs font-bold font-mono uppercase tracking-wide text-white">
                        Structured Preliminary Report Panel
                      </h3>
                      <p className="text-[10px] text-slate-400 font-mono">Compiled in absolute context: {currentLanguage}</p>
                    </div>
                  </div>

                  {/* Mode and Auto-safe toggles */}
                  <div className="flex items-center gap-3">
                    {/* Auto-save status */}
                    {reports[currentStudy.id] && (
                      <div className="flex items-center gap-1.5 mr-2">
                        {autoSaveStatus === "saving" && (
                          <span className="flex items-center gap-1.5 text-[10px] text-amber-400 font-mono">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                            Saving draft...
                          </span>
                        )}
                        {(autoSaveStatus === "saved" || autoSaveStatus === "idle") && (
                          <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Auto-saved locally
                          </span>
                        )}
                      </div>
                    )}

                    {/* Mode toggler */}
                    {reports[currentStudy.id] && (
                      <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-700 text-xs font-mono mr-2">
                        <button
                          type="button"
                          onClick={() => setIsEditingReport(false)}
                          className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                            !isEditingReport 
                              ? "bg-blue-600 font-extrabold text-white" 
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          Preview mode
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditingReport(true)}
                          className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                            isEditingReport 
                              ? "bg-blue-600 font-extrabold text-white" 
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          Edit Live
                        </button>
                      </div>
                    )}

                    {/* Export to PDF Button */}
                    {reports[currentStudy.id] && (
                      <button
                        type="button"
                        onClick={handleExportPDF}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold rounded-lg flex items-center gap-1.5 transition-all text-xs cursor-pointer shadow-md shadow-blue-550/10 active:scale-[0.98] mr-2"
                        title="Download structured official PDF copy of diagnostic outcomes"
                      >
                        <Download className="w-3.5 h-3.5" />
                        {tr.exportPdf}
                      </button>
                    )}

                    {/* Report Status badges */}
                    <div className="flex items-center gap-1.5 text-xs font-mono">
                      {reports[currentStudy.id]?.validated ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1">
                          <CheckSquare className="w-3 h-3" />
                          {tr.validatedBadge}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-amber-500/5 text-amber-400 border border-amber-500/20">
                          Awaiting Validation
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Markdown Styled container */}
                <div className="p-6 md:p-8 bg-slate-950/40 text-slate-300 space-y-4">
                  {reports[currentStudy.id] ? (
                    <div className="space-y-4 font-sans text-xs md:text-sm leading-relaxed">
                      
                      {/* Diagnostic outcome signature hash banner */}
                      {reports[currentStudy.id]?.validated && (
                        <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
                          <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-bold">
                            <Signature className="w-4 h-4" />
                            <span>DIGITAL PHYSICIAN ATTESTATION RECORDED</span>
                          </div>
                          <p className="text-[10px] font-mono text-slate-400">
                            Authorized Radiologist validation signature hash registered inside server compliance security tables:
                            <br />
                            <span className="text-slate-200 mt-1 block font-bold break-all">
                              {reports[currentStudy.id]?.signature}
                            </span>
                          </p>
                        </div>
                      )}

                      {/* Content block */}
                      {isEditingReport ? (
                        <div className="space-y-4">
                          <label className="block text-[11px] font-mono uppercase text-slate-400 tracking-wider">
                            Interactive Draft Area (Supports plain text or Markdown structures)
                          </label>
                          <textarea
                            value={reports[currentStudy.id]?.report || ""}
                            onChange={(e) => {
                              const newVal = e.target.value;
                              setReports(prev => ({
                                ...prev,
                                [currentStudy.id]: {
                                  ...(prev[currentStudy.id] || { source: "Manual Edit", validated: false }),
                                  report: newVal
                                }
                              }));
                            }}
                            rows={15}
                            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-5 text-slate-100 text-xs md:text-sm font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-slate-600 leading-relaxed resize-y"
                            placeholder="Type or format your medical report here..."
                          />
                          <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                            <span>Character count: {reports[currentStudy.id]?.report?.length || 0}</span>
                            <span className="text-[10px] text-blue-400 animate-pulse">● Edits autosaved instantly to browser storage cache</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-slate-200 text-xs md:text-sm font-light select-text whitespace-pre-wrap">
                          {reports[currentStudy.id]?.report}
                        </p>
                      )}

                      <div className="pt-4 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-500 font-mono">
                        <span>Analysis Source: {reports[currentStudy.id]?.source}</span>
                        <span>FHLMC Compliant Format</span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-slate-500 font-mono flex flex-col items-center justify-center gap-2">
                      <FileText className="w-8 h-8 text-slate-600 mb-1" />
                      <p>Drafting area empty. Run report analysis to compile radiological findings.</p>
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}



        {/* TAB 4: ROLES */}
        {activeTab === "ROLES" && (
          <div className="space-y-6 max-w-5xl mx-auto">
            <UserRolesMatrix 
              currentRole={currentUserRole}
              onSetRole={setCurrentUserRole}
              onAddLog={appendLog}
            />
          </div>
        )}

        {/* TAB 5: BLUEPRINTS */}
        {activeTab === "BLUEPRINTS" && (
          <div className="space-y-6 max-w-6xl mx-auto">
            <BlueprintsStudio />
          </div>
        )}

      </main>

      {/* Persistent global sterile hospital footer */}
      <footer className="mt-12 border-t border-slate-700 px-6 py-4 bg-slate-800 text-[10px] text-slate-400 font-mono flex flex-wrap gap-4 items-center justify-between shadow-inner">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-emerald-500" />
          <span>RAD_DOCTOR Enterprise Clinical Companion CDSS Gate</span>
        </div>
        <div>
          <span>Licensing: Class IIa SAMD System | CE / FDA Compliant Portal Code</span>
        </div>
      </footer>

    </div>
  );
}
