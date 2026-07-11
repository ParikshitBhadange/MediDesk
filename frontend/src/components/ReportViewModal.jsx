import { FileDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";

// Formatted, read-only view of a single day's consultation report, with a
// PDF download action. Used from the doctor's main queue page (Reports tab)
// and from the patient search/history page — kept in one file so both stay
// in sync instead of drifting into two slightly different modals.
export default function ReportViewModal({ report, patientName, patientContact, doctorName, onClose, onDownload }) {
  const items = (report.prescriptions ?? []).flatMap((p) => p.items ?? []);
  const fields = [
    ["Cause", report.cause],
    ["Condition", report.condition],
    ["Disease", report.disease],
    ["Symptoms", report.symptoms],
    ["Patient description", report.patientDescription],
    ["Additional notes", report.additionalNote],
  ].filter(([, value]) => value && String(value).trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-background rounded-lg shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-5 border-b">
          <div>
            <h2 className="font-semibold text-lg">{patientName}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {patientContact ? `${patientContact} · ` : ""}
              Report from {new Date(report.createdAt).toLocaleDateString()}
              {doctorName ? ` · Dr. ${doctorName}` : ""}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {fields.length > 0 ? (
            <div className="space-y-3">
              {fields.map(([label, value]) => (
                <div key={label}>
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</div>
                  <div className="text-sm mt-0.5 whitespace-pre-wrap">{value}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No clinical details recorded for this visit.</p>
          )}

          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Medications</div>
            {items.length > 0 ? (
              <table className="w-full text-sm border rounded-md overflow-hidden">
                <thead className="text-left text-xs text-muted-foreground uppercase bg-muted/50">
                  <tr><th className="py-1.5 px-2">#</th><th className="px-2">Medicine</th><th className="px-2">Dosage</th><th className="px-2">Freq.</th><th className="px-2">Duration</th></tr>
                </thead>
                <tbody>
                  {items.map((i, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="py-1.5 px-2">{i.sequence ?? idx + 1}</td>
                      <td className="px-2">{i.medicine}</td>
                      <td className="px-2">{i.dosage ?? "—"}</td>
                      <td className="px-2">{i.frequency ?? "—"}</td>
                      <td className="px-2">{i.duration ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-muted-foreground">No medications recorded.</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t">
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
          <Button size="sm" onClick={onDownload}><FileDown className="h-4 w-4 mr-1.5" /> Download PDF</Button>
        </div>
      </div>
    </div>
  );
}