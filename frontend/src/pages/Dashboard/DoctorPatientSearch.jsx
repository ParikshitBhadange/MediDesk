import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Search, Loader2, ChevronRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api, apiErrorMessage } from "@/lib/api";
import UserMenu from "@/components/UserMenu";

const CONDITION_TONE = { CRITICAL: "destructive", HIGH: "warning", MEDIUM: "accent", LOW: "success" };

// Debounces the search box so we're not firing a request on every keystroke.
function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export default function DoctorPatientSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 350);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  const runSearch = useCallback(async (q) => {
    setLoading(true);
    try {
      const { data } = await api.get("/doctor/patients/search", { params: q ? { query: q } : {} });
      setResults(data.data);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    runSearch(debouncedQuery);
  }, [debouncedQuery, runSearch]);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1000px] mx-auto">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <button
            onClick={() => navigate("/doctor")}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to queue
          </button>
          <h1 className="text-2xl font-semibold">Search my patients</h1>
          <p className="text-sm text-muted-foreground">Search by name, disease, or mobile number across every patient you have treated.</p>
        </div>
        <UserMenu />
      </header>

      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            className="pl-9"
            placeholder="Search by name, disease, or mobile number…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground uppercase border-b bg-muted/30">
              <tr>
                <th className="py-3 px-4">Name</th>
                <th className="px-4">Contact</th>
                <th className="px-4">Last diagnosis</th>
                <th className="px-4">Condition</th>
                <th className="px-4">Last visit</th>
                <th className="px-4"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-8 text-center text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Searching…</td></tr>
              ) : results.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    {query ? `No patients match "${query}"` : "No patients found yet."}
                  </td>
                </tr>
              ) : (
                results.map((p) => {
                  const lastConsult = p.consultations?.[0];
                  return (
                    <tr
                      key={p.id}
                      className="border-b last:border-0 hover:bg-muted/40 cursor-pointer"
                      onClick={() => navigate(`/doctor/search/${p.id}`)}
                    >
                      <td className="py-3 px-4 font-medium">{p.name}</td>
                      <td className="px-4 text-muted-foreground">{p.contact ?? "—"}</td>
                      <td className="px-4 text-muted-foreground">{lastConsult?.disease ?? "—"}</td>
                      <td className="px-4"><Badge tone={CONDITION_TONE[p.conditionLevel]}>{p.conditionLevel}</Badge></td>
                      <td className="px-4 text-muted-foreground">
                        {lastConsult ? new Date(lastConsult.createdAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 text-right"><ChevronRight className="h-4 w-4 text-muted-foreground inline" /></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}