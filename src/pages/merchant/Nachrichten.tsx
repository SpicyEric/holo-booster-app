import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, MessageSquare, Tag, Trash2, Edit2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Message {
  id: string;
  title: string;
  body: string;
  show_in_storefront: boolean | null;
  sent_at: string | null;
}

interface Offer {
  id: string;
  title: string;
  description: string | null;
  is_active: boolean | null;
  show_in_storefront: boolean | null;
  valid_until: string | null;
}

const Nachrichten = () => {
  const [loading, setLoading] = useState(true);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [showOfferDialog, setShowOfferDialog] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [saving, setSaving] = useState(false);

  const [messageForm, setMessageForm] = useState({ title: '', body: '', show_in_storefront: true });
  const [offerForm, setOfferForm] = useState({ title: '', description: '', is_active: true, show_in_storefront: true, valid_until: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: assignment } = await supabase
        .from('merchant_assignments')
        .select('customer_id')
        .eq('merchant_user_id', user.id)
        .single();

      if (!assignment) {
        setLoading(false);
        return;
      }

      setCustomerId(assignment.customer_id);

      // Load messages
      const { data: msgData } = await supabase
        .from('app_messages')
        .select('id, title, body, show_in_storefront, sent_at')
        .eq('merchant_customer_id', assignment.customer_id)
        .order('sent_at', { ascending: false });

      if (msgData) {
        setMessages(msgData);
      }

      // Load offers
      const { data: offerData } = await supabase
        .from('offers')
        .select('id, title, description, is_active, show_in_storefront, valid_until')
        .eq('merchant_customer_id', assignment.customer_id)
        .order('created_at', { ascending: false });

      if (offerData) {
        setOffers(offerData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMessage = async () => {
    if (!customerId || !messageForm.title || !messageForm.body) {
      toast.error('Bitte füllen Sie alle Felder aus');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (editingMessage) {
        const { error } = await supabase
          .from('app_messages')
          .update({
            title: messageForm.title,
            body: messageForm.body,
            show_in_storefront: messageForm.show_in_storefront
          })
          .eq('id', editingMessage.id);
        if (error) throw error;
        toast.success('Nachricht aktualisiert');
      } else {
        const { error } = await supabase
          .from('app_messages')
          .insert({
            merchant_customer_id: customerId,
            user_id: user.id,
            title: messageForm.title,
            body: messageForm.body,
            show_in_storefront: messageForm.show_in_storefront,
            sent_at: new Date().toISOString()
          });
        if (error) throw error;
        toast.success('Nachricht erstellt');
      }

      setShowMessageDialog(false);
      setEditingMessage(null);
      setMessageForm({ title: '', body: '', show_in_storefront: true });
      loadData();
    } catch (error) {
      console.error('Error saving message:', error);
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveOffer = async () => {
    if (!customerId || !offerForm.title) {
      toast.error('Bitte geben Sie einen Titel ein');
      return;
    }

    setSaving(true);
    try {
      if (editingOffer) {
        const { error } = await supabase
          .from('offers')
          .update({
            title: offerForm.title,
            description: offerForm.description || null,
            is_active: offerForm.is_active,
            show_in_storefront: offerForm.show_in_storefront,
            valid_until: offerForm.valid_until || null
          })
          .eq('id', editingOffer.id);
        if (error) throw error;
        toast.success('Angebot aktualisiert');
      } else {
        const { error } = await supabase
          .from('offers')
          .insert({
            merchant_customer_id: customerId,
            title: offerForm.title,
            description: offerForm.description || null,
            is_active: offerForm.is_active,
            show_in_storefront: offerForm.show_in_storefront,
            valid_until: offerForm.valid_until || null
          });
        if (error) throw error;
        toast.success('Angebot erstellt');
      }

      setShowOfferDialog(false);
      setEditingOffer(null);
      setOfferForm({ title: '', description: '', is_active: true, show_in_storefront: true, valid_until: '' });
      loadData();
    } catch (error) {
      console.error('Error saving offer:', error);
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMessage = async (id: string) => {
    try {
      const { error } = await supabase.from('app_messages').delete().eq('id', id);
      if (error) throw error;
      toast.success('Nachricht gelöscht');
      loadData();
    } catch (error) {
      toast.error('Fehler beim Löschen');
    }
  };

  const handleDeleteOffer = async (id: string) => {
    try {
      const { error } = await supabase.from('offers').delete().eq('id', id);
      if (error) throw error;
      toast.success('Angebot gelöscht');
      loadData();
    } catch (error) {
      toast.error('Fehler beim Löschen');
    }
  };

  const openEditMessage = (msg: Message) => {
    setEditingMessage(msg);
    setMessageForm({ title: msg.title, body: msg.body, show_in_storefront: msg.show_in_storefront ?? true });
    setShowMessageDialog(true);
  };

  const openEditOffer = (offer: Offer) => {
    setEditingOffer(offer);
    setOfferForm({
      title: offer.title,
      description: offer.description || '',
      is_active: offer.is_active ?? true,
      show_in_storefront: offer.show_in_storefront ?? true,
      valid_until: offer.valid_until?.split('T')[0] || ''
    });
    setShowOfferDialog(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Nachrichten & Angebote</h1>
        <p className="text-muted-foreground">Kommunizieren Sie mit Ihren Kunden</p>
      </div>

      {/* Messages */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Nachrichten
            </CardTitle>
            <CardDescription>Senden Sie Nachrichten an Ihre Kunden</CardDescription>
          </div>
          <Button onClick={() => { setEditingMessage(null); setMessageForm({ title: '', body: '', show_in_storefront: true }); setShowMessageDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Neue Nachricht
          </Button>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Noch keine Nachrichten</p>
          ) : (
            <div className="space-y-2">
              {messages.map((msg) => (
                <div key={msg.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{msg.title}</p>
                    <p className="text-sm text-muted-foreground line-clamp-1">{msg.body}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {msg.show_in_storefront && <Badge variant="secondary">Sichtbar</Badge>}
                    <Button variant="ghost" size="sm" onClick={() => openEditMessage(msg)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteMessage(msg.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Offers */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Angebote
            </CardTitle>
            <CardDescription>Erstellen Sie Sonderangebote für Ihre Kunden</CardDescription>
          </div>
          <Button onClick={() => { setEditingOffer(null); setOfferForm({ title: '', description: '', is_active: true, show_in_storefront: true, valid_until: '' }); setShowOfferDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Neues Angebot
          </Button>
        </CardHeader>
        <CardContent>
          {offers.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Noch keine Angebote</p>
          ) : (
            <div className="space-y-2">
              {offers.map((offer) => (
                <div key={offer.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{offer.title}</p>
                    {offer.description && <p className="text-sm text-muted-foreground line-clamp-1">{offer.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={offer.is_active ? "default" : "secondary"}>
                      {offer.is_active ? 'Aktiv' : 'Inaktiv'}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => openEditOffer(offer)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteOffer(offer.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Message Dialog */}
      <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMessage ? 'Nachricht bearbeiten' : 'Neue Nachricht'}</DialogTitle>
            <DialogDescription>Diese Nachricht wird an alle Ihre Kunden gesendet</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Titel</Label>
              <Input
                value={messageForm.title}
                onChange={(e) => setMessageForm({ ...messageForm, title: e.target.value })}
                placeholder="z.B. Neues Angebot!"
              />
            </div>
            <div>
              <Label>Nachricht</Label>
              <Textarea
                value={messageForm.body}
                onChange={(e) => setMessageForm({ ...messageForm, body: e.target.value })}
                placeholder="Ihre Nachricht..."
                rows={4}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>In App anzeigen</Label>
              <Switch
                checked={messageForm.show_in_storefront}
                onCheckedChange={(checked) => setMessageForm({ ...messageForm, show_in_storefront: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMessageDialog(false)}>Abbrechen</Button>
            <Button onClick={handleSaveMessage} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Offer Dialog */}
      <Dialog open={showOfferDialog} onOpenChange={setShowOfferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingOffer ? 'Angebot bearbeiten' : 'Neues Angebot'}</DialogTitle>
            <DialogDescription>Erstellen Sie ein Sonderangebot für Ihre Kunden</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Titel</Label>
              <Input
                value={offerForm.title}
                onChange={(e) => setOfferForm({ ...offerForm, title: e.target.value })}
                placeholder="z.B. 20% Rabatt"
              />
            </div>
            <div>
              <Label>Beschreibung (optional)</Label>
              <Textarea
                value={offerForm.description}
                onChange={(e) => setOfferForm({ ...offerForm, description: e.target.value })}
                placeholder="Details zum Angebot..."
                rows={3}
              />
            </div>
            <div>
              <Label>Gültig bis (optional)</Label>
              <Input
                type="date"
                value={offerForm.valid_until}
                onChange={(e) => setOfferForm({ ...offerForm, valid_until: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Aktiv</Label>
              <Switch
                checked={offerForm.is_active}
                onCheckedChange={(checked) => setOfferForm({ ...offerForm, is_active: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>In App anzeigen</Label>
              <Switch
                checked={offerForm.show_in_storefront}
                onCheckedChange={(checked) => setOfferForm({ ...offerForm, show_in_storefront: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOfferDialog(false)}>Abbrechen</Button>
            <Button onClick={handleSaveOffer} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Nachrichten;
