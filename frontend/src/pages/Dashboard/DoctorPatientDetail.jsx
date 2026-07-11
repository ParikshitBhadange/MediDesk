import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Eye, FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api, apiErrorMessage } from "@/lib/api";
import { exportConsultationReportPDF } from "@/lib/export";
import { useAuth } from "@/context/AuthContext";
import ReportViewModal from "@/components/ReportViewModal";
import UserMenu from "@/components/UserMenu";

const CONDITION_TONE = { CRITICAL: "destructive", HIGH: "warning", MEDIUM: "accent", LOW: "success" };

export default function DoctorPatientDetail() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [patient, setPatient] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewingReport, setViewingReport] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api.get(`/doctor/patients/${patientId}/profile`),
      api.get(`/doctor/patients/${patientId}/consultations`),
    ])
      .then(([profileRes, consultationsRes]) => {
        if (cancelled) return;
        setPatient(profileRes.data.data);
        setReports(consultationsRes.data.data);
      })
      .catch((err) => {
        toast.error(apiErrorMessage(err, "Could not load this patient"));
        navigate("/doctor/search");
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [patientId, navigate]);

  function downloadReportPdf(report) {
    if (!patient) return;
    exportConsultationReportPDF({
      patientName: patient.name,
      patientContact: patient.contact,
      doctorName: user?.name,
      consultation: report,
    });
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading patient…
        </div>
        <UserMenu />
      </div>
    );
  }

  if (!patient) return null;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1000px] mx-auto">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <button
            onClick={() => navigate("/doctor/search")}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to search
          </button>
          <h1 className="text-2xl font-semibold">{patient.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {patient.contact ?? "No contact"} · {patient.description ?? "—"}
          </p>
          <div className="mt-2"><Badge tone={CONDITION_TONE[patient.conditionLevel]}>{patient.conditionLevel}</Badge></div>
        </div>
        <UserMenu />
      </header>

      <Card className="p-0 overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30">
          <h2 className="font-medium text-sm">All reports ({reports.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground uppercase border-b">
              <tr>
                <th className="py-2 px-4">Date</th>
                <th className="px-4">Disease</th>
                <th className="px-4">Medications</th>
                <th className="px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 ? (
                <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">No reports recorded for this patient yet</td></tr>
              ) : (
                reports.map((r) => {
                  const items = (r.prescriptions ?? []).flatMap((p) => p.items ?? []);
                  return (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-2 px-4 whitespace-nowrap">{new Date(r.createdAt).toLocaleDateString()}</td>
                      <td className="px-4">{r.disease ?? "—"}</td>
                      <td className="px-4 max-w-[240px] truncate">{items.map((i) => i.medicine).join(", ") || "—"}</td>
                      <td className="px-4">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" title="View report" onClick={() => setViewingReport(r)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" title="Download PDF" onClick={() => downloadReportPdf(r)}>
                            <FileDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {viewingReport && (
        <ReportViewModal
          report={viewingReport}
          patientName={patient.name}
          patientContact={patient.contact}
          doctorName={user?.name}
          onClose={() => setViewingReport(null)}
          onDownload={() => downloadReportPdf(viewingReport)}
        />
      )}
    </div>
  );
}