import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { FileDown, FileSpreadsheet, Printer, Plus, Receipt, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { api, apiErrorMessage } from "@/lib/api";
import { exportToPDF, exportToExcel, printHTML } from "@/lib/export";

const CONDITION_TONE = { CRITICAL: "destructive", HIGH: "warning", MEDIUM: "accent", LOW: "success" };

export default function ReceptionistPage() {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState("LOW");
  const [doctorId, setDoctorId] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get("/patients/doctors")
      .then(({ data }) => setDoctors(data.data))
      .catch((err) => toast.error(apiErrorMessage(err)));
  }, []);

  const loadPatients = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (dateFilter) params.date = dateFilter;
      const { data } = await api.get("/patients", { params });
      setPatients(data.data);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [dateFilter]);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  async function addPatient() {
    if (!name.trim()) return toast.error("Name required");
    setSaving(true);
    try {
      await api.post("/patients", {
        name: name.trim(),
        contact: contact.trim() || undefined,
        description: description.trim() || undefined,
        conditionLevel: level,
        doctorId: doctorId || undefined,
      });
      toast.success(`Patient added${doctorId ? " and routed to doctor" : ""}`);
      setName("");
      setContact("");
      setDescription("");
      setLevel("LOW");
      setDoctorId("");
      loadPatients();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const filteredRows = useMemo(
    () =>
      patients.map((p) => [
        p.name,
        p.contact ?? "-",
        p.assignedDoctor?.name ?? "Unassigned",
        p.conditionLevel,
        new Date(p.createdAt).toLocaleString(),
      ]),
    [patients],
  );

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Reception</h1>
          <p className="text-sm text-muted-foreground">Register patients, route to doctors, collect fees.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setDateFilter("")}>All dates</Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportToPDF("Patients", ["Name", "Contact", "Doctor", "Condition", "Registered"], filteredRows)}
          >
            <FileDown className="h-4 w-4 mr-1.5" /> PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportToExcel(
                "patients",
                "Patients",
                patients.map((p) => ({
                  Name: p.name,
                  Contact: p.contact,
                  Doctor: p.assignedDoctor?.name ?? "",
                  Condition: p.conditionLevel,
                  Registered: new Date(p.createdAt).toLocaleString(),
                })),
              )
            }
          >
            <FileSpreadsheet className="h-4 w-4 mr-1.5" /> Excel
          </Button>
        </div>
      </header>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="font-medium mb-4 flex items-center gap-2"><Plus className="h-4 w-4" /> New patient</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" /></div>
              <div><Label>Contact</Label><Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Phone or email" /></div>
              <div className="md:col-span-2">
                <Label>Description</Label>
                <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Chief complaint" />
              </div>
              <div>
                <Label>Condition</Label>
                <Select value={level} onValueChange={setLevel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Assign doctor</Label>
                <Select value={doctorId} onValueChange={setDoctorId}>
                  <SelectTrigger><SelectValue placeholder="Choose doctor" /></SelectTrigger>
                  <SelectContent>
                    {doctors.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name || d.email}
                        {d.specialty ? ` · ${d.specialty}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={addPatient} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add & route to doctor
              </Button>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-medium">Patients {dateFilter && `— ${dateFilter}`}</h2>
              <span className="text-xs text-muted-foreground">{patients.length} record(s)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground text-xs uppercase border-b">
                  <tr>
                    <th className="py-2">Name</th>
                    <th className="py-2">Doctor</th>
                    <th className="py-2">Condition</th>
                    <th className="py-2">Contact</th>
                    <th className="py-2">Registered</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">Loading…</td></tr>
                  ) : patients.length === 0 ? (
                    <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">No patients yet</td></tr>
                  ) : (
                    patients.map((p) => (
                      <tr key={p.id} className="border-b last:border-0 hover:bg-muted/40">
                        <td className="py-2 font-medium">{p.name}</td>
                        <td className="py-2 text-muted-foreground">{p.assignedDoctor?.name ?? "—"}</td>
                        <td className="py-2"><Badge tone={CONDITION_TONE[p.conditionLevel]}>{p.conditionLevel}</Badge></td>
                        <td className="py-2 text-muted-foreground">{p.contact ?? "—"}</td>
                        <td className="py-2 text-muted-foreground">{new Date(p.createdAt).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <FeesModule patients={patients} />
        </div>

        <aside className="space-y-4">
          <Card className="p-4">
            <h3 className="font-medium pb-2 text-sm">Date filter</h3>
            <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
          </Card>
        </aside>
      </div>
    </div>
  );
}

function FeesModule({ patients }) {
  const [patientId, setPatientId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function collect() {
    const p = patients.find((x) => x.id === patientId);
    if (!p) return toast.error("Choose a patient");
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast.error("Invalid amount");

    setSaving(true);
    try {
      const { data } = await api.post("/patients/fees", {
        patientId,
        amount: amt,
        method,
        description: note || undefined,
      });
      const fee = data.data;
      toast.success("Fee collected");
      printHTML(`
        <h1>Receipt</h1>
        <p><strong>${new Date(fee.createdAt).toLocaleString()}</strong></p>
        <table>
          <tr><th>Patient</th><td>${p.name}</td></tr>
          <tr><th>Amount</th><td>$${Number(fee.amount).toFixed(2)}</td></tr>
          <tr><th>Method</th><td>${fee.method.toUpperCase()}</td></tr>
          ${fee.description ? `<tr><th>Note</th><td>${fee.description}</td></tr>` : ""}
          <tr><th>Receipt #</th><td>${fee.id.slice(0, 8).toUpperCase()}</td></tr>
        </table>
        <p style="margin-top:24px;color:#666">Thank you.</p>
      `);
      setAmount("");
      setNote("");
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-5">
      <h2 className="font-medium mb-4 flex items-center gap-2"><Receipt className="h-4 w-4" /> Fees collection</h2>
      <div className="grid md:grid-cols-4 gap-3">
        <div className="md:col-span-2">
          <Label>Patient</Label>
          <Select value={patientId} onValueChange={setPatientId}>
            <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
            <SelectContent>
              {patients.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label>Amount</Label><Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
        <div>
          <Label>Method</Label>
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="CASH">Cash</SelectItem>
              <SelectItem value="CARD">Card</SelectItem>
              <SelectItem value="QR">QR</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-3"><Label>Note</Label><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Consultation, tests…" /></div>
        <div className="flex items-end">
          <Button className="w-full" onClick={collect} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Printer className="h-4 w-4 mr-1.5" /> Collect & print</>}
          </Button>
        </div>
      </div>
    </Card>
  );
}
