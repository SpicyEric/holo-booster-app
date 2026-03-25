import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  Plus, RefreshCw, Phone, Mail, MapPin, Calendar, MessageSquare,
  AlertTriangle, ChevronRight, Search, User, Store,
} from "lucide-react";

const PIPELINE_STAGES = [
  { value: "new", label: "Neu", color: "bg-blue-500", textColor: "text-blue-700", bgLight: "bg-blue-50" },
  { value: "contacted", label: "Kontaktiert", color: "bg-yellow-500", textColor: "text-yellow-700", bgLight: "bg-yellow-50" },
  { value: "interested", label: "Interessiert", color: "bg-emerald-500", textColor: "text-emerald-700", bgLight: "bg-emerald-50" },
  { value: "negotiating", label: "In Verhandlung", color: "bg-purple-500", textColor: "text-purple-700", bgLight: "bg-purple-50" },
  { value: "won", label: "Abgeschlossen", color: "bg-green-600", textColor: "text-green-700", bgLight: "bg-green-50" },
  { value: "lost", label: "Kein Interesse", color: "bg-gray-400", textColor: "text-gray-600", bgLight: "bg-gray-50" },
  { value: "churned", label: "Ex-Kunde", color: "bg-red-500", textColor: "text-red-700", bgLight: "bg-red-50" },
];

interface PipelineLead {
  id: string;
  shop_name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  street: string | null;
  house_number: string | null;
  postal_code: string | null;
  city: string | null;
  industry: string | null;
  status: string;
  priority: string | null;
  notes: string | null;
  next_contact_date: string | null;
  last_contact_date: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
}

interface LeadNote {
  id: string;
  note: string;
  created_at: string;
}

