import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, MessageSquare, Gift, Trash2, Edit2, Send, Users, Clock, UserPlus } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Json } from '@/integrations/supabase/types';

interface Segment {
  type: 'all' | 'last_stamped_days' | 'not_stamped_days' | 'stamped_between';
  value?: number;
  from_days?: number;
  to_days?: number;
}

interface Message {
  id: string;
  title: string;
  body: string;
  show_in_storefront: boolean | null;
  sent_at: string | null;
  segment: Segment;
  offer_id: string | null;
  is_sent: boolean | null;
  recipient_count: number | null;
}

interface Offer {
  id: string;
  title: string;
  description: string | null;
}

interface NewCustomerOffer {
  id: string;
  title: string;
  description: string | null;
  bonus_stamps: number | null;
  is_active: boolean | null;
}

const SEGMENT_OPTIONS = [
  { value: 'all', label: 'Alle Kunden', description: 'Alle, die bei Ihnen schon mal Punkte gesammelt haben' },
  { value: 'last_stamped_days', label: 'Kürzlich gestempelt', description: 'Kunden die innerhalb der letzten X Tage gestempelt haben' },
  { value: 'not_stamped_days', label: 'Lange nicht gestempelt', description: 'Kunden die seit X Tagen nicht mehr gestempelt haben' },
];

