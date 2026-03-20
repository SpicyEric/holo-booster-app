import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2, Plus, MessageSquare, Gift, Send, Users, Clock, UserPlus, Zap, Cake, Save, 
  ChevronDown, Rocket, CheckCircle2, Timer, Star, ExternalLink, Copy, Bot, Megaphone,
  Edit2, Trash2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// ---- Types ----
interface Segment { type: 'all' | 'last_stamped_days' | 'not_stamped_days'; value?: number; }
interface Message { id: string; title: string; body: string; show_in_storefront: boolean | null; sent_at: string | null; segment: Segment; offer_id: string | null; is_sent: boolean | null; recipient_count: number | null; }
interface Offer { id: string; title: string; description: string | null; }
interface NewCustomerOffer { id: string; title: string; description: string | null; bonus_stamps: number | null; is_active: boolean | null; image_url: string | null; }
interface Reward { id: string; title: string; description: string | null; points_required: number; image_url: string | null; is_active: boolean | null; }

const SEGMENT_OPTIONS = [
  { value: 'all', label: 'Alle Kunden', description: 'Alle, die bei Ihnen schon mal Punkte gesammelt haben' },
  { value: 'last_stamped_days', label: 'Kürzlich gestempelt', description: 'Kunden die innerhalb der letzten X Tage gestempelt haben' },
  { value: 'not_stamped_days', label: 'Lange nicht gestempelt', description: 'Kunden die seit X Tagen nicht mehr gestempelt haben' },
];

