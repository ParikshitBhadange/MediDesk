import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Sparkles, Plus, Trash2, Printer, Share2, ChevronRight, Loader2, FileDown, Edit3, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, apiErrorMessage } from "@/lib/api";
import { shareOnWhatsApp, exportToPDF } from "@/lib/export";

export default function DoctorPage() {
  const [queue, setQueue] = useState([]);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editContact, setEditContact] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const [consultation, setConsultation] = useState(null);
  const [cause, setCause] = useState("");
  const [condition, setCondition] = useState("");
  const [disease, setDisease] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [pDesc, setPDesc] = useState("");
  const [additionalNote, setAdditionalNote] = useState("");
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [analysing, setAnalysing] = useState(false);

  const [prescriptions, setPrescriptions] = useState([]);
  const [previousConsultations, setPreviousConsultations] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [newItem, setNewItem] = useState({ medicine: "", dosage: "", frequency: "", duration: "", instructions: "" });

  const current = queue[currentIndex];

  const loadQueue = useCallback(async () => {
    setLoadingQueue(true);
    try {
      const { data } = await api.get("/doctor/queue");
      setQueue(data.data);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoadingQueue(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();
    api
      .get("/doctor/meetings")
      .then(({ data }) => setMeetings(data.data))
      .catch((err) => toast.error(apiErrorMessage(err)));
  }, [loadQueue]);

  useEffect(() => {
    if (!current) return;
    setEditName(current.name);
    setEditContact(current.contact ?? "");
    setEditDesc(current.description ?? "");

    api.get(`/doctor/patients/${current.id}/consultation`).then(({ data }) => setConsultation(data.data));
    api.get(`/doctor/patients/${current.id}/consultations`).then(({ data }) => setPreviousConsultations(data.data));
  }, [current?.id]);

  useEffect(() => {
    if (!consultation) return;
    setCause(consultation.cause ?? "");
    setCondition(consultation.condition ?? "");
    setDisease(consultation.disease ?? "");
    setSymptoms(consultation.symptoms ?? "");
    setPDesc(consultation.patientDescription ?? "");
    setAdditionalNote(consultation.additionalNote ?? "");
    setAiSuggestion("");
    api.get(`/doctor/consultations/${consultation.id}/items`).then(({ data }) => setPrescriptions(data.data));
  }, [consultation?.id]);

  function refreshItems() {
    if (consultation) api.get(`/doctor/consultations/${consultation.id}/items`).then(({ data }) => setPrescriptions(data.data));
  }

  async function saveConsultation() {
    if (!consultation) return;
    try {
      await api.patch(`/doctor/consultations/${consultation.id}`, {
        cause,
        condition,
        disease,
        symptoms,
        patientDescription: pDesc,
        additionalNote,
      });
      toast.success("Consultation saved");
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  async function updatePatient() {
    if (!current) return;
    try {
      await api.patch(`/doctor/patients/${current.id}`, { name: editName, contact: editContact, description: editDesc });
      toast.success("Patient updated");
      setEditing(false);
      loadQueue();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  async function addItem() {
    if (!newItem.medicine.trim()) return toast.error("Medicine required");
    if (!consultation || !current) return;
    try {
      await api.post(`/doctor/consultations/${consultation.id}/items`, { ...newItem, patientId: current.id });
      setNewItem({ medicine: "", dosage: "", frequency: "", duration: "", instructions: "" });
      refreshItems();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  async function removeItem(id) {
    try {
      await api.delete(`/doctor/items/${id}`);
      refreshItems();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  async function onAnalyse() {
    setAnalysing(true);
    try {
      const { data } = await api.post("/doctor/analyse", { symptoms, disease, cause, condition, patientDescription: pDesc });
      setAiSuggestion(data.data.suggestion);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setAnalysing(false);
    }
  }

  function printPrescription() {
    if (!current) return;
    exportToPDF(
      `Prescription — ${current.name}`,
      ["#", "Medicine", "Dosage", "Frequency", "Duration", "Instructions"],
      prescriptions.map((p) => [p.sequence, p.medicine, p.dosage ?? "", p.frequency ?? "", p.duration ?? "", p.instructions ?? ""]),
    );
  }

  function shareWA() {
    if (!current) return;
    const text =
      `Prescription for ${current.name}\n${disease ? `Dx: ${disease}\n` : ""}` +
      prescriptions.map((p) => `${p.sequence}. ${p.medicine} — ${p.dosage ?? ""} ${p.frequency ?? ""} ${p.duration ? `× ${p.duration}` : ""}`).join("\n");
    shareOnWhatsApp(text, current.contact ?? undefined);
  }

  function generateReport() {
    if (!current) return;
    exportToPDF(`Doctor Report — ${current.name}`, ["Field", "Value"], [
      ["Patient", current.name],
      ["Contact", current.contact ?? ""],
      ["Cause", cause],
      ["Condition", condition],
      ["Disease", disease],
      ["Symptoms", symptoms],
      ["Description", pDesc],
      ["Notes", additionalNote],
      ["Medications", prescriptions.map((p) => `${p.sequence}. ${p.medicine} ${p.dosage ?? ""}`).join(" | ")],
    ]);
  }

  const upcomingMeetings = useMemo(
    () => [...meetings].sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)),
    [meetings],
  );

  if (loadingQueue) {
    return (
      <div className="p-8 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading queue…
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold">Doctor</h1>
        <p className="text-muted-foreground mt-2">No patients assigned yet. Reception will route them here.</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1500px] mx-auto">
      <Card className="p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            {editing ? (
              <div className="flex flex-wrap gap-2 items-end">
                <div><Label className="text-xs">Name</Label><Input value={editName} onChange={(e) => setEditName(e.target.value)} /></div>
                <div><Label className="text-xs">Contact</Label><Input value={editContact} onChange={(e) => setEditContact(e.target.value)} /></div>
                <div><Label className="text-xs">Description</Label><Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} /></div>
                <Button size="sm" onClick={updatePatient}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            ) : (
              <>
                <h1 className="text-xl font-semibold">{current?.name ?? "New patient"}</h1>
                <p className="text-sm text-muted-foreground">{current?.contact ?? "No contact"} · {current?.description ?? "—"}</p>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Edit3 className="h-4 w-4 mr-1.5" /> Edit</Button>
            <Button size="sm" onClick={() => setCurrentIndex((i) => Math.min(i + 1, queue.length - 1))}>
              Next patient <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
        <div className="text-xs text-muted-foreground mt-2">Queue: {currentIndex + 1} / {queue.length}</div>
      </Card>

      <div className="grid lg:grid-cols-[280px_1fr_320px] gap-6">
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm">Prescription</h3>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={printPrescription} title="Print"><Printer className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={shareWA} title="Share WhatsApp"><Share2 className="h-4 w-4" /></Button>
            </div>
          </div>
          <ol className="space-y-2 text-sm">
            {prescriptions.length === 0 && <li className="text-muted-foreground text-xs">No items yet.</li>}
            {prescriptions.map((p) => (
              <li key={p.id} className="p-2 border rounded-md flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <div className="font-medium">{p.sequence}. {p.medicine}</div>
                  <div className="text-xs text-muted-foreground truncate">{[p.dosage, p.frequency, p.duration].filter(Boolean).join(" · ")}</div>
                </div>
                <button className="text-muted-foreground hover:text-destructive" onClick={() => removeItem(p.id)}><Trash2 className="h-3.5 w-3.5" /></button>
              </li>
            ))}
          </ol>
          <div className="border-t pt-3 space-y-2">
            <Input placeholder="Medicine" value={newItem.medicine} onChange={(e) => setNewItem({ ...newItem, medicine: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Dosage" value={newItem.dosage} onChange={(e) => setNewItem({ ...newItem, dosage: e.target.value })} />
              <Input placeholder="Frequency" value={newItem.frequency} onChange={(e) => setNewItem({ ...newItem, frequency: e.target.value })} />
              <Input placeholder="Duration" value={newItem.duration} onChange={(e) => setNewItem({ ...newItem, duration: e.target.value })} />
              <Input placeholder="Notes" value={newItem.instructions} onChange={(e) => setNewItem({ ...newItem, instructions: e.target.value })} />
            </div>
            <Button size="sm" className="w-full" onClick={addItem}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
        </Card>

        <Card className="p-5 space-y-3">
          <h3 className="font-medium">Consultation</h3>
          <div className="grid md:grid-cols-2 gap-3">
            <div><Label>Cause</Label><Input value={cause} onChange={(e) => setCause(e.target.value)} /></div>
            <div><Label>Condition</Label><Input value={condition} onChange={(e) => setCondition(e.target.value)} /></div>
            <div><Label>Disease</Label><Input value={disease} onChange={(e) => setDisease(e.target.value)} /></div>
            <div><Label>Symptoms</Label><Input value={symptoms} onChange={(e) => setSymptoms(e.target.value)} /></div>
            <div className="md:col-span-2"><Label>Patient description</Label><Textarea rows={3} value={pDesc} onChange={(e) => setPDesc(e.target.value)} /></div>
          </div>
          <div className="flex justify-between gap-2">
            <Button variant="outline" size="sm" onClick={generateReport}><FileDown className="h-4 w-4 mr-1.5" /> Report PDF</Button>
            <Button size="sm" onClick={saveConsultation}>Save consultation</Button>
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <h3 className="font-medium text-sm flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> AI Analyse</h3>
          <p className="text-xs text-muted-foreground">Suggest prescriptions from symptoms, disease, and cause.</p>
          <Button size="sm" className="w-full" onClick={onAnalyse} disabled={analysing}>
            {analysing ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Analysing…</> : "Analyse"}
          </Button>
          {aiSuggestion && (
            <div className="text-xs bg-muted/50 p-3 rounded-md whitespace-pre-wrap max-h-[380px] overflow-auto">{aiSuggestion}</div>
          )}
        </Card>
      </div>

      <Card className="p-4">
        <Tabs defaultValue="prescription">
          <TabsList>
            <TabsTrigger value="prescription">Prescription</TabsTrigger>
            <TabsTrigger value="meetings">Previous meetings</TabsTrigger>
            <TabsTrigger value="note">Additional note</TabsTrigger>
            <TabsTrigger value="calendar">Schedule</TabsTrigger>
          </TabsList>

          <TabsContent value="prescription" className="pt-4">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground uppercase border-b">
                <tr><th className="py-2">#</th><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Duration</th><th>Instructions</th></tr>
              </thead>
              <tbody>
                {prescriptions.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="py-2">{p.sequence}</td><td>{p.medicine}</td><td>{p.dosage}</td><td>{p.frequency}</td><td>{p.duration}</td><td>{p.instructions}</td>
                  </tr>
                ))}
                {prescriptions.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">No prescriptions yet</td></tr>}
              </tbody>
            </table>
          </TabsContent>

          <TabsContent value="meetings" className="pt-4">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground uppercase border-b">
                <tr><th className="py-2">Date</th><th>Disease</th><th>Medications</th><th>Notes</th></tr>
              </thead>
              <tbody>
                {previousConsultations.map((m) => {
                  const items = (m.prescriptions ?? []).flatMap((p) => p.items ?? []);
                  return (
                    <tr key={m.id} className="border-b last:border-0">
                      <td className="py-2">{new Date(m.createdAt).toLocaleDateString()}</td>
                      <td>{m.disease ?? "—"}</td>
                      <td>{items.map((i) => `${i.medicine}${i.dosage ? ` (${i.dosage})` : ""}`).join(", ") || "—"}</td>
                      <td>{m.additionalNote ?? "—"}</td>
                    </tr>
                  );
                })}
                {previousConsultations.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">No previous meetings</td></tr>}
              </tbody>
            </table>
          </TabsContent>

          <TabsContent value="note" className="pt-4">
            <Textarea rows={6} value={additionalNote} onChange={(e) => setAdditionalNote(e.target.value)} placeholder="Additional notes…" />
            <div className="flex justify-end mt-3"><Button size="sm" onClick={saveConsultation}>Save note</Button></div>
          </TabsContent>

          <TabsContent value="calendar" className="pt-4 space-y-4">
            <ScheduleMeeting
              patientId={current?.id}
              consultationId={consultation?.id}
              onCreated={() => api.get("/doctor/meetings").then(({ data }) => setMeetings(data.data))}
            />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground uppercase border-b">
                  <tr><th className="py-2">When</th><th>Patient</th><th>Title</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {upcomingMeetings.map((m) => (
                    <tr key={m.id} className="border-b last:border-0">
                      <td className="py-2">{new Date(m.scheduledAt).toLocaleString()}</td>
                      <td>{m.patient?.name ?? "—"}</td>
                      <td>{m.title}</td>
                      <td className="capitalize">{m.status?.toLowerCase()}</td>
                    </tr>
                  ))}
                  {upcomingMeetings.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">No meetings scheduled</td></tr>}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}

function ScheduleMeeting({ patientId, consultationId, onCreated }) {
  const [when, setWhen] = useState("");
  const [title, setTitle] = useState("Follow-up");
  const [saving, setSaving] = useState(false);

  async function create() {
    if (!patientId) return toast.error("No patient selected");
    if (!when) return toast.error("Pick date & time");
    setSaving(true);
    try {
      await api.post("/doctor/meetings", { patientId, consultationId, title, scheduledAt: new Date(when).toISOString() });
      toast.success("Meeting scheduled");
      setWhen("");
      onCreated();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2 items-end">
      <div><Label className="text-xs">Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
      <div><Label className="text-xs">Date & time</Label><Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} /></div>
      <Button size="sm" onClick={create} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CalendarPlus className="h-4 w-4 mr-1.5" /> Schedule</>}
      </Button>
    </div>
  );
}