export default function Pipeline() {
  const [leads, setLeads] = useState<PipelineLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLead, setSelectedLead] = useState<PipelineLead | null>(null);
  const [leadNotes, setLeadNotes] = useState<LeadNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newLead, setNewLead] = useState({
    shop_name: "", contact_person: "", phone: "", email: "",
    street: "", house_number: "", postal_code: "", city: "", industry: "", notes: "",
  });

  useEffect(() => { loadLeads(); }, []);

  const loadLeads = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("pipeline_leads" as any)
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      setLeads((data as any) || []);
    } catch (e) {
      console.error(e);
      toast.error("Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  };

  const loadNotes = async (leadId: string) => {
    const { data } = await supabase
      .from("pipeline_lead_notes" as any)
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });
    setLeadNotes((data as any) || []);
  };

  const handleSelectLead = async (lead: PipelineLead) => {
    setSelectedLead(lead);
    await loadNotes(lead.id);
  };

  const handleAddNote = async () => {
    if (!selectedLead || !newNote.trim()) return;
    try {
      const { error } = await supabase.from("pipeline_lead_notes" as any).insert({
        lead_id: selectedLead.id, note: newNote.trim(),
      } as any);
      if (error) throw error;
      toast.success("Notiz hinzugefügt");
      setNewNote("");
      loadNotes(selectedLead.id);

      // Update last_contact_date
      await supabase.from("pipeline_leads" as any).update({
        last_contact_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any).eq("id", selectedLead.id);
      loadLeads();
    } catch (e) {
      toast.error("Fehler");
    }
  };

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      const update: any = { status: newStatus, updated_at: new Date().toISOString() };
      if (newStatus === "contacted" || newStatus === "negotiating") {
        update.last_contact_date = new Date().toISOString();
      }
      const { error } = await supabase.from("pipeline_leads" as any).update(update).eq("id", leadId);
      if (error) throw error;
      toast.success("Status aktualisiert");
      loadLeads();
      if (selectedLead?.id === leadId) {
        setSelectedLead((prev) => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (e) {
      toast.error("Fehler");
    }
  };

  const handleAddLead = async () => {
    if (!newLead.shop_name.trim()) { toast.error("Shopname erforderlich"); return; }
    try {
      const { error } = await supabase.from("pipeline_leads" as any).insert({
        ...newLead,
        contact_person: newLead.contact_person || null,
        phone: newLead.phone || null,
        email: newLead.email || null,
        street: newLead.street || null,
        house_number: newLead.house_number || null,
        postal_code: newLead.postal_code || null,
        city: newLead.city || null,
        industry: newLead.industry || null,
        notes: newLead.notes || null,
      } as any);
      if (error) throw error;
      toast.success("Lead hinzugefügt");
      setShowAddDialog(false);
      setNewLead({ shop_name: "", contact_person: "", phone: "", email: "", street: "", house_number: "", postal_code: "", city: "", industry: "", notes: "" });
      loadLeads();
    } catch (e) {
      toast.error("Fehler beim Erstellen");
    }
  };

  const handleDeleteLead = async (id: string) => {
    try {
      const { error } = await supabase.from("pipeline_leads" as any).delete().eq("id", id);
      if (error) throw error;
      toast.success("Lead gelöscht");
      setSelectedLead(null);
      loadLeads();
    } catch (e) {
      toast.error("Fehler");
    }
  };

  const getStageConfig = (status: string) => PIPELINE_STAGES.find((s) => s.value === status) || PIPELINE_STAGES[0];

  const filteredLeads = leads.filter((l) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return l.shop_name.toLowerCase().includes(term) || l.city?.toLowerCase().includes(term) || l.contact_person?.toLowerCase().includes(term);
  });

  // Overdue leads (no contact for 14+ days, not won/lost)
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const overdueLeads = leads.filter((l) =>
    !["won", "lost"].includes(l.status) &&
    (!l.last_contact_date || new Date(l.last_contact_date) < fourteenDaysAgo)
  );

  // Stage counts
  const stageCounts = PIPELINE_STAGES.map((stage) => ({
    ...stage,
    count: leads.filter((l) => l.status === stage.value).length,
  }));

  const formatAddress = (l: PipelineLead) => {
    const parts = [];
    if (l.street) parts.push(l.street + (l.house_number ? " " + l.house_number : ""));
    if (l.postal_code || l.city) parts.push([l.postal_code, l.city].filter(Boolean).join(" "));
    return parts.join(", ") || "Keine Adresse";
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Sales Pipeline</h1>
          <p className="text-xs text-muted-foreground">{leads.length} Leads insgesamt</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={loadLeads}><RefreshCw className="w-3 h-3 mr-1" />Aktualisieren</Button>
          <Button size="sm" onClick={() => setShowAddDialog(true)}><Plus className="w-3 h-3 mr-1" />Neuer Lead</Button>
        </div>
      </div>

      {/* Overdue Alert */}
      {overdueLeads.length > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="text-sm font-medium">{overdueLeads.length} Lead{overdueLeads.length > 1 ? "s" : ""} seit 14+ Tagen ohne Kontakt</span>
        </div>
      )}

      {/* Pipeline Stage Overview */}
      <div className="grid grid-cols-7 gap-2">
        {stageCounts.map((stage) => (
          <Card key={stage.value} className={`p-3 text-center ${stage.bgLight} border-none`}>
            <div className={`text-2xl font-bold ${stage.textColor}`}>{stage.count}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">{stage.label}</p>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input placeholder="Lead suchen..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8 h-8 text-sm" />
      </div>

      {/* Leads Table */}
      <Card className="bg-white rounded-xl border-border/30 overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-sm text-muted-foreground">Laden...</div>
        ) : filteredLeads.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">Keine Leads vorhanden</div>
        ) : (
          <table className="w-full">
            <thead className="bg-muted/30 border-b">
              <tr>
                <th className="text-left p-3 text-xs font-semibold">Shop</th>
                <th className="text-left p-3 text-xs font-semibold">Kontakt</th>
                <th className="text-left p-3 text-xs font-semibold">Adresse</th>
                <th className="text-left p-3 text-xs font-semibold">Status</th>
                <th className="text-left p-3 text-xs font-semibold">Letzter Kontakt</th>
                <th className="text-right p-3 text-xs font-semibold w-8"></th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => {
                const stage = getStageConfig(lead.status);
                const isOverdue = !["won", "lost"].includes(lead.status) && (!lead.last_contact_date || new Date(lead.last_contact_date) < fourteenDaysAgo);
                return (
                  <tr
                    key={lead.id}
                    className={`border-b cursor-pointer hover:bg-[hsl(262,40%,97%)] transition-colors ${isOverdue ? "bg-amber-50/50" : ""}`}
                    onClick={() => handleSelectLead(lead)}
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stage.bgLight}`}>
                          <Store className={`w-4 h-4 ${stage.textColor}`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{lead.shop_name}</p>
                          {lead.industry && <p className="text-[10px] text-muted-foreground">{lead.industry}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      {lead.contact_person ? (
                        <div className="text-sm flex items-center gap-1"><User className="w-3 h-3 text-muted-foreground" />{lead.contact_person}</div>
                      ) : <span className="text-sm text-muted-foreground">—</span>}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate max-w-[140px]">{formatAddress(lead)}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge className={`${stage.color} text-white text-[10px] px-2`}>{stage.label}</Badge>
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {lead.last_contact_date
                        ? format(new Date(lead.last_contact_date), "dd.MM.yyyy", { locale: de })
                        : "Noch nie"}
                    </td>
                    <td className="p-3 text-right">
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {/* Lead Detail Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="w-5 h-5" />
              {selectedLead?.shop_name}
            </DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {selectedLead.contact_person && (
                  <div className="flex items-center gap-2"><User className="w-3.5 h-3.5 text-muted-foreground" />{selectedLead.contact_person}</div>
                )}
                {selectedLead.phone && (
                  <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-muted-foreground" />{selectedLead.phone}</div>
                )}
                {selectedLead.email && (
                  <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-muted-foreground" />{selectedLead.email}</div>
                )}
                <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-muted-foreground" />{formatAddress(selectedLead)}</div>
              </div>

              {/* Status Progress */}
              <div>
                <Label className="text-xs mb-2 block">Pipeline-Status</Label>
                <div className="flex flex-wrap gap-1.5">
                  {PIPELINE_STAGES.map((stage) => (
                    <Button
                      key={stage.value}
                      size="sm"
                      variant={selectedLead.status === stage.value ? "default" : "outline"}
                      className={`h-7 text-xs ${selectedLead.status === stage.value ? stage.color + " text-white border-none" : ""}`}
                      onClick={() => handleStatusChange(selectedLead.id, stage.value)}
                    >
                      {stage.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-[hsl(262,50%,55%)] transition-all"
                  style={{
                    width: `${Math.max(
                      ((PIPELINE_STAGES.findIndex((s) => s.value === selectedLead.status) + 1) / PIPELINE_STAGES.length) * 100,
                      10
                    )}%`,
                  }}
                />
              </div>

              {/* Notes */}
              {selectedLead.notes && (
                <div className="p-3 bg-muted/30 rounded-lg text-sm">
                  <p className="text-xs text-muted-foreground mb-1">Allgemeine Notiz</p>
                  {selectedLead.notes}
                </div>
              )}

              {/* Activity Notes */}
              <div>
                <Label className="text-xs mb-2 block">Kontakthistorie</Label>
                <div className="flex gap-2 mb-3">
                  <Input
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Notiz hinzufügen..."
                    className="text-sm h-8"
                    onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
                  />
                  <Button size="sm" onClick={handleAddNote} disabled={!newNote.trim()}>
                    <MessageSquare className="w-3 h-3 mr-1" />Hinzufügen
                  </Button>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {leadNotes.map((note) => (
                    <div key={note.id} className="p-2.5 bg-muted/20 rounded-lg border border-border/30">
                      <p className="text-sm">{note.note}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {format(new Date(note.created_at), "dd.MM.yyyy HH:mm", { locale: de })}
                      </p>
                    </div>
                  ))}
                  {leadNotes.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-3">Keine Notizen vorhanden</p>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex justify-between">
            <Button variant="destructive" size="sm" onClick={() => selectedLead && handleDeleteLead(selectedLead.id)}>
              Löschen
            </Button>
            <Button variant="outline" onClick={() => setSelectedLead(null)}>Schließen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Lead Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Neuen Lead anlegen</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">Shopname *</Label>
              <Input value={newLead.shop_name} onChange={(e) => setNewLead({ ...newLead, shop_name: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Kontaktperson</Label>
              <Input value={newLead.contact_person} onChange={(e) => setNewLead({ ...newLead, contact_person: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Branche</Label>
              <Input value={newLead.industry} onChange={(e) => setNewLead({ ...newLead, industry: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Telefon</Label>
              <Input value={newLead.phone} onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">E-Mail</Label>
              <Input value={newLead.email} onChange={(e) => setNewLead({ ...newLead, email: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Straße</Label>
              <Input value={newLead.street} onChange={(e) => setNewLead({ ...newLead, street: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Hausnr.</Label>
              <Input value={newLead.house_number} onChange={(e) => setNewLead({ ...newLead, house_number: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">PLZ</Label>
              <Input value={newLead.postal_code} onChange={(e) => setNewLead({ ...newLead, postal_code: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Stadt</Label>
              <Input value={newLead.city} onChange={(e) => setNewLead({ ...newLead, city: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Notizen</Label>
              <Textarea value={newLead.notes} onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Abbrechen</Button>
            <Button onClick={handleAddLead}>Lead erstellen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
