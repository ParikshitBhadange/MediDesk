import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { FileDown, FileSpreadsheet, Printer, Plus, Receipt, Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { api, apiErrorMessage } from "@/lib/api";
import { exportToPDF, exportToExcel, printHTML } from "@/lib/export";
import { todayInIST } from "@/lib/utils";

const CONDITION_TONE = { CRITICAL: "destructive", HIGH: "warning", MEDIUM: "accent", LOW: "success" };

// The doctor list barely ever changes within a shift, so cache it in memory
// for a few minutes and skip the network round trip on remounts (e.g.
// navigating away to the Doctor dashboard and back) — one less request
// blocking the page before it's usable.
let doctorsCache = null;
let doctorsCacheAt = 0;
const DOCTORS_CACHE_TTL_MS = 5 * 60 * 1000;

async function fetchDoctorsCached() {
  const fresh = doctorsCache && Date.now() - doctorsCacheAt < DOCTORS_CACHE_TTL_MS;
  if (fresh) return doctorsCache;
  const { data } = await api.get("/patients/doctors");
  doctorsCache = data.data;
  doctorsCacheAt = Date.now();
  return doctorsCache;
}

// 1-based position of a queued patient among everyone currently ticked
// "sent to doctor", ordered by queuedAt (earliest tick = position #1) —
// mirrors the FIFO order the backend's doctor queue uses.
function queuePosition(patients, patientId) {
  const queued = patients
    .filter((p) => p.queuedAt)
    .sort((a, b) => new Date(a.queuedAt) - new Date(b.queuedAt));
  return queued.findIndex((p) => p.id === patientId) + 1;
}

export default function ReceptionistPage() {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState("LOW");
  const [doctorId, setDoctorId] = useState("");
  const [dateFilter, setDateFilter] = useState(todayInIST());
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  // Only the very first fetch shows the full "Loading…" table state.
  // Every fetch after that (date filter change, add-patient reload) uses
  // `refreshing` instead, so the existing rows stay visible the whole time
  // — no flash-to-blank, no layout jump, just a small inline spinner.
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedOnce = useRef(false);
  const [saving, setSaving] = useState(false);

  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [queueTogglingIds, setQueueTogglingIds] = useState(new Set());

  useEffect(() => {
    fetchDoctorsCached()
      .then(setDoctors)
      .catch((err) => toast.error(apiErrorMessage(err)));
  }, []);

  const loadPatients = useCallback(async () => {
    if (hasLoadedOnce.current) setRefreshing(true);
    try {
      const params = {};
      if (dateFilter) params.date = dateFilter;
      const { data } = await api.get("/patients", { params });
      setPatients(data.data);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      hasLoadedOnce.current = true;
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, [dateFilter]);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  useEffect(() => {
    if (selectedPatientId && !patients.some((p) => p.id === selectedPatientId)) {
      setSelectedPatientId("");
    }
  }, [patients, selectedPatientId]);

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

  async function toggleSentToDoctor(patient, checked) {
    setQueueTogglingIds((prev) => new Set(prev).add(patient.id));
    try {
      const { data } = await api.patch(`/patients/${patient.id}/queue`, { queued: checked });
      setPatients((prev) => prev.map((p) => (p.id === patient.id ? data.data : p)));
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setQueueTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(patient.id);
        return next;
      });
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
          <Button variant={dateFilter === todayInIST() ? "default" : "outline"} size="sm" onClick={() => setDateFilter(todayInIST())}>
            Today
          </Button>
          <Button variant={dateFilter === "" ? "default" : "outline"} size="sm" onClick={() => setDateFilter("")}>
            All dates
          </Button>
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
              <h2 className="font-medium">
                Patients {dateFilter === todayInIST() ? "— Today" : dateFilter ? `— ${dateFilter}` : "— All dates"}
              </h2>
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                {refreshing && <Loader2 className="h-3 w-3 animate-spin" />}
                {patients.length} record(s)
              </span>
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
                    <th className="py-2 whitespace-nowrap">Sent to doctor</th>
                  </tr>
                </thead>
                <tbody>
                  {initialLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b last:border-0">
                        {Array.from({ length: 6 }).map((__, j) => (
                          <td key={j} className="py-2.5">
                            <div className="h-4 rounded bg-muted animate-pulse" style={{ width: `${60 + ((i + j) % 3) * 15}%` }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : patients.length === 0 ? (
                    <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">No patients yet</td></tr>
                  ) : (
                    patients.map((p) => (
                      <tr key={p.id} className="border-b last:border-0 hover:bg-muted/40">
                        <td className="py-2 font-medium">{p.name}</td>
                        <td className="py-2 text-muted-foreground">{p.assignedDoctor?.name ?? "—"}</td>
                        <td className="py-2"><Badge tone={CONDITION_TONE[p.conditionLevel]}>{p.conditionLevel}</Badge></td>
                        <td className="py-2 text-muted-foreground">{p.contact ?? "—"}</td>
                        <td className="py-2 text-muted-foreground">{new Date(p.createdAt).toLocaleString()}</td>
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={!!p.queuedAt}
                              disabled={queueTogglingIds.has(p.id)}
                              onCheckedChange={(checked) => toggleSentToDoctor(p, checked)}
                              aria-label={`Mark ${p.name} as sent to doctor`}
                            />
                            {p.queuedAt && (
                              <Badge tone="accent">#{queuePosition(patients, p.id)}</Badge>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <FeesModule patients={patients} selectedPatientId={selectedPatientId} onSelectPatient={setSelectedPatientId} />
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

function FeesModule({ patients, selectedPatientId, onSelectPatient }) {
  const [searchText, setSearchText] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const searchBoxRef = useRef(null);

  const selectedPatient = patients.find((p) => p.id === selectedPatientId) ?? null;

  useEffect(() => {
    setSearchText(selectedPatient ? selectedPatient.name : "");
  }, [selectedPatient?.id]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) setSearchOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const matches = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.contact ?? "").toLowerCase().includes(q),
    );
  }, [patients, searchText]);

  function pickPatient(p) {
    onSelectPatient(p.id);
    setSearchText(p.name);
    setSearchOpen(false);
  }

  function clearSelection() {
    onSelectPatient("");
    setSearchText("");
  }

  async function collect() {
    if (!selectedPatient) return toast.error("Search and select a patient first");
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast.error("Invalid amount");

    setSaving(true);
    try {
      const { data } = await api.post("/patients/fees", {
        patientId: selectedPatient.id,
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
          <tr><th>Patient</th><td>${selectedPatient.name}</td></tr>
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
        <div className="md:col-span-2 relative" ref={searchBoxRef}>
          <Label>Patient</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9 pr-8"
              placeholder="Search today's patients by name or phone…"
              value={searchText}
              onFocus={() => setSearchOpen(true)}
              onChange={(e) => {
                setSearchText(e.target.value);
                setSearchOpen(true);
                if (selectedPatientId) onSelectPatient("");
              }}
            />
            {searchText && (
              <button
                type="button"
                onClick={clearSelection}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear patient selection"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {searchOpen && (
            <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto bg-background border rounded-md shadow-lg">
              {matches.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">No matching patients in this list</div>
              ) : (
                matches.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => pickPatient(p)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/60 flex justify-between items-center ${
                      p.id === selectedPatientId ? "bg-primary/5 font-medium" : ""
                    }`}
                  >
                    <span>{p.name}</span>
                    <span className="text-xs text-muted-foreground">{p.contact ?? "—"}</span>
                  </button>
                ))
              )}
            </div>
          )}
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