const Marketing = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('praemien');

  // --- Rewards state ---
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [showRewardDialog, setShowRewardDialog] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [rewardForm, setRewardForm] = useState({ title: '', description: '', points_required: 10, image_url: '' });
  const [uploadingRewardImage, setUploadingRewardImage] = useState(false);
  const [newCustomerOffer, setNewCustomerOffer] = useState<NewCustomerOffer | null>(null);
  const [showNcoDialog, setShowNcoDialog] = useState(false);
  const [ncoForm, setNcoForm] = useState({ title: '', description: '', bonus_stamps: 0, is_active: true, image_url: '' });
  const [uploadingNcoImage, setUploadingNcoImage] = useState(false);

  // --- Boost state ---
  const [boostLoading, setBoostLoading] = useState(false);
  const [activeBoost, setActiveBoost] = useState<any>(null);

  // --- Google Reviews state ---
  const [googleReviewUrl, setGoogleReviewUrl] = useState("");
  const [savingReview, setSavingReview] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reviewPointsEnabled, setReviewPointsEnabled] = useState(false);
  const [reviewPointsValue, setReviewPointsValue] = useState(5);
  const [savingReviewPoints, setSavingReviewPoints] = useState(false);

  // --- Messages state ---
  const [messages, setMessages] = useState<Message[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showAllMessages, setShowAllMessages] = useState(false);
  const [saving, setSaving] = useState(false);
  const [estimatingRecipients, setEstimatingRecipients] = useState(false);
  const [estimatedRecipients, setEstimatedRecipients] = useState<number | null>(null);
  const [messageForm, setMessageForm] = useState({ title: '', body: '', segment_type: 'all' as Segment['type'], segment_value: 30, attach_offer: false, offer_title: '', offer_description: '' });

  // --- Automations state ---
  const [birthdayEnabled, setBirthdayEnabled] = useState(false);
  const [birthdayMessage, setBirthdayMessage] = useState('Alles Gute zum Geburtstag! Als kleines Geschenk schenken wir dir etwas Besonderes.');
  const [birthdayBonusPoints, setBirthdayBonusPoints] = useState(5);
  const [birthdayGiftType, setBirthdayGiftType] = useState<'points' | 'offer'>('points');
  const [birthdayOfferTitle, setBirthdayOfferTitle] = useState('');
  const [birthdayOfferDescription, setBirthdayOfferDescription] = useState('');
  const [savingAutomations, setSavingAutomations] = useState(false);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const boostStatus = searchParams.get('boost');
    const boostId = searchParams.get('boost_id');
    if (boostStatus === 'success' && boostId) activateBoost(boostId);
  }, [searchParams]);

  useEffect(() => {
    if (showMessageDialog && customerId) {
      const timer = setTimeout(() => estimateRecipients(), 500);
      return () => clearTimeout(timer);
    }
  }, [messageForm.segment_type, messageForm.segment_value, showMessageDialog]);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: assignment } = await supabase.from('merchant_assignments').select('customer_id').eq('merchant_user_id', user.id).maybeSingle();
      if (!assignment) { setLoading(false); return; }
      setCustomerId(assignment.customer_id);

      // Load customer data (google reviews + automations)
      const { data: cd } = await supabase.from('customers').select('google_review_url, google_review_points_enabled, google_review_points_value, birthday_enabled, birthday_message, birthday_bonus_points, birthday_gift_type, birthday_offer_title, birthday_offer_description').eq('id', assignment.customer_id).maybeSingle();
      if (cd) {
        setGoogleReviewUrl(cd.google_review_url || "");
        setReviewPointsEnabled(cd.google_review_points_enabled || false);
        setReviewPointsValue(cd.google_review_points_value || 5);
        setBirthdayEnabled(cd.birthday_enabled ?? false);
        if (cd.birthday_message) setBirthdayMessage(cd.birthday_message);
        setBirthdayBonusPoints((cd as any).birthday_bonus_points ?? 5);
        setBirthdayGiftType(((cd as any).birthday_gift_type as 'points' | 'offer') || 'points');
        setBirthdayOfferTitle((cd as any).birthday_offer_title || '');
        setBirthdayOfferDescription((cd as any).birthday_offer_description || '');
      }

      // Rewards
      const { data: rewardsData } = await supabase.from('rewards').select('*').eq('merchant_customer_id', assignment.customer_id).order('points_required', { ascending: true });
      if (rewardsData) setRewards(rewardsData);

      // New customer offer
      const { data: ncoData } = await supabase.from('new_customer_offers').select('*').eq('merchant_customer_id', assignment.customer_id).maybeSingle();
      setNewCustomerOffer(ncoData);
      if (ncoData) setNcoForm({ title: ncoData.title, description: ncoData.description || '', bonus_stamps: ncoData.bonus_stamps || 0, is_active: ncoData.is_active ?? true, image_url: ncoData.image_url || '' });

      // Messages
      const { data: msgData } = await supabase.from('app_messages').select('id, title, body, show_in_storefront, sent_at, offer_id').eq('merchant_customer_id', assignment.customer_id).order('sent_at', { ascending: false });
      if (msgData) {
        const seen = new Map<string, any>();
        for (const msg of msgData) { const key = `${msg.title}||${msg.body}||${msg.sent_at}`; if (!seen.has(key)) seen.set(key, { ...msg, recipient_count: 1 }); else seen.get(key)!.recipient_count++; }
        setMessages(Array.from(seen.values()).map((m: any) => ({ id: m.id, title: m.title, body: m.body, show_in_storefront: m.show_in_storefront, sent_at: m.sent_at, segment: { type: 'all' as const }, offer_id: m.offer_id, is_sent: true, recipient_count: m.recipient_count })));
      }

      const { data: offerData } = await supabase.from('offers').select('id, title, description').eq('merchant_customer_id', assignment.customer_id).eq('is_active', true);
      if (offerData) setOffers(offerData);

      // Boosts
      const { data: boosts } = await supabase.from('merchant_boosts').select('*').eq('merchant_customer_id', assignment.customer_id).order('created_at', { ascending: false });
      if (boosts) { const active = boosts.find(b => b.status === 'active' && new Date(b.ends_at) > new Date()); setActiveBoost(active || null); }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const activateBoost = async (boostId: string) => {
    try { const { error } = await supabase.functions.invoke('activate-boost', { body: { boost_id: boostId } }); if (error) throw error; toast.success('Neukunden-Boost erfolgreich aktiviert! 🚀'); loadData(); } catch { toast.error('Fehler bei der Boost-Aktivierung'); }
  };

  const handleBoostPurchase = async (tier: string) => {
    setBoostLoading(true);
    try { const { data, error } = await supabase.functions.invoke('create-boost-checkout', { body: { tier } }); if (error) throw error; if (data?.url) window.location.href = data.url; } catch { toast.error('Fehler beim Erstellen der Bezahlung'); } finally { setBoostLoading(false); }
  };

  const handleSaveReviewPoints = async () => {
    if (!customerId) return;
    setSavingReviewPoints(true);
    try {
      const { error } = await supabase.from("customers").update({
        google_review_points_enabled: reviewPointsEnabled,
        google_review_points_value: reviewPointsValue,
        google_review_url: googleReviewUrl,
        updated_at: new Date().toISOString()
      }).eq("id", customerId);
      if (error) throw error;
      toast.success("Gespeichert!");
    } catch { toast.error("Fehler"); } finally { setSavingReviewPoints(false); }
  };

  const copyToClipboard = () => { if (googleReviewUrl) { navigator.clipboard.writeText(googleReviewUrl); setCopied(true); toast.success("Link kopiert!"); setTimeout(() => setCopied(false), 2000); } };

  const estimateRecipients = async () => {
    if (!customerId) return;
    setEstimatingRecipients(true);
    try {
      let query = supabase.from('loyalty_accounts').select('id', { count: 'exact', head: true }).eq('merchant_customer_id', customerId);
      if (messageForm.segment_type === 'last_stamped_days') { const c = new Date(); c.setDate(c.getDate() - messageForm.segment_value); query = query.gte('updated_at', c.toISOString()); }
      else if (messageForm.segment_type === 'not_stamped_days') { const c = new Date(); c.setDate(c.getDate() - messageForm.segment_value); query = query.lt('updated_at', c.toISOString()); }
      const { count } = await query;
      setEstimatedRecipients(count || 0);
    } catch { setEstimatedRecipients(null); } finally { setEstimatingRecipients(false); }
  };

  const resetMessageForm = () => { setMessageForm({ title: '', body: '', segment_type: 'all', segment_value: 30, attach_offer: false, offer_title: '', offer_description: '' }); setEstimatedRecipients(null); };

  const handleSendMessage = async () => {
    if (!customerId || !messageForm.title || !messageForm.body) { toast.error('Bitte füllen Sie alle Felder aus'); return; }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      let offerId: string | null = null;
      if (messageForm.attach_offer && messageForm.offer_title) {
        const validUntil = new Date(); validUntil.setDate(validUntil.getDate() + 7);
        const { data: od, error: oe } = await supabase.from('offers').insert({ merchant_customer_id: customerId, title: messageForm.offer_title, description: messageForm.offer_description || null, is_active: true, show_in_storefront: false, valid_until: validUntil.toISOString() }).select('id').single();
        if (oe) throw oe; offerId = od.id;
      }
      let query = supabase.from('loyalty_accounts').select('user_id').eq('merchant_customer_id', customerId);
      if (messageForm.segment_type === 'last_stamped_days') { const c = new Date(); c.setDate(c.getDate()-messageForm.segment_value); query = query.gte('updated_at', c.toISOString()); }
      else if (messageForm.segment_type === 'not_stamped_days') { const c = new Date(); c.setDate(c.getDate()-messageForm.segment_value); query = query.lt('updated_at', c.toISOString()); }
      const { data: la } = await query;
      const uids = la?.map(l => l.user_id) || [];
      if (uids.length === 0) { toast.error('Keine Kunden gefunden'); setSaving(false); return; }
      const msgs = uids.map(uid => ({ merchant_customer_id: customerId, user_id: uid, title: messageForm.title, body: messageForm.body, offer_id: offerId, sent_at: new Date().toISOString() } as any));
      const { error } = await supabase.from('app_messages').insert(msgs);
      if (error) throw error;
      toast.success(`Nachricht an ${uids.length} Kunden gesendet!`);
      setShowConfirmDialog(false); setShowMessageDialog(false); resetMessageForm(); loadData();
    } catch { toast.error('Fehler beim Senden'); } finally { setSaving(false); }
  };

  const handleSaveAutomations = async () => {
    if (!customerId) return;
    setSavingAutomations(true);
    try {
      const { error } = await supabase.from('customers').update({ birthday_enabled: birthdayEnabled, birthday_message: birthdayMessage, birthday_bonus_points: birthdayBonusPoints, birthday_gift_type: birthdayGiftType, birthday_offer_title: birthdayOfferTitle || null, birthday_offer_description: birthdayOfferDescription || null } as any).eq('id', customerId);
      if (error) throw error; toast.success('Gespeichert');
    } catch { toast.error('Fehler'); } finally { setSavingAutomations(false); }
  };

  // --- Rewards handlers ---
  const handleRewardImageUpload = async (file: File) => {
    if (!customerId) return;
    setUploadingRewardImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${customerId}/reward_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("customer-assets").upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("customer-assets").getPublicUrl(fileName);
      setRewardForm(prev => ({ ...prev, image_url: publicUrl }));
      toast.success("Bild hochgeladen");
    } catch { toast.error("Fehler beim Hochladen"); } finally { setUploadingRewardImage(false); }
  };

  const handleSaveReward = async () => {
    if (!customerId || !rewardForm.title) { toast.error("Bitte Titel eingeben"); return; }
    setSaving(true);
    try {
      if (editingReward) {
        const { error } = await supabase.from("rewards").update({ title: rewardForm.title, description: rewardForm.description || null, points_required: rewardForm.points_required, image_url: rewardForm.image_url || null }).eq("id", editingReward.id);
        if (error) throw error;
        toast.success("Prämie aktualisiert");
      } else {
        const { error } = await supabase.from("rewards").insert({ merchant_customer_id: customerId, title: rewardForm.title, description: rewardForm.description || null, points_required: rewardForm.points_required, image_url: rewardForm.image_url || null, is_active: true });
        if (error) throw error;
        toast.success("Prämie erstellt");
      }
      setShowRewardDialog(false); setEditingReward(null); setRewardForm({ title: '', description: '', points_required: 10, image_url: '' }); loadData();
    } catch { toast.error("Fehler beim Speichern"); } finally { setSaving(false); }
  };

  const handleDeleteReward = async (id: string) => {
    try { const { error } = await supabase.from("rewards").delete().eq("id", id); if (error) throw error; toast.success("Prämie gelöscht"); loadData(); } catch { toast.error("Fehler beim Löschen"); }
  };

  const handleSaveNco = async () => {
    if (!customerId || !ncoForm.title) { toast.error("Bitte Titel eingeben"); return; }
    setSaving(true);
    try {
      if (newCustomerOffer) {
        const { error } = await supabase.from("new_customer_offers").update({ title: ncoForm.title, description: ncoForm.description || null, bonus_stamps: ncoForm.bonus_stamps, is_active: ncoForm.is_active, image_url: ncoForm.image_url || null }).eq("id", newCustomerOffer.id);
        if (error) throw error; toast.success("Neukundenprämie aktualisiert");
      } else {
        const { error } = await supabase.from("new_customer_offers").insert({ merchant_customer_id: customerId, title: ncoForm.title, description: ncoForm.description || null, bonus_stamps: ncoForm.bonus_stamps, is_active: ncoForm.is_active, image_url: ncoForm.image_url || null });
        if (error) throw error; toast.success("Neukundenprämie erstellt");
      }
      setShowNcoDialog(false); loadData();
    } catch { toast.error("Fehler beim Speichern"); } finally { setSaving(false); }
  };

  const handleDeleteNco = async () => {
    if (!newCustomerOffer) return;
    try { const { error } = await supabase.from("new_customer_offers").delete().eq("id", newCustomerOffer.id); if (error) throw error; toast.success("Neukundenprämie gelöscht"); setNewCustomerOffer(null); setNcoForm({ title: '', description: '', bonus_stamps: 0, is_active: true, image_url: '' }); } catch { toast.error("Fehler beim Löschen"); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Megaphone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Marketing</h1>
              <p className="text-muted-foreground text-sm">Gewinne neue Kunden, steigere deine Sichtbarkeit und aktiviere Stammkunden</p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="inline-flex flex-wrap gap-2 bg-transparent p-0">
            {[
              { value: "praemien", label: "Prämien", icon: Gift },
              { value: "boost", label: "Neukunden", icon: Rocket },
              { value: "reviews", label: "Bewertungen", icon: Star },
              { value: "messages", label: "Nachrichten", icon: MessageSquare },
              { value: "automations", label: "Automationen", icon: Zap },
            ].map(tab => (
              <TabsTrigger key={tab.value} value={tab.value} className="rounded-full px-4 py-2 text-xs sm:text-sm font-medium border border-border/50 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:border-primary data-[state=active]:shadow-sm data-[state=inactive]:bg-white data-[state=inactive]:text-muted-foreground hover:bg-primary/5 transition-all duration-200">
                <tab.icon className="w-4 h-4 mr-1.5 hidden sm:inline" />{tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ========== PRÄMIEN TAB ========== */}
          <TabsContent value="praemien" className="space-y-6 mt-6">
            <Card className="rounded-2xl shadow-sm border border-primary/10 bg-primary/[0.03]">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Gift className="h-5 w-5 text-primary" /></div>
                  <div>
                    <CardTitle className="text-lg font-semibold">Prämien</CardTitle>
                    <CardDescription>Belohnungen, die deine Kunden mit gesammelten Punkten einlösen können</CardDescription>
                  </div>
                </div>
                <Button onClick={() => { setEditingReward(null); setRewardForm({ title: '', description: '', points_required: 10, image_url: '' }); setShowRewardDialog(true); }} className="rounded-xl">
                  <Plus className="h-4 w-4 mr-2" />Neue Prämie
                </Button>
              </CardHeader>
              <CardContent>
                {rewards.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Noch keine Prämien erstellt</p>
                ) : (
                  <div className="space-y-3">
                    {rewards.map((reward) => (
                      <div key={reward.id} className="flex items-center justify-between p-4 bg-card rounded-xl border border-border/30">
                        <div className="flex items-center gap-3">
                          {reward.image_url ? (
                            <img src={reward.image_url} alt={reward.title} className="w-12 h-12 rounded-xl object-cover" />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Gift className="h-6 w-6 text-primary" /></div>
                          )}
                          <div>
                            <p className="font-semibold text-foreground">{reward.title}</p>
                            {reward.description && <p className="text-sm text-muted-foreground">{reward.description}</p>}
                            <Badge variant="secondary" className="rounded-full mt-1">{reward.points_required} Punkte</Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => { setEditingReward(reward); setRewardForm({ title: reward.title, description: reward.description || '', points_required: reward.points_required, image_url: reward.image_url || '' }); setShowRewardDialog(true); }} className="rounded-lg"><Edit2 className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteReward(reward.id)} className="rounded-lg"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========== NEUKUNDEN TAB ========== */}
          <TabsContent value="boost" className="space-y-6 mt-6">
            {/* Neukundenprämie */}
            <Card className="rounded-2xl shadow-sm border border-primary/10 bg-primary/[0.03]">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><UserPlus className="h-5 w-5 text-primary" /></div>
                  <div>
                    <CardTitle className="text-lg font-semibold">Neukundenprämie</CardTitle>
                    <CardDescription>Gewinne neue Kunden mit einem attraktiven Willkommensangebot</CardDescription>
                  </div>
                </div>
                <Button variant={newCustomerOffer ? "outline" : "default"} onClick={() => setShowNcoDialog(true)} className="rounded-xl">
                  {newCustomerOffer ? <><Edit2 className="h-4 w-4 mr-2" />Bearbeiten</> : <><Plus className="h-4 w-4 mr-2" />Erstellen</>}
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 text-sm text-muted-foreground space-y-2">
                  <p className="font-medium text-foreground">💡 Was ist die Neukundenprämie?</p>
                  <p>Die Neukundenprämie wird nur Kunden angezeigt, die bei dir <strong>noch keine Punkte gesammelt haben</strong>. Sobald ein Kunde seine ersten Punkte bei dir sammelt, verschwindet das Angebot automatisch.</p>
                  <p>Das macht sie perfekt für zwei Dinge:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Andere eloyo-Nutzer ins Geschäft holen</strong> – dein Angebot erscheint bei Nutzern in deiner Umgebung, die dich noch nicht kennen.</li>
                    <li><strong>Bestehende Laufkundschaft digital aktivieren</strong> – biete deinen Stammkunden einen Grund, sich die App herunterzuladen und beim nächsten Besuch direkt einzulösen.</li>
                  </ul>
                </div>
                {newCustomerOffer ? (
                  <div className="flex items-center justify-between p-4 bg-card rounded-xl border border-border/30">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-foreground">{newCustomerOffer.title}</p>
                        <Badge variant={newCustomerOffer.is_active ? "default" : "secondary"} className="rounded-full">{newCustomerOffer.is_active ? 'Aktiv' : 'Inaktiv'}</Badge>
                      </div>
                      {newCustomerOffer.description && <p className="text-sm text-muted-foreground">{newCustomerOffer.description}</p>}
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleDeleteNco} className="rounded-lg"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">Noch keine Neukundenprämie erstellt</p>
                )}
              </CardContent>
            </Card>

            {/* Neukunden-Boost */}
            <Card className="rounded-2xl shadow-sm border border-primary/10 bg-primary/[0.03]">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Rocket className="h-5 w-5 text-primary" /></div>
                  <div>
                    <CardTitle className="text-lg font-semibold">Neukunden-Boost</CardTitle>
                    <CardDescription>Dein Geschäft wird allen App-Nutzern in deiner Umgebung ganz oben im Feed angezeigt</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {activeBoost ? (
                  <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                    <div className="flex items-center gap-2 mb-2"><CheckCircle2 className="h-5 w-5 text-green-500" /><span className="font-semibold text-green-700">Boost aktiv</span></div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground"><Timer className="h-4 w-4" /><span>Läuft noch bis {new Date(activeBoost.ends_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></div>
                    <p className="text-sm text-muted-foreground mt-2">Dein Geschäft wird im Umkreis von 15 km allen App-Nutzern ganz oben im Feed angezeigt.</p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">Pushe dein Geschäft im Feed! Alle Nutzer im Umkreis sehen deinen Eintrag ganz oben – mit einer hervorgehobenen Anzeige und dem Label „Gesponsert".</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { tier: '3_days', days: 3, price: '9,90 €', label: '3 Tage', radius: '10 km', borderClass: 'border-sky-300 hover:border-sky-400' },
                        { tier: '7_days', days: 7, price: '19,90 €', label: '7 Tage', radius: '10 km', borderClass: 'border-primary/50 hover:border-primary', popular: true },
                        { tier: '14_days', days: 14, price: '35,90 €', label: '14 Tage', radius: '15 km', borderClass: 'border-amber-400 hover:border-amber-500', best: true },
                      ].map(opt => (
                        <div key={opt.tier} className={`relative p-4 rounded-xl border-2 transition-all bg-card ${opt.borderClass}`}>
                          {opt.popular && <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-white text-xs rounded-full">Beliebt</Badge>}
                          {opt.best && <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-xs rounded-full">Beste Reichweite</Badge>}
                          <div className="text-center space-y-2">
                            <p className="text-2xl font-bold text-foreground">{opt.price}</p>
                            <p className="text-sm font-medium text-muted-foreground">{opt.label}</p>
                            <p className="text-xs text-muted-foreground/70">{opt.radius} Radius</p>
                            <Button onClick={() => handleBoostPurchase(opt.tier)} disabled={boostLoading} className="w-full rounded-xl mt-2">
                              {boostLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Jetzt buchen'}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========== BEWERTUNGEN TAB ========== */}
          <TabsContent value="reviews" className="space-y-6 mt-6">
            <Card className="rounded-2xl shadow-sm border border-primary/10 bg-primary/[0.03]">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center"><Star className="w-6 h-6 text-amber-600 fill-amber-500" /></div>
                  <div>
                    <CardTitle className="text-lg font-semibold">Bewertungs-Bonus</CardTitle>
                    <CardDescription>Belohne Kunden mit Bonuspunkten für eine Google-Bewertung – mehr Bewertungen = mehr Sichtbarkeit</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-card rounded-xl border border-border/30">
                  <div><p className="font-medium text-foreground">Bewertungs-Bonus aktivieren</p><p className="text-sm text-muted-foreground">Kunden erhalten Punkte nach einer Google-Bewertung</p></div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${reviewPointsEnabled ? 'text-primary' : 'text-muted-foreground'}`}>{reviewPointsEnabled ? 'Aktiv' : 'Inaktiv'}</span>
                    <Switch checked={reviewPointsEnabled} onCheckedChange={setReviewPointsEnabled} />
                  </div>
                </div>
                {reviewPointsEnabled && (
                  <>
                    <div className="p-4 bg-card rounded-xl border border-border/30 space-y-3">
                      <Label className="font-medium">Google-Bewertungslink</Label>
                      <p className="text-sm text-muted-foreground">Wird nach dem Stempeln angezeigt, damit Kunden dich direkt bei Google bewerten können.</p>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Star className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
                          <Input value={googleReviewUrl} onChange={(e) => setGoogleReviewUrl(e.target.value)} placeholder="https://g.page/r/..." className="pl-10 rounded-xl" />
                        </div>
                        <Button variant="outline" size="icon" onClick={copyToClipboard} disabled={!googleReviewUrl} className="rounded-xl">
                          {copied ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                      {googleReviewUrl && (
                        <Button variant="outline" size="sm" onClick={() => window.open(googleReviewUrl, '_blank')} className="rounded-xl">
                          <ExternalLink className="w-4 h-4 mr-2" />Link testen
                        </Button>
                      )}
                    </div>
                    <div className="p-4 bg-card rounded-xl border border-border/30 space-y-3">
                      <Label className="font-medium">Punkte pro Bewertung</Label>
                      <div className="flex items-center gap-4">
                        <Slider value={[reviewPointsValue]} onValueChange={v => setReviewPointsValue(v[0])} min={1} max={20} step={1} className="flex-1" />
                        <span className="text-lg font-bold text-primary min-w-[3rem] text-center">{reviewPointsValue}</span>
                      </div>
                    </div>
                  </>
                )}
                <Button onClick={handleSaveReviewPoints} disabled={savingReviewPoints} className="rounded-xl">
                  {savingReviewPoints ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Speichern...</> : "Einstellungen speichern"}
                </Button>
              </CardContent>
            </Card>

            {/* Auto Reply removed - now in Automationen tab */}
          </TabsContent>

          {/* ========== NACHRICHTEN TAB ========== */}
          <TabsContent value="messages" className="space-y-6 mt-6">
            <Card className="rounded-2xl shadow-sm border border-border/50 bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center"><MessageSquare className="h-5 w-5 text-blue-600" /></div>
                  <div>
                    <CardTitle className="text-lg font-semibold">Nachrichten an Kunden</CardTitle>
                    <CardDescription>Sende gezielte Nachrichten an deine Kunden</CardDescription>
                  </div>
                </div>
                <Button onClick={() => { resetMessageForm(); setShowMessageDialog(true); }} className="rounded-xl"><Plus className="h-4 w-4 mr-2" />Neue Nachricht</Button>
              </CardHeader>
              <CardContent>
                {messages.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Noch keine Nachrichten gesendet</p>
                ) : (
                  <div className="space-y-3">
                    {(showAllMessages ? messages : messages.slice(0, 5)).map(msg => (
                      <div key={msg.id} className="p-4 bg-muted/30 rounded-xl border border-border/30">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-foreground">{msg.title}</p>
                            {msg.offer_id && <Badge variant="outline" className="rounded-full"><Gift className="h-3 w-3 mr-1" />Mit Angebot</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-1">{msg.body}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {msg.recipient_count !== null && msg.recipient_count > 0 && <Badge variant="secondary" className="text-xs rounded-full"><Users className="h-3 w-3 mr-1" />{msg.recipient_count} Empfänger</Badge>}
                            {msg.sent_at && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(msg.sent_at).toLocaleDateString('de-DE')}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                    {messages.length > 5 && !showAllMessages && (
                      <Button variant="ghost" className="w-full rounded-xl text-primary" onClick={() => setShowAllMessages(true)}><ChevronDown className="h-4 w-4 mr-2" />Alle {messages.length} Nachrichten anzeigen</Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========== AUTOMATIONEN TAB ========== */}
          <TabsContent value="automations" className="space-y-6 mt-6">
            <Card className="rounded-2xl shadow-sm border border-border/50 bg-card">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center"><Zap className="h-5 w-5 text-purple-600" /></div>
                  <div>
                    <CardTitle className="text-lg font-semibold">Automatisierungen</CardTitle>
                    <CardDescription>Automatische Nachrichten und Geschenke an deine Kunden</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className={`p-4 rounded-xl border-2 transition-colors ${birthdayEnabled ? 'bg-pink-50/50 border-pink-200' : 'bg-muted/20 border-border/50'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${birthdayEnabled ? 'bg-pink-500' : 'bg-muted'}`}>
                        <Cake className={`h-4 w-4 ${birthdayEnabled ? 'text-white' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">Geburtstagsgrüße</h4>
                        <p className="text-xs text-muted-foreground">Wird automatisch am Geburtstag gesendet</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${birthdayEnabled ? 'text-pink-600' : 'text-muted-foreground'}`}>{birthdayEnabled ? 'Aktiv' : 'Inaktiv'}</span>
                      <Switch checked={birthdayEnabled} onCheckedChange={setBirthdayEnabled} />
                    </div>
                  </div>
                  {birthdayEnabled && (
                    <div className="mt-3 space-y-4">
                      <div><Label className="text-xs text-muted-foreground">Nachricht</Label><Textarea value={birthdayMessage} onChange={(e) => setBirthdayMessage(e.target.value)} className="mt-1 rounded-xl text-sm" rows={2} /></div>
                      <div className="space-y-3">
                        <Label className="text-xs text-muted-foreground font-semibold">Geschenk-Typ</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <button type="button" onClick={() => setBirthdayGiftType('points')} className={`p-3 rounded-xl border-2 text-left transition-all ${birthdayGiftType === 'points' ? 'border-pink-400 bg-pink-50 ring-1 ring-pink-200' : 'border-border bg-card hover:border-muted-foreground/30'}`}>
                            <div className="font-semibold text-sm">🎁 Bonuspunkte</div><p className="text-xs text-muted-foreground mt-1">Punkte als Geschenk</p>
                          </button>
                          <button type="button" onClick={() => setBirthdayGiftType('offer')} className={`p-3 rounded-xl border-2 text-left transition-all ${birthdayGiftType === 'offer' ? 'border-pink-400 bg-pink-50 ring-1 ring-pink-200' : 'border-border bg-card hover:border-muted-foreground/30'}`}>
                            <div className="font-semibold text-sm">🎉 Angebot</div><p className="text-xs text-muted-foreground mt-1">Angebot als Geschenk</p>
                          </button>
                        </div>
                      </div>
                      {birthdayGiftType === 'points' ? (
                        <div><Label className="text-xs text-muted-foreground">Bonuspunkte</Label><Input type="number" min={1} value={birthdayBonusPoints} onChange={e=>setBirthdayBonusPoints(parseInt(e.target.value)||5)} className="mt-1 rounded-xl w-32" /></div>
                      ) : (
                        <div className="space-y-3 p-3 bg-pink-50/50 rounded-xl border border-pink-100">
                          <div><Label className="text-xs">Angebotstitel</Label><Input value={birthdayOfferTitle} onChange={e=>setBirthdayOfferTitle(e.target.value)} placeholder="z.B. Frühstück zum halben Preis" className="mt-1 rounded-xl text-sm" /></div>
                          <div><Label className="text-xs">Beschreibung</Label><Textarea value={birthdayOfferDescription} onChange={e=>setBirthdayOfferDescription(e.target.value)} placeholder="Details..." rows={2} className="mt-1 rounded-xl text-sm" /></div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <Button onClick={handleSaveAutomations} disabled={savingAutomations || !customerId} variant="outline" className="rounded-xl">
                  {savingAutomations ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}Automatisierungen speichern
                </Button>
              </CardContent>
            </Card>

            {/* Auto Reply - Coming Soon */}
            <Card className="rounded-2xl shadow-sm border border-border/50 bg-card relative overflow-hidden opacity-50 pointer-events-none">
              <div className="absolute top-3 right-3 z-10 bg-primary text-white text-xs font-semibold px-3 py-1 rounded-full pointer-events-auto">Demnächst verfügbar</div>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center"><Bot className="w-6 h-6 text-blue-400" /></div>
                  <div>
                    <CardTitle className="text-lg font-semibold opacity-60">Automatische Antworten</CardTitle>
                    <CardDescription className="opacity-60">KI beantwortet neue Google-Bewertungen automatisch – bald verfügbar</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Message Dialog */}
        <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
          <DialogContent className="max-w-lg rounded-2xl">
            <DialogHeader>
              <DialogTitle>Neue Nachricht</DialogTitle>
              <DialogDescription>Erreiche deine Kunden mit einer gezielten Nachricht</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              <div className="p-4 bg-muted/30 rounded-xl space-y-3">
                <Label className="font-semibold">Empfänger auswählen</Label>
                <Select value={messageForm.segment_type} onValueChange={(v: Segment['type']) => setMessageForm({...messageForm, segment_type: v})}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{SEGMENT_OPTIONS.map(o=><SelectItem key={o.value} value={o.value}><div><p className="font-medium">{o.label}</p><p className="text-xs text-muted-foreground">{o.description}</p></div></SelectItem>)}</SelectContent>
                </Select>
                {messageForm.segment_type !== 'all' && (
                  <div><Label>{messageForm.segment_type==='last_stamped_days'?`Innerhalb der letzten ${messageForm.segment_value} Tage`:`Seit ${messageForm.segment_value} Tagen nicht`}</Label><Input type="number" min={1} value={messageForm.segment_value} onChange={e=>setMessageForm({...messageForm,segment_value:parseInt(e.target.value)||30})} className="rounded-xl mt-1 w-32" /></div>
                )}
                {estimatedRecipients !== null && <div className="flex items-center gap-2 text-sm"><Users className="h-4 w-4 text-primary" /><span className="font-medium">{estimatedRecipients} Empfänger</span></div>}
              </div>
              <div><Label>Titel</Label><Input value={messageForm.title} onChange={e=>setMessageForm({...messageForm,title:e.target.value})} placeholder="Betreff..." className="rounded-xl mt-1" /></div>
              <div><Label>Nachricht</Label><Textarea value={messageForm.body} onChange={e=>setMessageForm({...messageForm,body:e.target.value})} placeholder="Deine Nachricht..." rows={4} className="rounded-xl mt-1" /></div>
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                <div><p className="text-sm font-medium">Angebot anhängen</p><p className="text-xs text-muted-foreground">7 Tage gültig, einmalig einlösbar</p></div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${messageForm.attach_offer ? 'text-primary' : 'text-muted-foreground'}`}>{messageForm.attach_offer ? 'Aktiv' : 'Inaktiv'}</span>
                  <Switch checked={messageForm.attach_offer} onCheckedChange={v=>setMessageForm({...messageForm,attach_offer:v})} />
                </div>
              </div>
              {messageForm.attach_offer && (
                <div className="space-y-3 p-3 bg-muted/30 rounded-xl">
                  <div><Label>Angebotstitel</Label><Input value={messageForm.offer_title} onChange={e=>setMessageForm({...messageForm,offer_title:e.target.value})} placeholder="z.B. 20% Rabatt" className="rounded-xl mt-1" /></div>
                  <div><Label>Beschreibung</Label><Textarea value={messageForm.offer_description} onChange={e=>setMessageForm({...messageForm,offer_description:e.target.value})} placeholder="Details..." rows={2} className="rounded-xl mt-1" /></div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={()=>setShowMessageDialog(false)} className="rounded-xl">Abbrechen</Button>
              <Button onClick={()=>setShowConfirmDialog(true)} disabled={!messageForm.title||!messageForm.body} className="rounded-xl"><Send className="h-4 w-4 mr-2" />Senden</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Confirm Dialog */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent className="rounded-2xl">
            <DialogHeader><DialogTitle>Nachricht senden?</DialogTitle><DialogDescription>Die Nachricht wird sofort an {estimatedRecipients ?? '?'} Kunden gesendet und kann nicht zurückgenommen werden.</DialogDescription></DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={()=>setShowConfirmDialog(false)} className="rounded-xl">Abbrechen</Button>
              <Button onClick={handleSendMessage} disabled={saving} className="rounded-xl">{saving?<Loader2 className="h-4 w-4 animate-spin mr-2"/>:null}Jetzt senden</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reward Dialog */}
        <Dialog open={showRewardDialog} onOpenChange={setShowRewardDialog}>
          <DialogContent className="max-w-lg rounded-2xl">
            <DialogHeader>
              <DialogTitle>{editingReward ? 'Prämie bearbeiten' : 'Neue Prämie'}</DialogTitle>
              <DialogDescription>Erstelle eine Belohnung, die Kunden mit Punkten einlösen können</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div><Label>Titel *</Label><Input value={rewardForm.title} onChange={e => setRewardForm({ ...rewardForm, title: e.target.value })} placeholder="z.B. Gratis Kaffee" className="rounded-xl mt-1" /></div>
              <div><Label>Beschreibung</Label><Textarea value={rewardForm.description} onChange={e => setRewardForm({ ...rewardForm, description: e.target.value })} placeholder="Details..." rows={2} className="rounded-xl mt-1" /></div>
              <div><Label>Benötigte Punkte</Label><Input type="number" min={1} value={rewardForm.points_required} onChange={e => setRewardForm({ ...rewardForm, points_required: parseInt(e.target.value) || 10 })} className="rounded-xl mt-1 w-32" /></div>
              <div>
                <Label>Bild (optional)</Label>
                <label className="cursor-pointer block mt-1 border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-primary/50 transition-colors">
                  <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleRewardImageUpload(f); }} />
                  {rewardForm.image_url ? <img src={rewardForm.image_url} alt="Preview" className="w-16 h-16 object-cover mx-auto rounded-lg" /> : <span className="text-sm text-muted-foreground">{uploadingRewardImage ? 'Hochladen...' : 'Bild hochladen'}</span>}
                </label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRewardDialog(false)} className="rounded-xl">Abbrechen</Button>
              <Button onClick={handleSaveReward} disabled={saving || !rewardForm.title} className="rounded-xl">{saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}{editingReward ? 'Aktualisieren' : 'Erstellen'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* NCO Dialog */}
        <Dialog open={showNcoDialog} onOpenChange={setShowNcoDialog}>
          <DialogContent className="max-w-lg rounded-2xl">
            <DialogHeader>
              <DialogTitle>{newCustomerOffer ? 'Neukundenprämie bearbeiten' : 'Neukundenprämie erstellen'}</DialogTitle>
              <DialogDescription>Ein Willkommensbonus für neue Kunden</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div><Label>Titel *</Label><Input value={ncoForm.title} onChange={e => setNcoForm({ ...ncoForm, title: e.target.value })} placeholder="z.B. Willkommensbonus" className="rounded-xl mt-1" /></div>
              <div><Label>Beschreibung</Label><Textarea value={ncoForm.description} onChange={e => setNcoForm({ ...ncoForm, description: e.target.value })} placeholder="Details..." rows={2} className="rounded-xl mt-1" /></div>
              <div><Label>Bonuspunkte</Label><Input type="number" min={0} value={ncoForm.bonus_stamps} onChange={e => setNcoForm({ ...ncoForm, bonus_stamps: parseInt(e.target.value) || 0 })} className="rounded-xl mt-1 w-32" /></div>
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                <div><p className="text-sm font-medium">Neukundenprämie aktiv</p></div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${ncoForm.is_active ? 'text-primary' : 'text-muted-foreground'}`}>{ncoForm.is_active ? 'Aktiv' : 'Inaktiv'}</span>
                  <Switch checked={ncoForm.is_active} onCheckedChange={v => setNcoForm({ ...ncoForm, is_active: v })} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNcoDialog(false)} className="rounded-xl">Abbrechen</Button>
              <Button onClick={handleSaveNco} disabled={saving || !ncoForm.title} className="rounded-xl">{saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}{newCustomerOffer ? 'Aktualisieren' : 'Erstellen'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Marketing;
