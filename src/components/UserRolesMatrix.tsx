import React from "react";
import { 
  Users, 
  ShieldCheck, 
  Eye, 
  CheckCircle, 
  X, 
  UserCheck 
} from "lucide-react";

interface UserRolesMatrixProps {
  currentRole: string;
  onSetRole: (role: string) => void;
  onAddLog: (action: string, details: string) => void;
}

export default function UserRolesMatrix({ 
  currentRole, 
  onSetRole, 
  onAddLog 
}: UserRolesMatrixProps) {

  // Standard roles descriptions
  const rolesRegistry = [
    {
      name: "Administrator",
      desc: "Full system administration, licensing enforcement, master security configs, active directory integrations, and clinical audit log backups.",
      avatar: "⚙️"
    },
    {
      name: "Radiologist",
      desc: "Licensed diagnostic medical specialist. Authorized to perform preliminary reviews, overlay adjustments, write impressions, and issue cryptographically signed validations.",
      avatar: "🩺"
    },
    {
      name: "Physician",
      desc: "Attending or emergency clinical doctor. Accesses completed reports, monitors patient trajectories, and correlates AI diagnostic indicators with clinical context.",
      avatar: "🏥"
    },
    {
      name: "Technician",
      desc: "Radiological scan assistant. Captures and uploads raw imaging sequences, strips demographic details on input, and performs initial projection alignments.",
      avatar: "⚡"
    }
  ];

  // Capabilities matrix declarations
  const capabilities = [
    { code: "UPLOAD_DICOM", label: "Upload & Position Raw DICOM", desc: "Allows uploading files from PACS or direct scanner interop.", permitted: ["Administrator", "Technician"] },
    { code: "STRIP_PHI", label: "PHIs Header Scrubbing", desc: "Anonymizes patient identity during ingest.", permitted: ["Administrator", "Radiologist", "Technician"] },
    { code: "VIEW_FILM", label: "Access & View X-Ray Film", desc: "Open studies in the diagnostic viewer viewport.", permitted: ["Administrator", "Radiologist", "Physician", "Technician"] },
    { code: "WINDOWING", label: "Interactive Windowing (Contrast/Invert)", desc: "Supports real-time digital density manipulations on the viewer.", permitted: ["Radiologist", "Physician", "Technician"] },
    { code: "CALIPER_MEASURE", label: "Caliper Distance & Annotation Tools", desc: "Draw annotations and linear measurements directly onto canvas.", permitted: ["Radiologist", "Technician"] },
    { code: "DRAFT_AI_REPORT", label: "Draft Preliminary AI Reports", desc: "Interacts with Gemini API to compile clinical descriptions.", permitted: ["Radiologist", "Technician"] },
    { code: "APPROVE_REPORT", label: "Sign & Validate Final Reports", desc: "Performs statutory review and signs off on final clinical AI findings.", permitted: ["Radiologist"] },
    { code: "AUDIT_RECOVERY", label: "Export Security Audit Log Protocols", desc: "Backs up or filters clinical logs for HIPAA/GDPR reviews.", permitted: ["Administrator"] },
    { code: "USER_PROVISION", label: "User Provisioning & Roles Setup", desc: "Create, edit, or terminate physical staff login accounts.", permitted: ["Administrator"] }
  ];

  const handleRoleActivation = (roleName: string) => {
    onSetRole(roleName);
    onAddLog("Role Context Switch", `Active user switched profile session to: ${roleName}`);
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header description */}
      <div className="border-l-4 border-blue-500 pl-4">
        <h2 className="text-lg font-bold font-mono text-white">Role-Based Access Control (RBAC) System</h2>
        <p className="text-slate-400 text-xs mt-1">
          Healthcare clinical workflows strictly govern which practitioner is legally authorized to execute specific actions.
        </p>
      </div>

      {/* 2. Interactive Role Session Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {rolesRegistry.map((item) => {
          const isActive = currentRole === item.name;
          return (
            <button
              type="button"
              key={item.name}
              onClick={() => handleRoleActivation(item.name)}
              className={`text-left p-4 rounded-xl border transition-all flex flex-col justify-between h-44 cursor-pointer shadow-sm ${
                isActive 
                  ? "bg-slate-800 border-blue-500 text-slate-100 shadow-md shadow-blue-500/10" 
                  : "bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600 hover:bg-slate-800"
              }`}
            >
              <div className="flex justify-between items-start w-full">
                <span className="text-2xl">{item.avatar}</span>
                {isActive && (
                  <span className="px-2 py-0.5 rounded text-[8px] font-bold bg-blue-500/20 text-blue-405 text-blue-300 border border-blue-500/30 uppercase tracking-wider flex items-center gap-1">
                    <UserCheck className="w-2.5 h-2.5" />
                    AC Session Active
                  </span>
                )}
              </div>
              
              <div className="space-y-1 mt-3">
                <h4 className="text-xs font-bold font-mono text-white uppercase">{item.name}</h4>
                <p className="text-[10px] leading-relaxed text-slate-400 line-clamp-3">
                  {item.desc}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* 3. Grid Roles Capabilities Matrix */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-lg">
        <div className="px-5 py-4 bg-slate-900/60 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="text-sm font-bold font-mono text-white">Corporate Clinical Security Permittance Grid</h3>
              <p className="text-[10px] text-slate-400 font-mono">Governed under HIPAA security specifications for hospitals</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/40 text-slate-400 font-mono uppercase tracking-wider border-b border-slate-700 select-none">
                <th className="p-3 pl-5">Capability / Operation</th>
                <th className="p-3 text-center w-28">Admin</th>
                <th className="p-3 text-center w-28">Radiologist</th>
                <th className="p-3 text-center w-28">Physician</th>
                <th className="p-3 text-center w-28">Technician</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700 bg-slate-800/10">
              {capabilities.map((cap) => (
                <tr key={cap.code} className="hover:bg-slate-900/40 transition-colors">
                  <td className="p-4 pl-5">
                    <p className="font-bold text-slate-205 text-slate-200">{cap.label}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{cap.desc}</p>
                  </td>
                  
                  {["Administrator", "Radiologist", "Physician", "Technician"].map((role) => {
                    const isPermitted = cap.permitted.includes(role);
                    const isUserActiveSession = currentRole === role;
                    return (
                      <td key={role} className={`p-4 text-center align-middle ${isUserActiveSession ? "bg-blue-600/10" : ""}`}>
                        <div className="flex items-center justify-center">
                          {isPermitted ? (
                            <span className="p-1 rounded bg-emerald-500/20 border border-emerald-500/35 text-emerald-450 text-emerald-400 flex items-center gap-1 text-[10px] font-mono leading-none font-bold">
                              <CheckCircle className="w-3 h-3" />
                              YES
                            </span>
                          ) : (
                            <span className="p-1 rounded bg-slate-900 text-slate-500 flex items-center gap-1 text-[10px] font-mono leading-none border border-slate-700">
                              <X className="w-3 h-3" />
                              NO
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
