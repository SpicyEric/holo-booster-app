import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Store, MapPin, User, Calendar, Trash2, Check, Clock, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface ShopSuggestion {
  id: string;
  user_id: string;
  shop_name: string;
  street: string | null;
  house_number: string | null;
  postal_code: string | null;
  city: string | null;
  contact_person: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  user_email?: string;
}

export default function Leads() {
  const [suggestions, setSuggestions] = useState<ShopSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSuggestion, setSelectedSuggestion] = useState<ShopSuggestion | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    try {
      const { data, error } = await supabase
        .from('shop_suggestions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSuggestions(data || []);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      toast.error('Fehler beim Laden der Leads');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('shop_suggestions')
        .update({ 
          status: newStatus,
          admin_notes: adminNotes || null,
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Status aktualisiert');
      setSelectedSuggestion(null);
      setAdminNotes('');
      fetchSuggestions();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Fehler beim Aktualisieren');
    }
  };

  const deleteSuggestion = async (id: string) => {
    if (!confirm('Diesen Lead wirklich löschen?')) return;

    try {
      const { error } = await supabase
        .from('shop_suggestions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Lead gelöscht');
      fetchSuggestions();
    } catch (error) {
      console.error('Error deleting suggestion:', error);
      toast.error('Fehler beim Löschen');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <Badge className="bg-blue-500">Neu</Badge>;
      case 'contacted':
        return <Badge className="bg-yellow-500">Kontaktiert</Badge>;
      case 'interested':
        return <Badge className="bg-green-500">Interessiert</Badge>;
      case 'not_interested':
        return <Badge variant="secondary">Kein Interesse</Badge>;
      case 'converted':
        return <Badge className="bg-purple-500">Konvertiert</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredSuggestions = suggestions.filter(s => 
    statusFilter === 'all' || s.status === statusFilter
  );

  const formatAddress = (s: ShopSuggestion) => {
    const parts = [];
    if (s.street) {
      parts.push(s.street + (s.house_number ? ' ' + s.house_number : ''));
    }
    if (s.postal_code || s.city) {
      parts.push([s.postal_code, s.city].filter(Boolean).join(' '));
    }
    return parts.join(', ') || 'Keine Adresse';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-muted-foreground">
            Shop-Vorschläge von App-Nutzern
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status filtern" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle anzeigen</SelectItem>
              <SelectItem value="new">Neu</SelectItem>
              <SelectItem value="contacted">Kontaktiert</SelectItem>
              <SelectItem value="interested">Interessiert</SelectItem>
              <SelectItem value="not_interested">Kein Interesse</SelectItem>
              <SelectItem value="converted">Konvertiert</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{suggestions.length}</div>
            <p className="text-xs text-muted-foreground">Gesamt</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-500">
              {suggestions.filter(s => s.status === 'new').length}
            </div>
            <p className="text-xs text-muted-foreground">Neu</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-500">
              {suggestions.filter(s => s.status === 'contacted').length}
            </div>
            <p className="text-xs text-muted-foreground">Kontaktiert</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-500">
              {suggestions.filter(s => s.status === 'interested').length}
            </div>
            <p className="text-xs text-muted-foreground">Interessiert</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-purple-500">
              {suggestions.filter(s => s.status === 'converted').length}
            </div>
            <p className="text-xs text-muted-foreground">Konvertiert</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left p-4 font-medium">Shop</th>
                <th className="text-left p-4 font-medium">Adresse</th>
                <th className="text-left p-4 font-medium">Kontakt</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-left p-4 font-medium">Datum</th>
                <th className="text-right p-4 font-medium">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuggestions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground">
                    Keine Leads vorhanden
                  </td>
                </tr>
              ) : (
                filteredSuggestions.map((s) => (
                  <tr key={s.id} className="border-b hover:bg-muted/30">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Store className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{s.shop_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {formatAddress(s)}
                      </div>
                    </td>
                    <td className="p-4">
                      {s.contact_person ? (
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {s.contact_person}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">–</span>
                      )}
                    </td>
                    <td className="p-4">
                      {getStatusBadge(s.status)}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(s.created_at), 'dd.MM.yyyy', { locale: de })}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedSuggestion(s);
                            setAdminNotes(s.admin_notes || '');
                          }}
                        >
                          Bearbeiten
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteSuggestion(s.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!selectedSuggestion} onOpenChange={() => setSelectedSuggestion(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedSuggestion?.shop_name}</DialogTitle>
            <DialogDescription>
              Lead bearbeiten und Status ändern
            </DialogDescription>
          </DialogHeader>

          {selectedSuggestion && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Adresse:</span>
                  <p>{formatAddress(selectedSuggestion)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Kontakt:</span>
                  <p>{selectedSuggestion.contact_person || 'Nicht angegeben'}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status ändern</label>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant={selectedSuggestion.status === 'contacted' ? 'default' : 'outline'}
                    onClick={() => updateStatus(selectedSuggestion.id, 'contacted')}
                  >
                    <Clock className="h-4 w-4 mr-1" />
                    Kontaktiert
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedSuggestion.status === 'interested' ? 'default' : 'outline'}
                    onClick={() => updateStatus(selectedSuggestion.id, 'interested')}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Interessiert
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedSuggestion.status === 'not_interested' ? 'default' : 'outline'}
                    onClick={() => updateStatus(selectedSuggestion.id, 'not_interested')}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Kein Interesse
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedSuggestion.status === 'converted' ? 'default' : 'outline'}
                    className="bg-purple-500 hover:bg-purple-600"
                    onClick={() => updateStatus(selectedSuggestion.id, 'converted')}
                  >
                    Konvertiert
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Notizen</label>
                <Textarea
                  placeholder="Interne Notizen..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedSuggestion(null)}>
              Schließen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
