import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Edit2, Trash2, FileImage } from "lucide-react";
import { Patient, getPatients, savePatient, deletePatient } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const emptyPatient: Omit<Patient, "id" | "createdAt"> = { name: "", age: 0, sex: "Male", hospitalId: "", symptoms: "", visitDate: new Date().toISOString().slice(0, 10) };

export default function PatientsPage() {
  const [patients, setPatients] = useState(getPatients);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [form, setForm] = useState(emptyPatient);

  const filtered = useMemo(() => patients.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.hospitalId.toLowerCase().includes(search.toLowerCase())), [patients, search]);

  const openNew = () => { setEditing(null); setForm(emptyPatient); setDialogOpen(true); };
  const openEdit = (p: Patient) => { setEditing(p); setForm(p); setDialogOpen(true); };

  const handleSave = () => {
    const patient: Patient = editing
      ? { ...editing, ...form }
      : { ...form, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    savePatient(patient);
    setPatients(getPatients());
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    deletePatient(id);
    setPatients(getPatients());
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Patients</h1>
          <p className="text-sm text-muted-foreground mt-1">{patients.length} registered patients</p>
        </div>
        <Button onClick={openNew} size="sm" className="cta-gradient text-cta-foreground border-0 hover:opacity-90 w-fit">
          <Plus className="w-4 h-4 mr-2" /> Add Patient
        </Button>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search by name or hospital ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <div className="stat-card text-center py-16">
          <p className="text-muted-foreground">No patients found. Add your first patient to get started.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((p) => (
            <Link key={p.id} to={`/patients/${p.id}`} className="stat-card flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                  {p.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.age}y &middot; {p.sex} &middot; ID: {p.hospitalId}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link to={`/upload?patientId=${p.id}`}>
                  <Button variant="ghost" size="icon" title="New Scan"><FileImage className="w-4 h-4" /></Button>
                </Link>
                <Button variant="ghost" size="icon" onClick={() => openEdit(p)} title="Edit"><Edit2 className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} title="Delete"><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Patient" : "New Patient"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div><Label>Full Name</Label><Input className="mt-1.5" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Age</Label><Input className="mt-1.5" type="number" value={form.age || ""} onChange={(e) => setForm({ ...form, age: parseInt(e.target.value) || 0 })} /></div>
              <div>
                <Label>Sex</Label>
                <Select value={form.sex} onValueChange={(v) => setForm({ ...form, sex: v as Patient["sex"] })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Hospital ID</Label><Input className="mt-1.5" value={form.hospitalId} onChange={(e) => setForm({ ...form, hospitalId: e.target.value })} /></div>
            <div><Label>Symptoms</Label><Textarea className="mt-1.5" rows={2} value={form.symptoms} onChange={(e) => setForm({ ...form, symptoms: e.target.value })} /></div>
            <div><Label>Visit Date</Label><Input className="mt-1.5" type="date" value={form.visitDate} onChange={(e) => setForm({ ...form, visitDate: e.target.value })} /></div>
            <Button onClick={handleSave} className="w-full medical-cta-gradient text-ctaund border-0 hover:opacity-90">{editing ? "Save Changes" : "Add Patient"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