const Nachrichten = () => {
  const [loading, setLoading] = useState(true);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [newCustomerOffer, setNewCustomerOffer] = useState<NewCustomerOffer | null>(null);
  
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [showNewCustomerOfferDialog, setShowNewCustomerOfferDialog] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [saving, setSaving] = useState(false);
  const [estimatingRecipients, setEstimatingRecipients] = useState(false);
  const [estimatedRecipients, setEstimatedRecipients] = useState<number | null>(null);

  const [messageForm, setMessageForm] = useState({
    title: '',
    body: '',
    show_in_storefront: true,
    segment_type: 'all' as Segment['type'],
    segment_value: 30,
    attach_offer: false,
    offer_title: '',
    offer_description: ''
  });

  const [newCustomerOfferForm, setNewCustomerOfferForm] = useState({
    title: '',
    description: '',
    bonus_stamps: 0,
    is_active: true
  });

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
        .maybeSingle();

      if (!assignment) {
        setLoading(false);
        return;
      }

      setCustomerId(assignment.customer_id);

      // Load messages
      const { data: msgData } = await supabase
        .from('app_messages')
        .select('*')
        .eq('merchant_customer_id', assignment.customer_id)
        .order('sent_at', { ascending: false });

      if (msgData) {
        const typedMessages = msgData.map((msg: any) => ({
          id: msg.id,
          title: msg.title,
          body: msg.body,
          show_in_storefront: msg.show_in_storefront,
          sent_at: msg.sent_at,
          segment: (msg.segment as Segment) || { type: 'all' as const },
          offer_id: msg.offer_id || null,
          is_sent: msg.is_sent || false,
          recipient_count: msg.recipient_count || 0
        }));
        setMessages(typedMessages);
      }

      // Load offers for attachment
      const { data: offerData } = await supabase
        .from('offers')
        .select('id, title, description')
        .eq('merchant_customer_id', assignment.customer_id)
        .eq('is_active', true);

      if (offerData) {
        setOffers(offerData);
      }

      // Load new customer offer
      const { data: ncoData } = await supabase
        .from('new_customer_offers')
        .select('*')
        .eq('merchant_customer_id', assignment.customer_id)
        .maybeSingle();

      setNewCustomerOffer(ncoData);
      if (ncoData) {
        setNewCustomerOfferForm({
          title: ncoData.title,
          description: ncoData.description || '',
          bonus_stamps: ncoData.bonus_stamps || 0,
          is_active: ncoData.is_active ?? true
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const estimateRecipients = async () => {
    if (!customerId) return;
    
    setEstimatingRecipients(true);
    try {
      // Call edge function to estimate recipients
      const { data, error } = await supabase.functions.invoke('estimate-campaign', {
        body: {
          segment: {
            type: messageForm.segment_type,
            value: messageForm.segment_value
          }
        }
      });

      if (error) throw error;
      setEstimatedRecipients(data?.estRecipients || 0);
    } catch (error) {
      console.error('Error estimating recipients:', error);
      setEstimatedRecipients(null);
    } finally {
      setEstimatingRecipients(false);
    }
  };

  useEffect(() => {
    if (showMessageDialog && customerId) {
      const timer = setTimeout(() => {
        estimateRecipients();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [messageForm.segment_type, messageForm.segment_value, showMessageDialog]);

  const handleSaveMessage = async () => {
    if (!customerId || !messageForm.title || !messageForm.body) {
      toast.error('Bitte füllen Sie alle Felder aus');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create offer if attached
      let offerId: string | null = null;
      if (messageForm.attach_offer && messageForm.offer_title) {
        const { data: offerData, error: offerError } = await supabase
          .from('offers')
          .insert({
            merchant_customer_id: customerId,
            title: messageForm.offer_title,
            description: messageForm.offer_description || null,
            is_active: true,
            show_in_storefront: false // Only visible via message
          })
          .select('id')
          .single();
        
        if (offerError) throw offerError;
        offerId = offerData.id;
      }

      const segment: Segment = {
        type: messageForm.segment_type,
        value: messageForm.segment_type !== 'all' ? messageForm.segment_value : undefined
      };

      if (editingMessage) {
        const { error } = await supabase
          .from('app_messages')
          .update({
            title: messageForm.title,
            body: messageForm.body,
            show_in_storefront: messageForm.show_in_storefront,
            segment: segment as unknown as Json,
            offer_id: offerId || editingMessage.offer_id
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
            sent_at: new Date().toISOString(),
            segment: segment as unknown as Json,
            offer_id: offerId,
            is_sent: true,
            recipient_count: estimatedRecipients || 0
          });
        if (error) throw error;
        toast.success('Nachricht gesendet!');
      }

      setShowMessageDialog(false);
      setEditingMessage(null);
      resetMessageForm();
      loadData();
    } catch (error) {
      console.error('Error saving message:', error);
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const resetMessageForm = () => {
    setMessageForm({
      title: '',
      body: '',
      show_in_storefront: true,
      segment_type: 'all',
      segment_value: 30,
      attach_offer: false,
      offer_title: '',
      offer_description: ''
    });
    setEstimatedRecipients(null);
  };

  const handleSaveNewCustomerOffer = async () => {
    if (!customerId || !newCustomerOfferForm.title) {
      toast.error('Bitte geben Sie einen Titel ein');
      return;
    }

    setSaving(true);
    try {
      if (newCustomerOffer) {
        // Update existing
        const { error } = await supabase
          .from('new_customer_offers')
          .update({
            title: newCustomerOfferForm.title,
            description: newCustomerOfferForm.description || null,
            bonus_stamps: newCustomerOfferForm.bonus_stamps,
            is_active: newCustomerOfferForm.is_active
          })
          .eq('id', newCustomerOffer.id);
        if (error) throw error;
        toast.success('Neukundenangebot aktualisiert');
      } else {
        // Create new
        const { error } = await supabase
          .from('new_customer_offers')
          .insert({
            merchant_customer_id: customerId,
            title: newCustomerOfferForm.title,
            description: newCustomerOfferForm.description || null,
            bonus_stamps: newCustomerOfferForm.bonus_stamps,
            is_active: newCustomerOfferForm.is_active
          });
        if (error) throw error;
        toast.success('Neukundenangebot erstellt');
      }

      setShowNewCustomerOfferDialog(false);
      loadData();
    } catch (error) {
      console.error('Error saving new customer offer:', error);
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

  const handleDeleteNewCustomerOffer = async () => {
    if (!newCustomerOffer) return;
    try {
      const { error } = await supabase.from('new_customer_offers').delete().eq('id', newCustomerOffer.id);
      if (error) throw error;
      toast.success('Neukundenangebot gelöscht');
      setNewCustomerOffer(null);
      setNewCustomerOfferForm({ title: '', description: '', bonus_stamps: 0, is_active: true });
    } catch (error) {
      toast.error('Fehler beim Löschen');
    }
  };

  const openEditMessage = (msg: Message) => {
    setEditingMessage(msg);
    setMessageForm({
      title: msg.title,
      body: msg.body,
      show_in_storefront: msg.show_in_storefront ?? true,
      segment_type: msg.segment?.type || 'all',
      segment_value: msg.segment?.value || 30,
      attach_offer: !!msg.offer_id,
      offer_title: '',
      offer_description: ''
    });
    setShowMessageDialog(true);
  };

  const getSegmentLabel = (segment: Segment) => {
    switch (segment.type) {
      case 'all':
        return 'Alle Kunden';
      case 'last_stamped_days':
        return `Gestempelt in ${segment.value} Tagen`;
      case 'not_stamped_days':
        return `${segment.value}+ Tage inaktiv`;
      default:
        return 'Alle Kunden';
    }
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
        <p className="text-muted-foreground">Erreichen Sie Ihre Kunden gezielt</p>
      </div>

      {/* Neukundenangebot */}
      <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Neukundenangebot
            </CardTitle>
            <CardDescription>
              Locken Sie neue Kunden an, die noch nie bei Ihnen waren
            </CardDescription>
          </div>
          <Button 
            variant={newCustomerOffer ? "outline" : "default"}
            onClick={() => setShowNewCustomerOfferDialog(true)}
          >
            {newCustomerOffer ? (
              <>
                <Edit2 className="h-4 w-4 mr-2" />
                Bearbeiten
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Erstellen
              </>
            )}
          </Button>
        </CardHeader>
        <CardContent>
          {newCustomerOffer ? (
            <div className="flex items-center justify-between p-4 bg-background rounded-lg border">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold">{newCustomerOffer.title}</p>
                  <Badge variant={newCustomerOffer.is_active ? "default" : "secondary"}>
                    {newCustomerOffer.is_active ? 'Aktiv' : 'Inaktiv'}
                  </Badge>
                </div>
                {newCustomerOffer.description && (
                  <p className="text-sm text-muted-foreground">{newCustomerOffer.description}</p>
                )}
                {(newCustomerOffer.bonus_stamps ?? 0) > 0 && (
                  <p className="text-sm text-primary mt-1">
                    +{newCustomerOffer.bonus_stamps} Bonus-Punkte für Neukunden
                  </p>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={handleDeleteNewCustomerOffer}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              Kein Neukundenangebot aktiv. Erstellen Sie eines, um neue Kunden anzulocken!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Nachrichten */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Nachrichten
            </CardTitle>
            <CardDescription>
              Senden Sie gezielte Nachrichten an Ihre Kunden
            </CardDescription>
          </div>
          <Button onClick={() => { 
            setEditingMessage(null); 
            resetMessageForm();
            setShowMessageDialog(true); 
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Neue Nachricht
          </Button>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Noch keine Nachrichten gesendet</p>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{msg.title}</p>
                      {msg.offer_id && <Badge variant="outline"><Gift className="h-3 w-3 mr-1" />Mit Angebot</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">{msg.body}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary" className="text-xs">
                        <Users className="h-3 w-3 mr-1" />
                        {getSegmentLabel(msg.segment)}
                      </Badge>
                      {msg.recipient_count !== null && msg.recipient_count > 0 && (
                        <span>{msg.recipient_count} Empfänger</span>
                      )}
                      {msg.sent_at && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(msg.sent_at).toLocaleDateString('de-DE')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
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

      {/* Message Dialog */}
      <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingMessage ? 'Nachricht bearbeiten' : 'Neue Nachricht'}</DialogTitle>
            <DialogDescription>
              Erreichen Sie Ihre Kunden mit einer gezielten Nachricht
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {/* Empfänger-Auswahl */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-3">
              <Label className="font-semibold">Empfänger auswählen</Label>
              <Select 
                value={messageForm.segment_type}
                onValueChange={(value: Segment['type']) => setMessageForm({ ...messageForm, segment_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEGMENT_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div>
                        <p className="font-medium">{opt.label}</p>
                        <p className="text-xs text-muted-foreground">{opt.description}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {messageForm.segment_type !== 'all' && (
                <div>
                  <Label>Zeitraum (Tage)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={messageForm.segment_value}
                    onChange={(e) => setMessageForm({ ...messageForm, segment_value: parseInt(e.target.value) || 30 })}
                    placeholder="z.B. 30"
                  />
                </div>
              )}

              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-primary" />
                {estimatingRecipients ? (
                  <span className="text-muted-foreground">Berechne...</span>
                ) : estimatedRecipients !== null ? (
                  <span className="font-medium">~{estimatedRecipients} Empfänger</span>
                ) : (
                  <span className="text-muted-foreground">Empfänger werden berechnet</span>
                )}
              </div>
            </div>

            <div>
              <Label>Titel</Label>
              <Input
                value={messageForm.title}
                onChange={(e) => setMessageForm({ ...messageForm, title: e.target.value })}
                placeholder="z.B. Wir vermissen Sie!"
              />
            </div>

            <div>
              <Label>Nachricht</Label>
              <Textarea
                value={messageForm.body}
                onChange={(e) => setMessageForm({ ...messageForm, body: e.target.value })}
                placeholder="Ihre Nachricht an die Kunden..."
                rows={4}
              />
            </div>

            {/* Angebot anhängen */}
            <div className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-semibold">Angebot anhängen</Label>
                  <p className="text-xs text-muted-foreground">Optional: Exklusives Angebot für Empfänger</p>
                </div>
                <Switch
                  checked={messageForm.attach_offer}
                  onCheckedChange={(checked) => setMessageForm({ ...messageForm, attach_offer: checked })}
                />
              </div>

              {messageForm.attach_offer && (
                <div className="space-y-3 pt-2 border-t">
                  <div>
                    <Label>Angebots-Titel</Label>
                    <Input
                      value={messageForm.offer_title}
                      onChange={(e) => setMessageForm({ ...messageForm, offer_title: e.target.value })}
                      placeholder="z.B. 20% Rabatt auf alles"
                    />
                  </div>
                  <div>
                    <Label>Beschreibung (optional)</Label>
                    <Textarea
                      value={messageForm.offer_description}
                      onChange={(e) => setMessageForm({ ...messageForm, offer_description: e.target.value })}
                      placeholder="Details zum Angebot..."
                      rows={2}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <Label>In App dauerhaft anzeigen</Label>
              <Switch
                checked={messageForm.show_in_storefront}
                onCheckedChange={(checked) => setMessageForm({ ...messageForm, show_in_storefront: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMessageDialog(false)}>Abbrechen</Button>
            <Button onClick={handleSaveMessage} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {editingMessage ? 'Speichern' : 'Nachricht senden'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Customer Offer Dialog */}
      <Dialog open={showNewCustomerOfferDialog} onOpenChange={setShowNewCustomerOfferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{newCustomerOffer ? 'Neukundenangebot bearbeiten' : 'Neukundenangebot erstellen'}</DialogTitle>
            <DialogDescription>
              Dieses Angebot sehen nur Kunden, die noch nie bei Ihnen Punkte gesammelt haben
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Titel *</Label>
              <Input
                value={newCustomerOfferForm.title}
                onChange={(e) => setNewCustomerOfferForm({ ...newCustomerOfferForm, title: e.target.value })}
                placeholder="z.B. Gratis Kaffee für Neukunden"
              />
            </div>
            <div>
              <Label>Beschreibung (optional)</Label>
              <Textarea
                value={newCustomerOfferForm.description}
                onChange={(e) => setNewCustomerOfferForm({ ...newCustomerOfferForm, description: e.target.value })}
                placeholder="z.B. Bei Ihrem ersten Besuch erhalten Sie..."
                rows={3}
              />
            </div>
            <div>
              <Label>Bonus-Punkte für Neukunden</Label>
              <Input
                type="number"
                min={0}
                value={newCustomerOfferForm.bonus_stamps}
                onChange={(e) => setNewCustomerOfferForm({ ...newCustomerOfferForm, bonus_stamps: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Optional: Zusätzliche Punkte beim ersten Stempeln
              </p>
            </div>
            <div className="flex items-center justify-between">
              <Label>Angebot aktiv</Label>
              <Switch
                checked={newCustomerOfferForm.is_active}
                onCheckedChange={(checked) => setNewCustomerOfferForm({ ...newCustomerOfferForm, is_active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCustomerOfferDialog(false)}>Abbrechen</Button>
            <Button onClick={handleSaveNewCustomerOffer} disabled={saving}>
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