import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, MessageSquare, Gift, Trash2, Edit2, Send, Users, Clock, UserPlus, Zap, Cake, Save } from 'lucide-react';
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
  const [lastMessageSentAt, setLastMessageSentAt] = useState<Date | null>(null);

  // Automations state
  const [welcomeEnabled, setWelcomeEnabled] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState('Herzlich willkommen in unserem Bonusprogramm! Sammle Stempel und sichere dir tolle Prämien.');
  const [birthdayEnabled, setBirthdayEnabled] = useState(false);
  const [birthdayMessage, setBirthdayMessage] = useState('Alles Gute zum Geburtstag! Als kleines Geschenk schenken wir dir Bonus-Punkte.');
  const [birthdayBonusPoints, setBirthdayBonusPoints] = useState(50);
  const [savingAutomations, setSavingAutomations] = useState(false);

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

      const { data: msgData } = await supabase
        .from('app_messages')
        .select('id, title, body, show_in_storefront, sent_at')
        .eq('merchant_customer_id', assignment.customer_id)
        .order('sent_at', { ascending: false });

      if (msgData) {
        const typedMessages = msgData.map((msg: any) => ({
          id: msg.id,
          title: msg.title,
          body: msg.body,
          show_in_storefront: msg.show_in_storefront,
          sent_at: msg.sent_at,
          segment: { type: 'all' as const },
          offer_id: null,
          is_sent: true,
          recipient_count: 0
        }));
        setMessages(typedMessages);

        // Track last sent date for 7-day cooldown
        if (msgData.length > 0 && msgData[0].sent_at) {
          setLastMessageSentAt(new Date(msgData[0].sent_at));
        }
      }

      const { data: offerData } = await supabase
        .from('offers')
        .select('id, title, description')
        .eq('merchant_customer_id', assignment.customer_id)
        .eq('is_active', true);

      if (offerData) {
        setOffers(offerData);
      }

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

      let offerId: string | null = null;
      if (messageForm.attach_offer && messageForm.offer_title) {
        const { data: offerData, error: offerError } = await supabase
          .from('offers')
          .insert({
            merchant_customer_id: customerId,
            title: messageForm.offer_title,
            description: messageForm.offer_description || null,
            is_active: true,
            show_in_storefront: false
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
            show_in_storefront: messageForm.show_in_storefront
          })
          .eq('id', editingMessage.id);
        if (error) throw error;
        toast.success('Nachricht aktualisiert');
      } else {
        // Fetch all users with loyalty accounts for this merchant
        const { data: loyaltyAccounts, error: laError } = await supabase
          .from('loyalty_accounts')
          .select('user_id')
          .eq('merchant_customer_id', customerId);

        if (laError) throw laError;

        const recipientUserIds = loyaltyAccounts?.map(la => la.user_id) || [];

        if (recipientUserIds.length === 0) {
          toast.error('Keine Kunden gefunden, an die gesendet werden kann');
          setSaving(false);
          return;
        }

        // Insert one message per recipient
        const messagesToInsert = recipientUserIds.map(uid => ({
          merchant_customer_id: customerId,
          user_id: uid,
          title: messageForm.title,
          body: messageForm.body,
          show_in_storefront: messageForm.show_in_storefront,
          sent_at: new Date().toISOString()
        }));

        const { error } = await supabase
          .from('app_messages')
          .insert(messagesToInsert);
        if (error) throw error;
        toast.success(`Nachricht an ${recipientUserIds.length} Kunden gesendet!`);
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto p-6 sm:p-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nachrichten</h1>
          <p className="text-gray-500 mt-1">Erreichen Sie Ihre Kunden gezielt</p>
        </div>

        {/* Nachrichten */}
        <Card className="rounded-2xl shadow-sm border-0 bg-gray-50/80">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900">Nachrichten</CardTitle>
                <CardDescription className="text-gray-500">
                  Senden Sie gezielte Nachrichten an Ihre Kunden
                </CardDescription>
              </div>
            </div>
            <Button onClick={() => { 
              setEditingMessage(null); 
              resetMessageForm();
              setShowMessageDialog(true); 
            }} className="rounded-xl">
              <Plus className="h-4 w-4 mr-2" />
              Neue Nachricht
            </Button>
          </CardHeader>
          <CardContent>
            {messages.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Noch keine Nachrichten gesendet</p>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div key={msg.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">{msg.title}</p>
                        {msg.offer_id && (
                          <Badge variant="outline" className="rounded-full">
                            <Gift className="h-3 w-3 mr-1" />Mit Angebot
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 line-clamp-1">{msg.body}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Badge variant="secondary" className="text-xs rounded-full">
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
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEditMessage(msg)} className="rounded-lg">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteMessage(msg.id)} className="rounded-lg">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Automatisierungen */}
        <Card className="rounded-2xl shadow-sm border-0 bg-gray-50/80">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <Zap className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900">Automatisierungen</CardTitle>
                <CardDescription className="text-gray-500">
                  Automatische Nachrichten an Ihre Kunden
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Willkommensnachricht */}
            <div className={`p-4 rounded-xl border-2 transition-colors ${welcomeEnabled ? 'bg-green-50/50 border-green-200' : 'bg-white border-gray-100'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${welcomeEnabled ? 'bg-green-500' : 'bg-gray-200'}`}>
                    <Gift className={`h-4 w-4 ${welcomeEnabled ? 'text-white' : 'text-gray-500'}`} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Willkommensnachricht</h4>
                    <p className="text-xs text-gray-500">Wird gesendet, wenn ein Kunde zum ersten Mal stempelt</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${welcomeEnabled ? 'text-green-600' : 'text-gray-400'}`}>
                    {welcomeEnabled ? 'Aktiv' : 'Inaktiv'}
                  </span>
                  <Switch
                    checked={welcomeEnabled}
                    onCheckedChange={setWelcomeEnabled}
                    className="scale-125 data-[state=checked]:bg-green-500"
                  />
                </div>
              </div>
              {welcomeEnabled && (
                <div className="mt-3">
                  <Label className="text-xs text-gray-600">Nachricht</Label>
                  <Textarea
                    value={welcomeMessage}
                    onChange={(e) => setWelcomeMessage(e.target.value)}
                    className="mt-1 rounded-xl text-sm"
                    rows={2}
                  />
                </div>
              )}
            </div>

            {/* Geburtstagsgrüße */}
            <div className={`p-4 rounded-xl border-2 transition-colors ${birthdayEnabled ? 'bg-pink-50/50 border-pink-200' : 'bg-white border-gray-100'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${birthdayEnabled ? 'bg-pink-500' : 'bg-gray-200'}`}>
                    <Cake className={`h-4 w-4 ${birthdayEnabled ? 'text-white' : 'text-gray-500'}`} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Geburtstagsgrüße</h4>
                    <p className="text-xs text-gray-500">Wird automatisch am Geburtstag des Kunden gesendet</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${birthdayEnabled ? 'text-pink-600' : 'text-gray-400'}`}>
                    {birthdayEnabled ? 'Aktiv' : 'Inaktiv'}
                  </span>
                  <Switch
                    checked={birthdayEnabled}
                    onCheckedChange={setBirthdayEnabled}
                    className="scale-125 data-[state=checked]:bg-pink-500"
                  />
                </div>
              </div>
              {birthdayEnabled && (
                <div className="mt-3 space-y-3">
                  <div>
                    <Label className="text-xs text-gray-600">Nachricht</Label>
                    <Textarea
                      value={birthdayMessage}
                      onChange={(e) => setBirthdayMessage(e.target.value)}
                      className="mt-1 rounded-xl text-sm"
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Bonuspunkte als Geschenk</Label>
                    <Input
                      type="number"
                      min={0}
                      value={birthdayBonusPoints}
                      onChange={(e) => setBirthdayBonusPoints(parseInt(e.target.value) || 0)}
                      className="mt-1 rounded-xl w-32"
                    />
                  </div>
                </div>
              )}
            </div>

            <Button 
              onClick={() => {
                setSavingAutomations(true);
                setTimeout(() => {
                  setSavingAutomations(false);
                  // Toast would go here when backend is implemented
                }, 500);
              }} 
              disabled={savingAutomations}
              variant="outline"
              className="rounded-xl"
            >
              {savingAutomations ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Automatisierungen speichern
            </Button>
          </CardContent>
        </Card>

        {/* Message Dialog */}
        <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
          <DialogContent className="max-w-lg rounded-2xl">
            <DialogHeader>
              <DialogTitle>{editingMessage ? 'Nachricht bearbeiten' : 'Neue Nachricht'}</DialogTitle>
              <DialogDescription>
                Erreichen Sie Ihre Kunden mit einer gezielten Nachricht
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {/* Empfänger-Auswahl */}
              <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                <Label className="font-semibold text-gray-700">Empfänger auswählen</Label>
                <Select 
                  value={messageForm.segment_type}
                  onValueChange={(value: Segment['type']) => setMessageForm({ ...messageForm, segment_type: value })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEGMENT_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div>
                          <p className="font-medium">{opt.label}</p>
                          <p className="text-xs text-gray-500">{opt.description}</p>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {messageForm.segment_type !== 'all' && (
                  <div>
                    <Label className="text-gray-700">Zeitraum (Tage)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={messageForm.segment_value}
                      onChange={(e) => setMessageForm({ ...messageForm, segment_value: parseInt(e.target.value) || 30 })}
                      placeholder="z.B. 30"
                      className="rounded-xl"
                    />
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-primary" />
                  {estimatingRecipients ? (
                    <span className="text-gray-500">Berechne...</span>
                  ) : estimatedRecipients !== null ? (
                    <span className="font-semibold text-gray-900">~{estimatedRecipients} Empfänger</span>
                  ) : (
                    <span className="text-gray-500">Empfänger werden berechnet</span>
                  )}
                </div>
              </div>

              <div>
                <Label className="text-gray-700">Titel</Label>
                <Input
                  value={messageForm.title}
                  onChange={(e) => setMessageForm({ ...messageForm, title: e.target.value })}
                  placeholder="z.B. Wir vermissen Sie!"
                  className="rounded-xl mt-1"
                />
              </div>

              <div>
                <Label className="text-gray-700">Nachricht</Label>
                <Textarea
                  value={messageForm.body}
                  onChange={(e) => setMessageForm({ ...messageForm, body: e.target.value })}
                  placeholder="Ihre Nachricht an die Kunden..."
                  rows={4}
                  className="rounded-xl mt-1"
                />
              </div>

              {/* Angebot anhängen */}
              <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-semibold text-gray-700">Angebot anhängen</Label>
                    <p className="text-xs text-gray-500">Optional: Exklusives Angebot für Empfänger</p>
                  </div>
                  <Switch
                    checked={messageForm.attach_offer}
                    onCheckedChange={(checked) => setMessageForm({ ...messageForm, attach_offer: checked })}
                  />
                </div>

                {messageForm.attach_offer && (
                  <div className="space-y-3 pt-3 border-t border-gray-200">
                    <div>
                      <Label className="text-gray-700">Angebots-Titel</Label>
                      <Input
                        value={messageForm.offer_title}
                        onChange={(e) => setMessageForm({ ...messageForm, offer_title: e.target.value })}
                        placeholder="z.B. 20% Rabatt auf alles"
                        className="rounded-xl mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-700">Beschreibung (optional)</Label>
                      <Textarea
                        value={messageForm.offer_description}
                        onChange={(e) => setMessageForm({ ...messageForm, offer_description: e.target.value })}
                        placeholder="Details zum Angebot..."
                        rows={2}
                        className="rounded-xl mt-1"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <Label className="text-gray-700">In App dauerhaft anzeigen</Label>
                <Switch
                  checked={messageForm.show_in_storefront}
                  onCheckedChange={(checked) => setMessageForm({ ...messageForm, show_in_storefront: checked })}
                />
              </div>
            </div>
            {(() => {
              const COOLDOWN_DAYS = 7;
              const cooldownActive = !editingMessage && lastMessageSentAt && 
                (Date.now() - lastMessageSentAt.getTime()) < COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
              const daysRemaining = cooldownActive && lastMessageSentAt
                ? Math.ceil((COOLDOWN_DAYS * 24 * 60 * 60 * 1000 - (Date.now() - lastMessageSentAt.getTime())) / (24 * 60 * 60 * 1000))
                : 0;

              return (
                <DialogFooter className="flex-col gap-2">
                  {cooldownActive && (
                    <p className="text-sm text-destructive w-full text-center">
                      ⏳ Spamschutz: Nächste Nachricht in {daysRemaining} {daysRemaining === 1 ? 'Tag' : 'Tagen'} möglich
                    </p>
                  )}
                  <div className="flex gap-2 w-full justify-end">
                    <Button variant="outline" onClick={() => setShowMessageDialog(false)} className="rounded-xl">Abbrechen</Button>
                    <Button onClick={handleSaveMessage} disabled={saving || !!cooldownActive} className="rounded-xl">
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      {editingMessage ? 'Speichern' : 'Nachricht senden'}
                    </Button>
                  </div>
                </DialogFooter>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* New Customer Offer Dialog */}
        <Dialog open={showNewCustomerOfferDialog} onOpenChange={setShowNewCustomerOfferDialog}>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>{newCustomerOffer ? 'Neukundenangebot bearbeiten' : 'Neukundenangebot erstellen'}</DialogTitle>
              <DialogDescription>
                Dieses Angebot sehen nur Kunden, die noch nie bei Ihnen Punkte gesammelt haben
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-gray-700">Titel *</Label>
                <Input
                  value={newCustomerOfferForm.title}
                  onChange={(e) => setNewCustomerOfferForm({ ...newCustomerOfferForm, title: e.target.value })}
                  placeholder="z.B. Gratis Kaffee für Neukunden"
                  className="rounded-xl mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-700">Beschreibung (optional)</Label>
                <Textarea
                  value={newCustomerOfferForm.description}
                  onChange={(e) => setNewCustomerOfferForm({ ...newCustomerOfferForm, description: e.target.value })}
                  placeholder="z.B. Bei Ihrem ersten Besuch erhalten Sie..."
                  rows={3}
                  className="rounded-xl mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-700">Bonus-Punkte für Neukunden</Label>
                <Input
                  type="number"
                  min={0}
                  value={newCustomerOfferForm.bonus_stamps}
                  onChange={(e) => setNewCustomerOfferForm({ ...newCustomerOfferForm, bonus_stamps: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                  className="rounded-xl mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Optional: Zusätzliche Punkte beim ersten Stempeln
                </p>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <Label className="text-gray-700">Angebot aktiv</Label>
                <Switch
                  checked={newCustomerOfferForm.is_active}
                  onCheckedChange={(checked) => setNewCustomerOfferForm({ ...newCustomerOfferForm, is_active: checked })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewCustomerOfferDialog(false)} className="rounded-xl">Abbrechen</Button>
              <Button onClick={handleSaveNewCustomerOffer} disabled={saving} className="rounded-xl">
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Speichern
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Nachrichten;