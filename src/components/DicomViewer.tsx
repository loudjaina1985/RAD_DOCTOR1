import React, { useRef, useEffect, useState } from "react";
import { BodyRegion, Annotation } from "../types";
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  RotateCcw, 
  Ruler, 
  Edit2, 
  Eye, 
  EyeOff, 
  Layers, 
  Square,
  Sparkles,
  Info
} from "lucide-react";

interface DicomViewerProps {
  bodyRegion: BodyRegion;
  pathologyType: "Normal study" | "Bone fracture" | "Pneumonia";
  aiConfidence: number;
  showAiOverlay: boolean;
  onAddLog: (action: string, details: string) => void;
  viewerMode: "pan" | "measure" | "annotate";
  customImageSrc?: string;
  boundingBoxes?: Array<{ x: number; y: number; w: number; h: number; label: string }>;
  heatmapCenters?: Array<{ x: number; y: number; r: number; intensity: number }>;
}

export default function DicomViewer({
  bodyRegion,
  pathologyType,
  aiConfidence,
  showAiOverlay,
  onAddLog,
  viewerMode,
  customImageSrc,
  boundingBoxes,
  heatmapCenters
}: DicomViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // States for DICOM controls
  const [brightness, setBrightness] = useState<number>(100); // 0 - 200%
  const [contrast, setContrast] = useState<number>(100);   // 0 - 200%
  const [invert, setInvert] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(1.0);           // 0.5x - 3x
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);

  // Image element for customer-uploaded clinical files
  const [loadedImg, setLoadedImg] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (customImageSrc) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = customImageSrc;
      img.onload = () => {
        setLoadedImg(img);
      };
      img.onerror = (e) => {
        console.error("Failed to load custom image in DICOM workspace:", e);
        setLoadedImg(null);
      };
    } else {
      setLoadedImg(null);
    }
  }, [customImageSrc]);

  // Measurements and annotations state persistence per study key
  const studyKey = `${bodyRegion}-${pathologyType}`;
  const [annotations, setAnnotations] = useState<Record<string, Annotation[]>>({});
  const [currentPoints, setCurrentPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);

  // Reset viewport parameters on study change
  useEffect(() => {
    setBrightness(100);
    setContrast(100);
    setInvert(false);
    setZoom(1.0);
    setPanX(0);
    setPanY(0);
    setCurrentPoints([]);
    setIsDrawing(false);
  }, [bodyRegion, pathologyType]);

  const currentAnnotations = annotations[studyKey] || [];

  // Add annotation to state
  const addAnnotation = (newAnn: Annotation) => {
    setAnnotations(prev => ({
      ...prev,
      [studyKey]: [...(prev[studyKey] || []), newAnn]
    }));
    onAddLog(
      "DICOM Tool Annotation", 
      `Added ${newAnn.type === "line" ? "measurement" : "drawing"} to study ${bodyRegion} (${newAnn.value || ""})`
    );
  };

  // Clear annotations for this study
  const clearAnnotations = () => {
    setAnnotations(prev => ({
      ...prev,
      [studyKey]: []
    }));
    setCurrentPoints([]);
    onAddLog("DICOM Tool Reset", `Cleared all annotations and reset view for ${bodyRegion}`);
  };

  // Handle canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Direct resolution
    canvas.width = 640;
    canvas.height = 480;

    // Fill background (simulating carbon medical DICOM monitor dark level)
    ctx.fillStyle = "#0c0f12";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Save context for transform stack
    ctx.save();
    
    // 1. Apply Pan & Zoom
    ctx.translate(canvas.width / 2 + panX, canvas.height / 2 + panY);
    ctx.scale(zoom, zoom);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    // 2. Apply Brightness & Contrast filter in canvas drawing
    // Formula: filter = brightness(X%) contrast(Y%) invert(Z%)
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) invert(${invert ? 100 : 0}%)`;

    // 3. Render Anatomy (Procedural X-Ray Simulation or Custom Uploaded Image)
    if (loadedImg) {
      ctx.drawImage(loadedImg, 0, 0, canvas.width, canvas.height);
    } else {
      renderAnatomy(ctx, bodyRegion, pathologyType);
    }

    // Turn off filters for UI/Overlays so bounding boxes & texts aren't washed out
    ctx.filter = "none";

    // 4. Render AI Overlays if enabled
    if (showAiOverlay) {
      renderAiOverlays(ctx, bodyRegion, pathologyType, aiConfidence, boundingBoxes, heatmapCenters);
    }

    // 5. Render saved User Annotations/Measurements
    ctx.lineWidth = 2;
    currentAnnotations.forEach(ann => {
      if (ann.type === "line" && ann.points.length === 2) {
        // Render linear calliper measurement
        ctx.strokeStyle = "#10b981"; // Emerald green
        ctx.fillStyle = "#10b981";
        
        const [p1, p2] = ann.points;
        // Draw dashed connection line
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw calliper ticks
        drawCalliperTick(ctx, p1, p2);

        // Draw text value
        ctx.font = "11px monospace";
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        ctx.fillStyle = "#10b981";
        ctx.fillText(ann.value || "", midX + 8, midY - 8);
      } else if (ann.type === "freehand" && ann.points.length > 1) {
        ctx.strokeStyle = "#e11d48"; // Rose pink
        ctx.beginPath();
        ctx.moveTo(ann.points[0].x, ann.points[0].y);
        ann.points.slice(1).forEach(pt => ctx.lineTo(pt.x, pt.y));
        ctx.stroke();
      }
    });

    // 6. Draw current drawing feedback in active interaction mode
    if (currentPoints.length > 0) {
      ctx.strokeStyle = viewerMode === "measure" ? "#34d399" : "#fb7185";
      ctx.lineWidth = 1.5;
      
      if (viewerMode === "measure" && currentPoints.length === 1) {
        // Render guide line if placing secondary point
        // handled in mousemove but draw initial point circle
        ctx.fillStyle = "#34d399";
        ctx.beginPath();
        ctx.arc(currentPoints[0].x, currentPoints[0].y, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (viewerMode === "annotate" && currentPoints.length > 1) {
        ctx.beginPath();
        ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
        currentPoints.forEach(pt => ctx.lineTo(pt.x, pt.y));
        ctx.stroke();
      }
    }

    ctx.restore();

    // 7. Write standard HUD metrics (corner coordinates, clinical labels)
    renderHUD(ctx, brightness, contrast, zoom, bodyRegion);

  }, [brightness, contrast, invert, zoom, panX, panY, bodyRegion, pathologyType, showAiOverlay, currentAnnotations, currentPoints, viewerMode, loadedImg, boundingBoxes, heatmapCenters]);

  // Procedural Medical Content Engines
  function renderAnatomy(ctx: CanvasRenderingContext2D, region: BodyRegion, pathology: string) {
    const w = 640;
    const h = 480;
    
    // Draw outer boundary chest/limb container
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;

    switch (region) {
      case "Chest X-ray": {
        // Draw thorax bone outer rib cage
        ctx.strokeStyle = "rgba(200, 208, 220, 0.4)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(w/2, h/2 - 20, 180, Math.PI * 0.9, Math.PI * 2.1);
        ctx.stroke();

        // Draw beautiful dual lung lobes (grey-black air-filled cavities)
        ctx.fillStyle = "rgba(10, 12, 15, 0.95)";
        
        // Left Lung
        ctx.beginPath();
        ctx.ellipse(w/2 - 75, h/2 + 20, 60, 150, -0.05, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Right Lung
        ctx.beginPath();
        ctx.ellipse(w/2 + 75, h/2 + 20, 60, 150, 0.05, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Infiltrates (Pneumonia) inside right lower lobe
        if (pathology === "Pneumonia") {
          ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
          // Seed hazy consolidated airspaces
          ctx.beginPath();
          ctx.ellipse(w/2 + 70, h/2 + 100, 35, 25, 0.1, 0, Math.PI * 2);
          ctx.fill();
          // Draw subtle bronchial markings
          ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(w/2 + 40, h/2 + 60);
          ctx.bezierCurveTo(w/2 + 65, h/2 + 80, w/2 + 80, h/2 + 105, w/2 + 95, h/2 + 120);
          ctx.stroke();
        }

        // Draw central heart shadow (Mediastinum) - high density (brighter grey)
        ctx.fillStyle = "rgba(220, 225, 235, 0.65)";
        ctx.beginPath();
        ctx.moveTo(w/2 - 10, h/2 - 120);
        ctx.bezierCurveTo(w/2 - 20, h/2 - 20, w/2 - 68, h/2 + 80, w/2, h/2 + 95);
        ctx.bezierCurveTo(w/2 + 45, h/2 + 95, w/2 + 50, h/2 + 40, w/2 + 10, h/2 - 120);
        ctx.closePath();
        ctx.fill();

        // Trachea (airway column - dark tube in center)
        ctx.fillStyle = "rgba(12, 15, 18, 0.85)";
        ctx.fillRect(w/2 - 6, h/2 - 160, 12, 110);

        // Clavicle Bones (highly visible top shoulders)
        ctx.strokeStyle = "rgba(240, 245, 250, 0.75)";
        ctx.lineWidth = 8;
        // Left
        ctx.beginPath();
        ctx.moveTo(w/2 - 15, h/2 - 110);
        ctx.quadraticCurveTo(w/2 - 100, h/2 - 115, w/2 - 210, h/2 - 130);
        ctx.stroke();
        // Right
        ctx.beginPath();
        ctx.moveTo(w/2 + 15, h/2 - 110);
        ctx.quadraticCurveTo(w/2 + 100, h/2 - 115, w/2 + 210, h/2 - 130);
        ctx.stroke();

        // Spine column (faint vertebral bodies centered behind structures)
        ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
        for (let y = h/2 - 160; y < h - 40; y += 18) {
          ctx.fillRect(w/2 - 8, y, 16, 12);
        }
        break;
      }
      case "Pelvis X-ray": {
        // Main Hip Girdle bones
        ctx.strokeStyle = "rgba(245, 247, 250, 0.8)";
        ctx.lineWidth = 14;
        
        // Left Iliosacral wing outline
        ctx.beginPath();
        ctx.ellipse(w/2 - 95, h/2 - 30, 75, 45, Math.PI * -0.15, 0, Math.PI * 2);
        ctx.stroke();

        // Right Iliosacral wing outline
        ctx.beginPath();
        ctx.ellipse(w/2 + 95, h/2 - 30, 75, 45, Math.PI * 0.15, 0, Math.PI * 2);
        ctx.stroke();

        // Pubic Symphysis connection arcs
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(w/2 - 35, h/2 + 70, 45, 0, Math.PI * 1.4);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(w/2 + 35, h/2 + 70, 45, Math.PI * 1.6, Math.PI * 3);
        ctx.stroke();

        // Sacrum backbone core central
        ctx.fillStyle = "rgba(245, 247, 250, 0.65)";
        ctx.beginPath();
        ctx.moveTo(w/2 - 35, h/2 - 60);
        ctx.lineTo(w/2 + 35, h/2 - 60);
        ctx.lineTo(w/2 + 15, h/2 + 30);
        ctx.lineTo(w/2 - 15, h/2 + 30);
        ctx.closePath();
        ctx.fill();

        // Left Femur Bone Head & Neck (Thigh insertion)
        ctx.fillStyle = "rgba(250, 252, 255, 0.85)";
        ctx.beginPath();
        ctx.arc(w/2 - 150, h/2 + 45, 22, 0, Math.PI * 2); // Joint sphere head
        ctx.fill();

        // Femur stem left
        ctx.strokeStyle = "rgba(250, 252, 255, 0.85)";
        ctx.lineWidth = 16;
        ctx.beginPath();
        ctx.moveTo(w/2 - 165, h/2 + 48);
        ctx.lineTo(w/2 - 200, h/2 + 200);
        ctx.stroke();

        // Right Femur Bone Head with pathology (Dislocation/Osteoarthritis)
        ctx.beginPath();
        if (pathology === "Bone fracture") {
          // Render isolated displacement of joint head
          ctx.arc(w/2 + 155, h/2 + 65, 20, 0, Math.PI * 2); // Dislocated head
          ctx.fill();
          
          ctx.beginPath();
          ctx.moveTo(w/2 + 172, h/2 + 68);
          // Crack line marked on stem neck
          ctx.lineTo(w/2 + 210, h/2 + 200);
          ctx.stroke();

          // Render jagged red-edged bone break highlight
          ctx.strokeStyle = "rgba(255, 80, 80, 0.85)";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(w/2 + 158, h/2 + 68);
          ctx.lineTo(w/2 + 178, h/2 + 62);
          ctx.lineTo(w/2 + 164, h/2 + 76);
          ctx.stroke();
        } else {
          ctx.arc(w/2 + 150, h/2 + 45, 22, 0, Math.PI * 2); 
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(w/2 + 165, h/2 + 48);
          ctx.lineTo(w/2 + 200, h/2 + 200);
          ctx.stroke();
        }
        break;
      }
      case "Spine X-ray": {
        // Vertical chain of vertebrae
        const centerX = w / 2;
        ctx.fillStyle = "rgba(240, 243, 248, 0.75)";
        ctx.strokeStyle = "rgba(12, 15, 18, 0.9)";
        ctx.lineWidth = 2;

        for (let i = 0; i < 9; i++) {
          const y = 30 + i * 48;
          let shiftX = 0;

          // Introduce bone fracture/dislocation step shift at 5th vertebra
          if (pathology === "Bone fracture" && i >= 5) {
            shiftX = 18; // Step deformity alignment failure (Dislocation spine subluxation!)
          }

          // Individual vertebra body block
          ctx.fillRect(centerX - 24 + shiftX, y, 48, 38);
          ctx.strokeRect(centerX - 24 + shiftX, y, 48, 38);

          // Transverse spine processes wings (left & right wings)
          ctx.fillStyle = "rgba(220, 225, 230, 0.55)";
          ctx.fillRect(centerX - 42 + shiftX, y + 10, 18, 12);
          ctx.fillRect(centerX + 24 + shiftX, y + 10, 18, 12);

          // Spinal disc spaces
          ctx.fillStyle = "rgba(10, 12, 15, 0.9)";
          ctx.fillRect(centerX - 20 + shiftX, y + 38, 40, 10);
        }

        if (pathology === "Bone fracture") {
          // Draw traumatic spinous listhesis step line
          ctx.strokeStyle = "rgb(239, 68, 68)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(centerX - 35, 30 + 5 * 48 - 6);
          ctx.lineTo(centerX + 55, 30 + 5 * 48 - 6);
          ctx.stroke();
        }
        break;
      }
      case "Upper Limb X-ray":
      case "Lower Limb X-ray": {
        // Render central long bone structures (Humerus/Femur or Radius/Tibia)
        const boneCenterY = h / 2;
        ctx.fillStyle = "rgba(242, 245, 249, 0.8)";
        ctx.strokeStyle = "rgba(12, 15, 18, 0.8)";
        ctx.lineWidth = 3;

        // Long bones with joints on both ends
        if (pathology === "Bone fracture") {
          // Split stem into distal and proximal bone segments with visible fracture gap!
          // Proximal bone segment
          ctx.beginPath();
          ctx.moveTo(100, boneCenterY - 25);
          ctx.lineTo(280, boneCenterY - 20); // Jagged edge start
          // Jagged fractured edge cross line
          ctx.lineTo(270, boneCenterY + 22);
          ctx.lineTo(100, boneCenterY + 25);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Distal bone segment (displaced downwards and slightly angled)
          ctx.beginPath();
          ctx.moveTo(290, boneCenterY - 14 + 12); // Gap and offset
          ctx.lineTo(540, boneCenterY - 25);
          ctx.lineTo(540, boneCenterY + 25);
          ctx.lineTo(285, boneCenterY + 28 + 12);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Draw bone gap marrow line (darker inside)
          ctx.fillStyle = "rgba(12, 15, 18, 0.95)";
          ctx.fillRect(120, boneCenterY - 8, 140, 16);
          ctx.fillRect(310, boneCenterY + 4, 210, 16);

        } else {
          // Normal seamless limb bone
          ctx.beginPath();
          ctx.moveTo(100, boneCenterY - 25);
          ctx.lineTo(540, boneCenterY - 25);
          ctx.quadraticCurveTo(560, boneCenterY - 45, 580, boneCenterY - 40);
          ctx.lineTo(580, boneCenterY + 40);
          ctx.quadraticCurveTo(560, boneCenterY + 45, 540, boneCenterY + 25);
          ctx.lineTo(100, boneCenterY + 25);
          ctx.quadraticCurveTo(80, boneCenterY + 45, 60, boneCenterY + 40);
          ctx.lineTo(60, boneCenterY - 40);
          ctx.quadraticCurveTo(80, boneCenterY - 45, 100, boneCenterY - 25);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Highlight bone marrow core canal
          ctx.fillStyle = "rgba(12, 15, 18, 0.9)";
          ctx.fillRect(110, boneCenterY - 8, 420, 16);
        }
        break;
      }
      case "Hand and Foot X-ray": {
        // Render multi-phalange articulated structures
        ctx.fillStyle = "rgba(240, 244, 248, 0.85)";
        ctx.strokeStyle = "rgba(15, 18, 22, 0.6)";
        ctx.lineWidth = 1.5;

        // Metacarpal bones row
        const baseX = w/2 - 100;
        const baseY = h - 100;

        // 5 digit columns
        for (let digit = 0; digit < 5; digit++) {
          const digitX = baseX + digit * 45;
          const heightOffset = [45, 20, 10, 25, 60][digit]; // typical fingers height profile

          // Meta joint
          ctx.fillRect(digitX, baseY, 22, 70);
          ctx.strokeRect(digitX, baseY, 22, 70);

          // Proximal phalanx (mid finger segment)
          const midY1 = baseY - 65 + heightOffset / 2;
          ctx.fillRect(digitX + 2, midY1, 18, 50);
          ctx.strokeRect(digitX + 2, midY1, 18, 50);

          // Distal phalanx (fingertip segment)
          const topY = midY1 - 50;
          ctx.beginPath();
          ctx.moveTo(digitX + 4, midY1);
          ctx.lineTo(digitX + 4, topY + 15);
          ctx.arc(digitX + 11, topY + 14, 7, Math.PI, 0); // round tip
          ctx.lineTo(digitX + 18, midY1);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Degenerative joint disease / arthritis bone spurs on joint space
          if (pathology === "Bone fracture" && digit === 2) {
            // Joint spur rendering
            ctx.fillStyle = "rgba(239, 68, 68, 0.9)";
            ctx.beginPath();
            ctx.moveTo(digitX - 2, midY1);
            ctx.lineTo(digitX + 6, midY1 - 4);
            ctx.lineTo(digitX + 2, midY1 + 4);
            ctx.fill();
          }
        }
        break;
      }
    }
  }

  // Draw HUD Details overlay
  function renderHUD(
    ctx: CanvasRenderingContext2D, 
    b: number, 
    c: number, 
    z: number, 
    region: string
  ) {
    ctx.fillStyle = "rgba(16, 185, 129, 0.85)"; // Emerald green clinical font HUD
    ctx.font = "11px monospace";

    // Upper Left: Institution info
    ctx.fillText("RADIO-DOCTOR CDSS v1.4.2", 15, 25);
    ctx.fillText("DEPARTMENT OF NEURORADIOLOGY & IMAGING", 15, 40);
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.fillText(`STUDY REF: RD-PACS-2026-${region.slice(0, 3).toUpperCase()}`, 15, 55);

    // Upper Right: Diagnostic state indicators
    ctx.fillStyle = "rgba(16, 185, 129, 0.85)";
    ctx.fillText("STATUS: ACTIVE DECISION SUPPORT", 450, 25);
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.fillText(`WINDOW LEVEL: W ${c * 4} / L ${b * 2}`, 450, 40);
    ctx.fillText(`ZOOM PREVIEW: ${Math.round(z * 100)}%`, 450, 55);

    // Bottom Left: Technical details
    ctx.fillText("SOURCE CODES: DICOM 3 DIRECT", 15, 440);
    ctx.fillText("INTEGRATION: EDGE COMPLIANT", 15, 455);

    // Bottom Right: Modality descriptor
    ctx.fillText("MODALITY: CONVENTIONAL DX X-RAY", 430, 440);
    ctx.fillStyle = "#ef4444";
    ctx.fillText("EXCLUSIVELY FOR DX X-RAY", 430, 455);
  }

  // Draw Calliper Tick Mark
  function drawCalliperTick(ctx: CanvasRenderingContext2D, p1: { x: number; y: number }, p2: { x: number; y: number }) {
    const angle = Math.atan2(p2.y - p1.y, p1.x - p2.x);
    const tickLen = 6;
    
    // Draw tick on P1
    ctx.beginPath();
    ctx.moveTo(p1.x - Math.sin(angle) * tickLen, p1.y - Math.cos(angle) * tickLen);
    ctx.lineTo(p1.x + Math.sin(angle) * tickLen, p1.y + Math.cos(angle) * tickLen);
    ctx.stroke();

    // Draw tick on P2
    ctx.beginPath();
    ctx.moveTo(p2.x - Math.sin(angle) * tickLen, p2.y - Math.cos(angle) * tickLen);
    ctx.lineTo(p2.x + Math.sin(angle) * tickLen, p2.y + Math.cos(angle) * tickLen);
    ctx.stroke();
  }

  // Draw AI Overlay heatmaps and bounding boxes
  function renderAiOverlays(
    ctx: CanvasRenderingContext2D, 
    region: BodyRegion, 
    pathology: string,
    confidence: number,
    customBboxes?: Array<{ x: number; y: number; w: number; h: number; label: string }>,
    customHeatmaps?: Array<{ x: number; y: number; r: number; intensity: number }>
  ) {
    const w = 640;
    const h = 480;

    // Direct draw for custom uploaded studies
    if (customBboxes && customBboxes.length > 0) {
      customBboxes.forEach(bbox => {
        const targetX = bbox.x;
        const targetY = bbox.y;
        const targetW = bbox.w;
        const targetH = bbox.h;
        const annotationLabel = `${bbox.label || "Anomaly"}: ${confidence.toFixed(1)}%`;

        // 1. Heatmap draw
        const radialGrad = ctx.createRadialGradient(
          targetX + targetW / 2, 
          targetY + targetH / 2, 
          10, 
          targetX + targetW / 2, 
          targetY + targetH / 2, 
          targetW
        );
        radialGrad.addColorStop(0, "rgba(224, 30, 90, 0.5)"); // strong inner red glow
        radialGrad.addColorStop(0.5, "rgba(234, 179, 8, 0.2)"); // outer amber haze
        radialGrad.addColorStop(1, "rgba(0, 0, 0, 0)");         // transparent edge

        ctx.fillStyle = radialGrad;
        ctx.beginPath();
        ctx.arc(targetX + targetW / 2, targetY + targetH / 2, targetW, 0, Math.PI * 2);
        ctx.fill();

        // 2. Bounding Box Outlines
        ctx.strokeStyle = "#e11d48"; // vibrant pinkish red
        ctx.lineWidth = 1.5;
        ctx.strokeRect(targetX, targetY, targetW, targetH);

        // Crosshair tick indicators
        ctx.beginPath();
        ctx.moveTo(targetX - 4, targetY); ctx.lineTo(targetX + 12, targetY);
        ctx.moveTo(targetX, targetY - 4); ctx.lineTo(targetX, targetY + 12);
        ctx.moveTo(targetX + targetW + 4, targetY); ctx.lineTo(targetX + targetW - 12, targetY);
        ctx.moveTo(targetX + targetW, targetY - 4); ctx.lineTo(targetX + targetW, targetY + 12);
        ctx.moveTo(targetX - 4, targetY + targetH); ctx.lineTo(targetX + 12, targetY + targetH);
        ctx.moveTo(targetX, targetY + targetH + 4); ctx.lineTo(targetX, targetY + targetH - 12);
        ctx.moveTo(targetX + targetW + 4, targetY + targetH); ctx.lineTo(targetX + targetW - 12, targetY + targetH);
        ctx.moveTo(targetX + targetW, targetY + targetH + 4); ctx.lineTo(targetX + targetW, targetY + targetH - 12);
        ctx.stroke();

        // 3. Text Banner for classification feedback
        ctx.fillStyle = "rgba(225, 29, 72, 0.9)";
        ctx.fillRect(targetX, targetY - 18, Math.max(targetW, 140), 18);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 9px system-ui, sans-serif";
        ctx.fillText(annotationLabel, targetX + 4, targetY - 6);
      });
      return;
    }

    let targetX = w / 2;
    let targetY = h / 2;
    let targetW = 100;
    let targetH = 100;
    let annotationLabel = "Abnormality Blocked";

    // Assign appropriate coordinate bounding boxes per anatomy/pathology combo
    if (pathology === "Pneumonia" && region === "Chest X-ray") {
      targetX = w / 2 + 35;
      targetY = h / 2 + 70;
      targetW = 110;
      targetH = 80;
      annotationLabel = `Pneumonic Infiltration: ${confidence.toFixed(1)}%`;
    } else if (pathology === "Bone fracture") {
      if (region === "Chest X-ray") {
        return; // Pneumonia study or normal
      }
      if (region === "Spine X-ray") {
        targetX = w / 2 - 35;
        targetY = 30 + 5 * 48 - 15;
        targetW = 130;
        targetH = 80;
        annotationLabel = `Vertebral Subluxation/Fracture: ${confidence.toFixed(1)}%`;
      } else if (region === "Pelvis X-ray") {
        targetX = w / 2 + 120;
        targetY = h / 2 + 30;
        targetW = 85;
        targetH = 85;
        annotationLabel = `Acetabular Fracture/Dislocation: ${confidence.toFixed(1)}%`;
      } else if (region === "Hand and Foot X-ray") {
        targetX = w / 2 - 30;
        targetY = h - 180;
        targetW = 60;
        targetH = 50;
        annotationLabel = `Joint Space Narrowing / Spurs: ${confidence.toFixed(1)}%`;
      } else {
        // Limb bones
        targetX = 230;
        targetY = h / 2 - 40;
        targetW = 100;
        targetH = 100;
        annotationLabel = `Torsional Cortical Disruption: ${confidence.toFixed(1)}%`;
      }
    } else {
      // Normal alignment or unremarkable study
      return;
    }

    // 1. Draw High-Intensity AI Probability Heatmap (semi-transparent glowing circles)
    const radialGrad = ctx.createRadialGradient(
      targetX + targetW / 2, 
      targetY + targetH / 2, 
      10, 
      targetX + targetW / 2, 
      targetY + targetH / 2, 
      targetW
    );
    radialGrad.addColorStop(0, "rgba(224, 30, 90, 0.5)"); // strong inner red glow
    radialGrad.addColorStop(0.5, "rgba(234, 179, 8, 0.2)"); // outer amber haze
    radialGrad.addColorStop(1, "rgba(0, 0, 0, 0)");         // transparent edge

    ctx.fillStyle = radialGrad;
    ctx.beginPath();
    ctx.arc(targetX + targetW / 2, targetY + targetH / 2, targetW, 0, Math.PI * 2);
    ctx.fill();

    // 2. Draw Target Bounding Box
    ctx.strokeStyle = "#e11d48"; // vibrant pinkish red
    ctx.lineWidth = 1.5;
    ctx.strokeRect(targetX, targetY, targetW, targetH);

    // Coral crosshair corner ticks on bounding box
    ctx.beginPath();
    ctx.moveTo(targetX - 4, targetY); ctx.lineTo(targetX + 12, targetY);
    ctx.moveTo(targetX, targetY - 4); ctx.lineTo(targetX, targetY + 12);

    ctx.moveTo(targetX + targetW + 4, targetY); ctx.lineTo(targetX + targetW - 12, targetY);
    ctx.moveTo(targetX + targetW, targetY - 4); ctx.lineTo(targetX + targetW, targetY + 12);

    ctx.moveTo(targetX - 4, targetY + targetH); ctx.lineTo(targetX + 12, targetY + targetH);
    ctx.moveTo(targetX, targetY + targetH + 4); ctx.lineTo(targetX, targetY + targetH - 12);

    ctx.moveTo(targetX + targetW + 4, targetY + targetH); ctx.lineTo(targetX + targetW - 12, targetY + targetH);
    ctx.moveTo(targetX + targetW, targetY + targetH + 4); ctx.lineTo(targetX + targetW, targetY + targetH - 12);
    ctx.stroke();

    // 3. Draw AI Text Banner
    ctx.fillStyle = "rgba(225, 29, 72, 0.9)";
    ctx.fillRect(targetX, targetY - 18, targetW, 18);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 9px system-ui, sans-serif";
    ctx.fillText(annotationLabel, targetX + 4, targetY - 6);
  }

  // Interactive mouse events for Annotation drawing and callipers measurements
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width ? (canvas.width / rect.width) : 1;
    const scaleY = rect.height ? (canvas.height / rect.height) : 1;
    
    // Convert absolute screen coordinates to transformed local canvas pixels relative to zoom / pan
    const rawX = (e.clientX - rect.left) * scaleX;
    const rawY = (e.clientY - rect.top) * scaleY;

    // Inverse transform the mouse position to match relative layout
    const clickX = (rawX - canvas.width / 2 - panX) / zoom + canvas.width / 2;
    const clickY = (rawY - canvas.height / 2 - panY) / zoom + canvas.height / 2;

    if (viewerMode === "pan") {
      setIsDrawing(true);
      return;
    }

    if (viewerMode === "measure") {
      if (currentPoints.length === 0) {
        setCurrentPoints([{ x: clickX, y: clickY }]);
      } else {
        // Complete current measurement
        const p1 = currentPoints[0];
        const p2 = { x: clickX, y: clickY };
        const pixelDist = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
        
        // Define medical scale: let 1 pixel = 0.35 millimeters typical resolution
        const mmDist = (pixelDist * 0.32).toFixed(1);

        addAnnotation({
          type: "line",
          points: [p1, p2],
          color: "#10b981",
          value: `${mmDist} mm`,
          label: "Calliper Metric"
        });
        setCurrentPoints([]);
      }
    } else if (viewerMode === "annotate") {
      setIsDrawing(true);
      setCurrentPoints([{ x: clickX, y: clickY }]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!isDrawing && currentPoints.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width ? (canvas.width / rect.width) : 1;
    const scaleY = rect.height ? (canvas.height / rect.height) : 1;
    
    const rawX = (e.clientX - rect.left) * scaleX;
    const rawY = (e.clientY - rect.top) * scaleY;

    // Direct pan in workspace mode
    if (viewerMode === "pan" && isDrawing) {
      setPanX(prev => prev + e.movementX);
      setPanY(prev => prev + e.movementY);
      return;
    }

    const clickX = (rawX - canvas.width / 2 - panX) / zoom + canvas.width / 2;
    const clickY = (rawY - canvas.height / 2 - panY) / zoom + canvas.height / 2;

    if (viewerMode === "annotate" && isDrawing) {
      setCurrentPoints(prev => [...prev, { x: clickX, y: clickY }]);
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    if (viewerMode === "annotate" && currentPoints.length > 2) {
      addAnnotation({
        type: "freehand",
        points: currentPoints,
        color: "#rose"
      });
      setCurrentPoints([]);
    }
  };

  // Touch events for mobile/handheld device responsiveness
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const scaleX = rect.width ? (canvas.width / rect.width) : 1;
      const scaleY = rect.height ? (canvas.height / rect.height) : 1;
      
      const rawX = (touch.clientX - rect.left) * scaleX;
      const rawY = (touch.clientY - rect.top) * scaleY;

      // Prevent window scrolling during canvas interaction
      if (e.cancelable) {
        e.preventDefault();
      }

      // Inverse transform the touch position to match zoomed/panned coordinate space
      const clickX = (rawX - canvas.width / 2 - panX) / zoom + canvas.width / 2;
      const clickY = (rawY - canvas.height / 2 - panY) / zoom + canvas.height / 2;

      // Store initial coordinate for touch-move panning delta calculation
      canvas.setAttribute("data-last-touch-x", String(touch.clientX));
      canvas.setAttribute("data-last-touch-y", String(touch.clientY));

      if (viewerMode === "pan") {
        setIsDrawing(true);
        return;
      }

      if (viewerMode === "measure") {
        if (currentPoints.length === 0) {
          setCurrentPoints([{ x: clickX, y: clickY }]);
        } else {
          // Complete calliper measurement on second touch tap
          const p1 = currentPoints[0];
          const p2 = { x: clickX, y: clickY };
          const pixelDist = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
          const mmDist = (pixelDist * 0.32).toFixed(1);

          addAnnotation({
            type: "line",
            points: [p1, p2],
            color: "#10b981",
            value: `${mmDist} mm`,
            label: "Calliper Metric"
          });
          setCurrentPoints([]);
        }
      } else if (viewerMode === "annotate") {
        setIsDrawing(true);
        setCurrentPoints([{ x: clickX, y: clickY }]);
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!isDrawing && currentPoints.length === 0) return;

    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const scaleX = rect.width ? (canvas.width / rect.width) : 1;
      const scaleY = rect.height ? (canvas.height / rect.height) : 1;
      
      const rawX = (touch.clientX - rect.left) * scaleX;
      const rawY = (touch.clientY - rect.top) * scaleY;

      if (e.cancelable) {
        e.preventDefault();
      }

      if (viewerMode === "pan" && isDrawing) {
        const lastX = Number(canvas.getAttribute("data-last-touch-x") || touch.clientX);
        const lastY = Number(canvas.getAttribute("data-last-touch-y") || touch.clientY);
        const movementX = touch.clientX - lastX;
        const movementY = touch.clientY - lastY;

        setPanX(prev => prev + movementX);
        setPanY(prev => prev + movementY);

        canvas.setAttribute("data-last-touch-x", String(touch.clientX));
        canvas.setAttribute("data-last-touch-y", String(touch.clientY));
        return;
      }

      const clickX = (rawX - canvas.width / 2 - panX) / zoom + canvas.width / 2;
      const clickY = (rawY - canvas.height / 2 - panY) / zoom + canvas.height / 2;

      if (viewerMode === "annotate" && isDrawing) {
        setCurrentPoints(prev => [...prev, { x: clickX, y: clickY }]);
      }
    }
  };

  const handleTouchEnd = () => {
    setIsDrawing(false);
    if (viewerMode === "annotate" && currentPoints.length > 2) {
      addAnnotation({
        type: "freehand",
        points: currentPoints,
        color: "#rose"
      });
      setCurrentPoints([]);
    }
  };

  return (
    <div id="dicom-container" className="flex flex-col bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      
      {/* 1. Header DICOM toolbar console */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-emerald-500" />
          <div>
            <h3 className="text-xs font-bold font-mono tracking-tight text-slate-100 uppercase flex items-center gap-1.5">
              DICOM Diagnostics Viewer
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                DX Stage
              </span>
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">16-bit Grey Depth Projection</p>
          </div>
        </div>

        {/* Viewport presets triggers & diagnostics resets */}
        <div className="flex items-center gap-1.5 text-xs">
          <button 
            type="button"
            onClick={() => {
              setZoom(prev => Math.max(0.5, prev - 0.2));
            }}
            title="Zoom Out"
            className="p-1 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700/60 rounded"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          
          <button 
            type="button"
            onClick={() => {
              setZoom(prev => Math.min(3.0, prev + 0.2));
            }}
            title="Zoom In"
            className="p-1 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700/60 rounded"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button 
            type="button"
            onClick={() => {
              setInvert(prev => !prev);
              onAddLog("DICOM Toggle Invert", `Toggled negative film inversion to: ${!invert}`);
            }}
            className={`px-2 py-1 text-[10px] font-mono rounded border flex items-center gap-1 leading-none ${
              invert 
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500" 
                : "bg-slate-800 text-slate-300 border-slate-700/60"
            }`}
          >
            Invert Film
          </button>

          <button 
            type="button"
            onClick={() => {
              setBrightness(100);
              setContrast(100);
              setZoom(1.0);
              setPanX(0);
              setPanY(0);
              clearAnnotations();
            }}
            className="px-2 py-1 text-[10px] bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-slate-100 border border-slate-800 rounded font-mono flex items-center gap-1 leading-none"
          >
            <RotateCcw className="w-3" />
            Reset View
          </button>
        </div>
      </div>

      {/* 2. Side-By-Side Windowing controls & Canvas Grid */}
      <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
        
        {/* Left Vertical Sliders Rail (Clinical parameter adjustment) */}
        <div className="w-full lg:w-44 p-3 bg-slate-900/60 space-y-4 flex flex-row lg:flex-col justify-between lg:justify-start gap-4">
          
          {/* Dynamic Brightness */}
          <div className="flex-1 w-full space-y-1">
            <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
              <span className="flex items-center gap-1 text-slate-300">
                <Info className="w-2.5 h-2.5 text-slate-500" />
                BRIGHTNESS
              </span>
              <span className="text-emerald-400 font-bold">{brightness}%</span>
            </div>
            <input 
              type="range"
              min="30"
              max="180"
              value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-ew-resize accent-emerald-500"
            />
          </div>

          {/* Dynamic Contrast */}
          <div className="flex-1 w-full space-y-1">
            <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
              <span className="flex items-center gap-1 text-slate-300">
                <Layers className="w-2.5 h-2.5 text-slate-500" />
                CONTRAST
              </span>
              <span className="text-emerald-400 font-bold">{contrast}%</span>
            </div>
            <input 
              type="range"
              min="30"
              max="180"
              value={contrast}
              onChange={(e) => setContrast(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-ew-resize accent-emerald-500"
            />
          </div>

          {/* Scale indicator legend */}
          <div className="hidden lg:block pt-3 border-t border-slate-800 text-[10px] leading-tight space-y-2 text-slate-400 font-mono">
            <div className="flex justify-between">
              <span>Resolution</span>
              <span className="text-slate-300">0.32 mm / px</span>
            </div>
            <div className="flex justify-between">
              <span>Film Depth</span>
              <span className="text-slate-300">16-bit TIFF</span>
            </div>
            <div className="flex justify-between">
              <span>PACS Link</span>
              <span className="text-emerald-500">Connected</span>
            </div>
          </div>
        </div>

        {/* Diagnostic Canvas stage */}
        <div ref={containerRef} className="flex-1 bg-slate-950 flex items-center justify-center relative p-1 lg:p-2 min-h-[340px]">
          
          <canvas 
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className={`max-w-full h-auto aspect-[4/3] rounded border border-slate-900 bg-slate-950 touch-none ${
              viewerMode === "pan" ? "cursor-grab active:cursor-grabbing" : "cursor-crosshair"
            }`}
          />

          {/* Mode Overlay Badge hint */}
          <div className="absolute top-4 left-4 pointer-events-none bg-slate-900/90 border border-slate-800 rounded-lg py-1 px-2.5 text-[9px] font-mono flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-emerald-400 uppercase font-black text-xs">
              MTR: {viewerMode}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Footer Tools Legend instruction */}
      <div className="py-2 px-4 bg-slate-900/95 border-t border-slate-800 text-[10px] text-slate-400 font-mono flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Interactive DICOM Simulator. Drag inside image if cursor is set to "Pan & Adjust"</span>
        </div>
        <div>
          <span>Verification: <b className="text-slate-200">AAPM TG18 Compliance Standard</b></span>
        </div>
      </div>
    </div>
  );
}
