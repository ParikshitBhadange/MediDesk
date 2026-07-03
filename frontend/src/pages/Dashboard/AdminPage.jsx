import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Trash2,
  FileDown,
  FileSpreadsheet,
  Users,
  Stethoscope,
  User as UserIcon,
  DollarSign,
  Loader2,
  ListPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { api, apiErrorMessage } from "@/lib/api";
import { exportToPDF, exportToExcel } from "@/lib/export";

export default function AdminPage() {
  const [stats, setStats] = useState(null);

  const loadStats = useCallback(async () => {
    try {
      const { data } = await api.get("/admin/stats");
      setStats(data.data);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="text-sm text-muted-foreground">Full visibility across the hospital.</p>
      </header>

      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <Stat icon={UserIcon} label="Patients" value={stats?.patients} tint="bg-primary/10 text-primary" />
        <Stat icon={Stethoscope} label="Doctors" value={stats?.doctors} tint="bg-accent text-accent-foreground" />
        <Stat icon={Users} label="Staff" value={stats?.staff} tint="bg-secondary text-secondary-foreground" />
        <Stat
          icon={DollarSign}
          label="Fees collected"
          value={stats ? `$${Number(stats.feesCollected).toFixed(0)}` : undefined}
          tint="bg-success/15 text-success"
        />
      </div>

      <Tabs defaultValue="patients">
        <TabsList>
          <TabsTrigger value="patients">Patients</TabsTrigger>
          <TabsTrigger value="workers">Staff & Doctors</TabsTrigger>
          <TabsTrigger value="fees">Fees</TabsTrigger>
          <TabsTrigger value="audit">Audit log</TabsTrigger>
        </TabsList>
        <TabsContent value="patients" className="pt-4">
          <PatientsPanel />
        </TabsContent>
        <TabsContent value="workers" className="pt-4">
          <WorkersPanel onChanged={loadStats} />
        </TabsContent>
        <TabsContent value="fees" className="pt-4">
          <FeesPanel />
        </TabsContent>
        <TabsContent value="audit" className="pt-4">
          <AuditPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ icon: Icon, label, value, tint }) {
  return (
    <Card className="p-4 flex items-center gap-4">
      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${tint}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-2xl font-semibold">{value ?? "…"}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </Card>
  );
}

function PatientsPanel() {
  const [patients, setPatients] = useState([]);
  const [level, setLevel] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (level !== "all") params.conditionLevel = level;
      if (search) params.search = search;
      const { data } = await api.get("/patients", { params });
      setPatients(data.data);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [level, search]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function remove(id) {
    try {
      await api.delete(`/patients/${id}`);
      toast.success("Deleted");
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  const rows = patients.map((p) => [
    p.name,
    p.contact ?? "",
    p.assignedDoctor?.name ?? "",
    p.conditionLevel,
    new Date(p.createdAt).toLocaleString(),
  ]);

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div className="flex gap-2 items-end">
          <div>
            <Label>Search</Label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name…" />
          </div>
          <div>
            <Label>Condition</Label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportToPDF("Patients", ["Name", "Contact", "Doctor", "Condition", "Registered"], rows)}
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
                })),
              )
            }
          >
            <FileSpreadsheet className="h-4 w-4 mr-1.5" /> Excel
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground uppercase border-b">
            <tr>
              <th className="py-2">Name</th>
              <th>Contact</th>
              <th>Doctor</th>
              <th>Condition</th>
              <th>Registered</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">Loading…</td></tr>
            ) : patients.length === 0 ? (
              <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">No patients</td></tr>
            ) : (
              patients.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="py-2 font-medium">{p.name}</td>
                  <td>{p.contact ?? "—"}</td>
                  <td>{p.assignedDoctor?.name ?? "—"}</td>
                  <td>{p.conditionLevel}</td>
                  <td className="text-muted-foreground">{new Date(p.createdAt).toLocaleString()}</td>
                  <td>
                    <button className="text-muted-foreground hover:text-destructive" onClick={() => remove(p.id)}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function WorkersPanel({ onChanged }) {
  const [staff, setStaff] = useState([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("DOCTOR");
  const [assigning, setAssigning] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/admin/staff");
      setStaff(data.data);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function assign() {
    setAssigning(true);
    try {
      await api.post("/admin/assign-role", { email, role });
      toast.success("Role assigned");
      setEmail("");
      load();
      onChanged?.();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setAssigning(false);
    }
  }

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <Label>Assign role by email</Label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@hospital.com" />
        </div>
        <div>
          <Label>Role</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="RECEPTIONIST">Receptionist</SelectItem>
              <SelectItem value="DOCTOR">Doctor</SelectItem>
              <SelectItem value="ADMIN">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={assign} disabled={assigning || !email}>
          {assigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ListPlus className="h-4 w-4 mr-1.5" /> Assign</>}
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground uppercase border-b">
            <tr><th className="py-2">Name</th><th>Email</th><th>Specialty</th><th>Role</th></tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id} className="border-b last:border-0">
                <td className="py-2 font-medium">{s.name || "—"}</td>
                <td>{s.email}</td>
                <td className="text-muted-foreground">{s.specialty ?? "—"}</td>
                <td><Badge>{s.role}</Badge></td>
              </tr>
            ))}
            {staff.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">No staff yet</td></tr>}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function FeesPanel() {
  const [fees, setFees] = useState([]);

  useEffect(() => {
    api
      .get("/patients/fees")
      .then(({ data }) => setFees(data.data))
      .catch((err) => toast.error(apiErrorMessage(err)));
  }, []);

  return (
    <Card className="p-4">
      <div className="flex justify-end gap-2 mb-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            exportToPDF(
              "Fees",
              ["Date", "Patient", "Amount", "Method"],
              fees.map((f) => [new Date(f.createdAt).toLocaleString(), f.patient?.name ?? "", Number(f.amount).toFixed(2), f.method]),
            )
          }
        >
          <FileDown className="h-4 w-4 mr-1.5" /> PDF
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            exportToExcel(
              "fees",
              "Fees",
              fees.map((f) => ({
                Date: new Date(f.createdAt).toLocaleString(),
                Patient: f.patient?.name ?? "",
                Amount: f.amount,
                Method: f.method,
              })),
            )
          }
        >
          <FileSpreadsheet className="h-4 w-4 mr-1.5" /> Excel
        </Button>
      </div>
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-muted-foreground uppercase border-b">
          <tr><th className="py-2">Date</th><th>Patient</th><th>Amount</th><th>Method</th><th>Description</th></tr>
        </thead>
        <tbody>
          {fees.map((f) => (
            <tr key={f.id} className="border-b last:border-0">
              <td className="py-2">{new Date(f.createdAt).toLocaleString()}</td>
              <td>{f.patient?.name ?? "—"}</td>
              <td>${Number(f.amount).toFixed(2)}</td>
              <td>{f.method}</td>
              <td className="text-muted-foreground">{f.description ?? "—"}</td>
            </tr>
          ))}
          {fees.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">No fees yet</td></tr>}
        </tbody>
      </table>
    </Card>
  );
}

function AuditPanel() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    api
      .get("/admin/audit-logs")
      .then(({ data }) => setLogs(data.data))
      .catch((err) => toast.error(apiErrorMessage(err)));
  }, []);

  return (
    <Card className="p-4">
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-muted-foreground uppercase border-b">
          <tr><th className="py-2">When</th><th>User</th><th>Action</th><th>Entity</th></tr>
        </thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l.id} className="border-b last:border-0">
              <td className="py-2">{new Date(l.createdAt).toLocaleString()}</td>
              <td className="text-muted-foreground">{l.user?.name ?? l.userId?.slice(0, 8) ?? "—"}</td>
              <td>{l.action}</td>
              <td>{l.entity}</td>
            </tr>
          ))}
          {logs.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">No audit entries yet</td></tr>}
        </tbody>
      </table>
    </Card>
  );
}
