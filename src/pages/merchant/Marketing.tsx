import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { 
  Loader2, Plus, MessageSquare, Gift, Send, Users, Clock, UserPlus, Zap, Cake, Save, 
  ChevronDown, Rocket, CheckCircle2, Timer, Star, ExternalLink, Copy, Bot, Megaphone,
  Edit2, Trash2, Upload, Coins, Sparkles, Smartphone, ArrowRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import RichTextEditor from '@/components/merchant/RichTextEditor';

import ReferralExplainerCarousel from '@/components/merchant/ReferralExplainerCarousel';
import { ExplainerCarousel } from '@/components/merchant/ExplainerCarousel';
import {
  praemienCards,
  neukundenCards,
  bewertungenCards,
  nachrichtenCards,
  automationenCards,
} from '@/components/merchant/explainerCarouselsData';
import EmojiPicker from '@/components/EmojiPicker';
import { cn } from '@/lib/utils';
import { usePushLimit } from '@/hooks/usePushLimit';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Bell, AlertTriangle } from 'lucide-react';

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
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [merchantDisplayName, setMerchantDisplayName] = useState('');
  const [activeTab, setActiveTab] = useState('praemien');
  const pushLimit = usePushLimit(customerId);
  // --- Rewards state ---
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [showRewardDialog, setShowRewardDialog] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [rewardForm, setRewardForm] = useState({ title: '', description: '', points_required: 10, image_url: '' });
  const [uploadingRewardImage, setUploadingRewardImage] = useState(false);
  const [newCustomerOffer, setNewCustomerOffer] = useState<NewCustomerOffer | null>(null);
  const [showNcoDialog, setShowNcoDialog] = useState(false);
  const [ncoForm, setNcoForm] = useState({ title: '', description: '', is_active: true, image_url: '' });
  const [uploadingNcoImage, setUploadingNcoImage] = useState(false);
  const [showDeleteNcoConfirm, setShowDeleteNcoConfirm] = useState(false);
  
  const [merchantIndustry, setMerchantIndustry] = useState<string | null>(null);
  const [avgOrderValue, setAvgOrderValue] = useState(10);

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
  const [messageForm, setMessageForm] = useState({
    title: '', body: '', segment_type: 'all' as Segment['type'], segment_value: 30,
    attach_offer: false, offer_title: '', offer_description: '',
    attach_points: false, bonus_points: 0, image_url: ''
  });
  const [uploadingMessageImage, setUploadingMessageImage] = useState(false);

  // --- Automations state ---
  const [birthdayEnabled, setBirthdayEnabled] = useState(false);
  const [birthdayMessage, setBirthdayMessage] = useState('Alles Gute zum Geburtstag! Als kleines Geschenk schenken wir dir etwas Besonderes.');
  const [birthdayBonusPoints, setBirthdayBonusPoints] = useState(5);
  const [birthdayGiftType, setBirthdayGiftType] = useState<'points' | 'offer'>('points');
  const [birthdayOfferTitle, setBirthdayOfferTitle] = useState('');
  const [birthdayOfferDescription, setBirthdayOfferDescription] = useState('');
  // --- Winback (Rückholnachrichten) state ---
  const [winbackEnabled, setWinbackEnabled] = useState(false);
  const [winbackMessage, setWinbackMessage] = useState('Wir vermissen dich! Schau doch bald wieder bei uns vorbei – wir freuen uns auf dich.');
  const [winbackInactivityDays, setWinbackInactivityDays] = useState(90);
  const [winbackGiftType, setWinbackGiftType] = useState<'none' | 'points' | 'offer'>('none');
  const [winbackBonusPoints, setWinbackBonusPoints] = useState(5);
  const [winbackOfferTitle, setWinbackOfferTitle] = useState('');
  const [winbackOfferDescription, setWinbackOfferDescription] = useState('');
  const [savingAutomations, setSavingAutomations] = useState(false);
  const [automationsChanged, setAutomationsChanged] = useState(false);
  const automationsLoadedRef = useRef(false);
  const [middleStampPoints, setMiddleStampPoints] = useState<number | null>(null);
  const [stampPoints, setStampPoints] = useState<{ green: number | null; blue: number | null; red: number | null }>({ green: null, blue: null, red: null });
  const [showBonusHint, setShowBonusHint] = useState(false);

  // --- Referral / Empfehlungen state ---
  const [referralEnabled, setReferralEnabled] = useState(true);
  const [referralInviterPoints, setReferralInviterPoints] = useState(20);
  const [referralInviteePoints, setReferralInviteePoints] = useState(1);
  const [savingReferral, setSavingReferral] = useState(false);
  const [referralStats, setReferralStats] = useState<{
    total_invites: number;
    accepted: number;
    converted: number;
  }>({ total_invites: 0, accepted: 0, converted: 0 });
  const [referralList, setReferralList] = useState<Array<{
    invitation_id: string;
    share_code: string;
    created_at: string;
    bonus_awarded_at: string | null;
    inviter_points: number | null;
    invitee_points: number | null;
  }>>([]);

  // Track automation changes
  useEffect(() => {
    if (automationsLoadedRef.current) setAutomationsChanged(true);
  }, [birthdayEnabled, birthdayMessage, birthdayBonusPoints, birthdayGiftType, birthdayOfferTitle, birthdayOfferDescription, winbackEnabled, winbackMessage, winbackInactivityDays, winbackGiftType, winbackBonusPoints, winbackOfferTitle, winbackOfferDescription]);

  useEffect(() => { loadData(); }, []);

  // Sync activeTab from ?tab= URL parameter (Sidebar Sub-Items)
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    const valid = ['praemien', 'boost', 'referral', 'reviews', 'messages', 'automations'];
    if (tabParam && valid.includes(tabParam)) setActiveTab(tabParam);
  }, [searchParams]);

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

      // Fetch all stamp points for display (supports DE + EN color values)
      const { data: allChips } = await supabase
        .from('nfc_chips')
        .select('points_value, stamp_color')
        .eq('merchant_customer_id', assignment.customer_id)
        .eq('is_active', true)
        .in('stamp_color', ['grün', 'blau', 'rot', 'green', 'blue', 'red']);

      const chipMap = { green: null as number | null, blue: null as number | null, red: null as number | null };
      allChips?.forEach((c) => {
        const color = (c.stamp_color || '').toLowerCase();
        if (color === 'grün' || color === 'green') chipMap.green = c.points_value;
        if (color === 'blau' || color === 'blue') chipMap.blue = c.points_value;
        if (color === 'rot' || color === 'red') chipMap.red = c.points_value;
      });

      setStampPoints(chipMap);
      const midPoints = chipMap.blue;
      setMiddleStampPoints(midPoints);

      const { data: cd } = await supabase.from('customers').select('google_review_url, google_review_points_enabled, google_review_points_value, birthday_enabled, birthday_message, birthday_bonus_points, birthday_gift_type, birthday_offer_title, birthday_offer_description, industry, avg_revenue, company_name, name, referral_enabled, referral_inviter_points, referral_invitee_points, winback_enabled, winback_message, winback_inactivity_days, winback_gift_type, winback_bonus_points, winback_offer_title, winback_offer_description').eq('id', assignment.customer_id).maybeSingle();
      if (cd) {
        setGoogleReviewUrl(cd.google_review_url || "");
        setReviewPointsEnabled(cd.google_review_points_enabled || false);
        setReviewPointsValue(cd.google_review_points_value || 5);
        setMerchantDisplayName(cd.company_name || cd.name || '');
        setBirthdayEnabled(cd.birthday_enabled ?? false);
        if (cd.birthday_message) setBirthdayMessage(cd.birthday_message);
        // Default to middle stamp points if no birthday bonus was ever set
        const savedBonusPoints = (cd as any).birthday_bonus_points;
        setBirthdayBonusPoints(savedBonusPoints ?? midPoints ?? 5);
        setBirthdayGiftType(((cd as any).birthday_gift_type as 'points' | 'offer') || 'points');
        setBirthdayOfferTitle((cd as any).birthday_offer_title || '');
        setBirthdayOfferDescription((cd as any).birthday_offer_description || '');
        if (cd.industry) setMerchantIndustry(cd.industry);
        if (cd.avg_revenue) setAvgOrderValue(cd.avg_revenue);
        // Referral settings
        setReferralEnabled((cd as any).referral_enabled ?? true);
        setReferralInviterPoints((cd as any).referral_inviter_points ?? 20);
        setReferralInviteePoints((cd as any).referral_invitee_points ?? 1);
        // Winback settings
        setWinbackEnabled((cd as any).winback_enabled ?? false);
        if ((cd as any).winback_message) setWinbackMessage((cd as any).winback_message);
        setWinbackInactivityDays((cd as any).winback_inactivity_days ?? 90);
        setWinbackGiftType(((cd as any).winback_gift_type as 'none' | 'points' | 'offer') || 'none');
        setWinbackBonusPoints((cd as any).winback_bonus_points ?? (midPoints ?? 5));
        setWinbackOfferTitle((cd as any).winback_offer_title || '');
        setWinbackOfferDescription((cd as any).winback_offer_description || '');
      }

      // Referral statistics — nur tatsächlich verschickte Einladungen zählen
      // (status != 'pending' = User hat auf "Über WhatsApp einladen" geklickt
      // oder der Empfänger hat bereits angenommen/konvertiert)
      const { data: invites } = await supabase
        .from('invitations')
        .select('id, status')
        .eq('merchant_customer_id', assignment.customer_id)
        .neq('status', 'pending');
      const inviteIds = (invites || []).map((i) => i.id);
      let acceptedCount = 0;
      let convertedCount = 0;
      if (inviteIds.length > 0) {
        const { data: redemptions } = await supabase
          .from('invitation_redemptions')
          .select('id, bonus_awarded_at')
          .in('invitation_id', inviteIds);
        acceptedCount = redemptions?.length || 0;
        convertedCount = redemptions?.filter((r) => r.bonus_awarded_at !== null).length || 0;
      }
      setReferralStats({
        total_invites: invites?.length || 0,
        accepted: acceptedCount,
        converted: convertedCount,
      });

      // Liste der erfolgreichen Empfehlungen
      const { data: refList } = await supabase.rpc('list_merchant_referrals', {
        p_merchant_customer_id: assignment.customer_id,
      });
      setReferralList((refList as any[] | null) ?? []);

      // Mark automations as loaded (so changes after this trigger automationsChanged)
      setTimeout(() => { automationsLoadedRef.current = true; }, 100);

      const { data: rewardsData } = await supabase.from('rewards').select('*').eq('merchant_customer_id', assignment.customer_id).order('points_required', { ascending: true });
      if (rewardsData) setRewards(rewardsData);

      const { data: ncoData } = await supabase.from('new_customer_offers').select('*').eq('merchant_customer_id', assignment.customer_id).maybeSingle();
      setNewCustomerOffer(ncoData);
      if (ncoData) {
        setNcoForm({ title: ncoData.title, description: ncoData.description || '', is_active: ncoData.is_active ?? true, image_url: ncoData.image_url || '' });
      }

      const { data: msgData } = await supabase.from('app_messages').select('id, title, body, show_in_storefront, sent_at, offer_id').eq('merchant_customer_id', assignment.customer_id).order('sent_at', { ascending: false });
      if (msgData) {
        const seen = new Map<string, any>();
        for (const msg of msgData) { const key = `${msg.title}||${msg.body}||${msg.sent_at}`; if (!seen.has(key)) seen.set(key, { ...msg, recipient_count: 1 }); else seen.get(key)!.recipient_count++; }
        setMessages(Array.from(seen.values()).map((m: any) => ({ id: m.id, title: m.title, body: m.body, show_in_storefront: m.show_in_storefront, sent_at: m.sent_at, segment: { type: 'all' as const }, offer_id: m.offer_id, is_sent: true, recipient_count: m.recipient_count })));
      }

      const { data: offerData } = await supabase.from('offers').select('id, title, description').eq('merchant_customer_id', assignment.customer_id).eq('is_active', true);
      if (offerData) setOffers(offerData);

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
      const { error } = await supabase.from("customers").update({ google_review_points_enabled: reviewPointsEnabled, google_review_points_value: reviewPointsValue, google_review_url: googleReviewUrl, updated_at: new Date().toISOString() }).eq("id", customerId);
      if (error) throw error; toast.success("Gespeichert!");
    } catch { toast.error("Fehler"); } finally { setSavingReviewPoints(false); }
  };

  const handleSaveReferral = async () => {
    if (!customerId) return;
    setSavingReferral(true);
    try {
      const { error } = await supabase.from("customers").update({
        referral_enabled: true,
        referral_inviter_points: referralInviterPoints,
        updated_at: new Date().toISOString(),
      }).eq("id", customerId);
      if (error) throw error;
      toast.success("Empfehlungs-Einstellungen gespeichert!");
    } catch {
      toast.error("Fehler beim Speichern");
    } finally {
      setSavingReferral(false);
    }
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

  const resetMessageForm = () => {
    setMessageForm({ title: '', body: '', segment_type: 'all', segment_value: 30, attach_offer: false, offer_title: '', offer_description: '', attach_points: false, bonus_points: 0, image_url: '' });
    setEstimatedRecipients(null);
  };

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
      const msgs = uids.map(uid => ({
        merchant_customer_id: customerId, user_id: uid, title: messageForm.title, body: messageForm.body,
        offer_id: offerId, sent_at: new Date().toISOString(),
        image_url: messageForm.image_url || null,
        bonus_points: messageForm.attach_points && messageForm.bonus_points > 0 ? messageForm.bonus_points : null,
      } as any));
      const { data: insertedMessages, error } = await supabase.from('app_messages').insert(msgs).select('id, user_id');
      if (error) throw error;

      const pushRecipients = insertedMessages ?? uids.map((user_id) => ({ user_id, id: undefined }));
      const pushResults = await Promise.allSettled(
        pushRecipients.map(async ({ user_id, id }) => {
          const { error: pushError } = await supabase.functions.invoke('send-push-notification', {
            body: {
              user_id,
              title: `📬 ${merchantDisplayName || 'Neues Angebot'}`,
              body: messageForm.title,
              data: {
                type: 'message',
                merchant_customer_id: customerId,
                message_id: id,
              },
            },
          });

          if (pushError) {
            throw pushError;
          }
        })
      );

      const failedPushCount = pushResults.filter((result) => result.status === 'rejected').length;
      if (failedPushCount > 0) {
        console.error('Push notifications failed for some recipients', { failedPushCount, totalRecipients: uids.length });
      }

      // Record push send for limit tracking
      await pushLimit.recordPushSend(customerId);

      toast.success(`Nachricht an ${uids.length} Kunden gesendet!`);
      setShowConfirmDialog(false); setShowMessageDialog(false); resetMessageForm(); loadData();
    } catch { toast.error('Fehler beim Senden'); } finally { setSaving(false); }
  };

  const handleSaveAutomations = async () => {
    if (!customerId) return;
    setSavingAutomations(true);
    try {
      const { error } = await supabase.from('customers').update({
        birthday_enabled: birthdayEnabled,
        birthday_message: birthdayMessage,
        birthday_bonus_points: birthdayBonusPoints,
        birthday_gift_type: birthdayGiftType,
        birthday_offer_title: birthdayOfferTitle || null,
        birthday_offer_description: birthdayOfferDescription || null,
        winback_enabled: winbackEnabled,
        winback_message: winbackMessage,
        winback_inactivity_days: Math.max(7, Math.min(365, winbackInactivityDays || 90)),
        winback_gift_type: winbackGiftType,
        winback_bonus_points: winbackGiftType === 'points' ? (winbackBonusPoints || 0) : null,
        winback_offer_title: winbackGiftType === 'offer' ? (winbackOfferTitle || null) : null,
        winback_offer_description: winbackGiftType === 'offer' ? (winbackOfferDescription || null) : null,
      } as any).eq('id', customerId);
      if (error) throw error; toast.success('Gespeichert'); setAutomationsChanged(false);
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
        if (error) throw error; toast.success("Prämie aktualisiert");
      } else {
        const { error } = await supabase.from("rewards").insert({ merchant_customer_id: customerId, title: rewardForm.title, description: rewardForm.description || null, points_required: rewardForm.points_required, image_url: rewardForm.image_url || null, is_active: true });
        if (error) throw error; toast.success("Prämie erstellt");
      }
      setShowRewardDialog(false); setEditingReward(null); setRewardForm({ title: '', description: '', points_required: 10, image_url: '' }); loadData();
    } catch { toast.error("Fehler beim Speichern"); } finally { setSaving(false); }
  };

  const handleDeleteReward = async (id: string) => {
    try { const { error } = await supabase.from("rewards").delete().eq("id", id); if (error) throw error; toast.success("Prämie gelöscht"); loadData(); } catch { toast.error("Fehler beim Löschen"); }
  };

  // --- NCO handlers ---
  const handleNcoImageUpload = async (file: File) => {
    if (!customerId) return;
    setUploadingNcoImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${customerId}/nco_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("customer-assets").upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("customer-assets").getPublicUrl(fileName);
      setNcoForm(prev => ({ ...prev, image_url: publicUrl }));
      toast.success("Bild hochgeladen");
    } catch { toast.error("Fehler beim Hochladen"); } finally { setUploadingNcoImage(false); }
  };

  const handleMessageImageUpload = async (file: File) => {
    if (!customerId) return;
    setUploadingMessageImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${customerId}/msg_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("customer-assets").upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("customer-assets").getPublicUrl(fileName);
      setMessageForm(prev => ({ ...prev, image_url: publicUrl }));
      toast.success("Bild hochgeladen");
    } catch { toast.error("Fehler beim Hochladen"); } finally { setUploadingMessageImage(false); }
  };

  const handleSaveNco = async () => {
    if (!customerId) return;
    if (!ncoForm.title) { toast.error("Bitte Titel eingeben"); return; }
    setSaving(true);
    try {
      const dataToSave = { title: ncoForm.title, description: ncoForm.description || null, bonus_stamps: 0, image_url: ncoForm.image_url || null };

      if (newCustomerOffer) {
        const { error } = await supabase.from("new_customer_offers").update(dataToSave).eq("id", newCustomerOffer.id);
        if (error) throw error; toast.success("Neukundenprämie aktualisiert");
      } else {
        const { error } = await supabase.from("new_customer_offers").insert({ ...dataToSave, merchant_customer_id: customerId, is_active: true });
        if (error) throw error; toast.success("Neukundenprämie erstellt");
      }
      setShowNcoDialog(false); loadData();
    } catch { toast.error("Fehler beim Speichern"); } finally { setSaving(false); }
  };

  const handleDeleteNcoConfirmed = async () => {
    if (!newCustomerOffer) return;
    try {
      const { error } = await supabase.from("new_customer_offers").delete().eq("id", newCustomerOffer.id);
      if (error) throw error;
      toast.success("Neukundenprämie gelöscht");
      setNewCustomerOffer(null);
      setNcoForm({ title: '', description: '', is_active: true, image_url: '' });
      setShowDeleteNcoConfirm(false);
    } catch { toast.error("Fehler beim Löschen"); }
  };

  const handleToggleNcoActive = async (active: boolean) => {
    if (!newCustomerOffer) return;
    try {
      const { error } = await supabase.from('new_customer_offers').update({ is_active: active }).eq('id', newCustomerOffer.id);
      if (error) throw error;
      toast.success(active ? 'Neukundenprämie aktiviert' : 'Neukundenprämie deaktiviert');
      loadData();
    } catch { toast.error('Fehler'); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-6 lg:px-8 py-8 space-y-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>

          {/* ========== PRÄMIEN TAB ========== */}
          <TabsContent value="praemien" className="mt-6 space-y-6">
            <ExplainerCarousel slides={praemienCards} />
            <Card className="rounded-2xl shadow-sm border border-primary/10 bg-primary/[0.03]">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Gift className="h-5 w-5 text-primary" /></div>
                  <div>
                    <CardTitle className="text-lg font-semibold">Aktive Prämien</CardTitle>
                    <CardDescription>Deine aktuell einlösbaren Prämien</CardDescription>
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

            {/* Sprung zur Live-Vorschau in Mein Geschäft → System */}
            <Card className="rounded-2xl shadow-sm border-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
              <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center">
                  <Smartphone className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">So sehen deine Kunden es in der App</p>
                  <p className="text-sm text-muted-foreground">Schau dir die Live-Vorschau deines Geschäfts an</p>
                </div>
                <Button
                  onClick={() => navigate('/kunde/mein-geschaeft?tab=stempel')}
                  className="rounded-xl gap-2"
                  size="lg"
                >
                  <Smartphone className="h-4 w-4" />
                  Zur Vorschau
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========== NEUKUNDEN TAB ========== */}
          <TabsContent value="boost" className="space-y-6 mt-6">
            <ExplainerCarousel slides={neukundenCards} />
            {/* Neukundenprämie */}
            <Card className="rounded-2xl shadow-sm border border-primary/10 bg-primary/[0.03]">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><UserPlus className="h-5 w-5 text-primary" /></div>
                  <div>
                    <CardTitle className="text-lg font-semibold">Neukundenprämie</CardTitle>
                  </div>
                </div>
                <Button variant={newCustomerOffer ? "outline" : "default"} onClick={() => { if (newCustomerOffer) { setNcoForm({ title: newCustomerOffer.title, description: newCustomerOffer.description || '', is_active: newCustomerOffer.is_active ?? true, image_url: newCustomerOffer.image_url || '' }); } else { setNcoForm({ title: '', description: '', is_active: true, image_url: '' }); } setShowNcoDialog(true); }} className="rounded-xl">
                  {newCustomerOffer ? <><Edit2 className="h-4 w-4 mr-2" />Bearbeiten</> : <><Plus className="h-4 w-4 mr-2" />Erstellen</>}
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {newCustomerOffer ? (
                  <div className="flex items-center justify-between p-4 bg-card rounded-xl border border-border/30">
                    <div className="flex items-center gap-3">
                      {newCustomerOffer.image_url && (
                        <img src={newCustomerOffer.image_url} alt={newCustomerOffer.title} className="w-12 h-12 rounded-xl object-cover" />
                      )}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-foreground">{newCustomerOffer.title}</p>
                        </div>
                        {newCustomerOffer.description && <p className="text-sm text-muted-foreground">{newCustomerOffer.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${newCustomerOffer.is_active ? 'text-primary' : 'text-muted-foreground'}`}>
                          {newCustomerOffer.is_active ? 'Aktiv' : 'Inaktiv'}
                        </span>
                        <Switch checked={newCustomerOffer.is_active ?? false} onCheckedChange={handleToggleNcoActive} />
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setShowDeleteNcoConfirm(true)} className="rounded-lg"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
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
          {/* ========== EMPFEHLUNGEN TAB ========== */}
          <TabsContent value="referral" className="space-y-6 mt-6">
            <Card className="rounded-2xl shadow-sm border border-primary/10 bg-primary/[0.03]">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><UserPlus className="h-5 w-5 text-primary" /></div>
                  <div>
                    <CardTitle className="text-lg font-semibold">Freunde-Empfehlungen</CardTitle>
                    <CardDescription>Lass deine Kunden Freunde einladen – ihr profitiert alle</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ReferralExplainerCarousel />

                <div className="p-5 bg-card rounded-xl border border-border/30 space-y-4">
                  <h3 className="font-semibold text-foreground text-base">
                    Punkte, die der Kunde bekommt, der einen Freund erfolgreich eingeladen hat
                  </h3>
                  <div className="flex items-center gap-4">
                    <Input
                      type="number"
                      min={1}
                      max={500}
                      value={referralInviterPoints}
                      onChange={(e) => {
                        const n = parseInt(e.target.value, 10);
                        setReferralInviterPoints(Number.isFinite(n) && n > 0 ? n : 1);
                      }}
                      className="text-center font-bold text-primary border-2 border-primary/30 focus-visible:border-primary rounded-xl"
                      style={{ height: "64px", width: "120px", fontSize: "28px", fontWeight: 700 }}
                    />
                    <span className="text-foreground font-medium" style={{ fontSize: "18px" }}>Punkte</span>
                  </div>
                </div>

                <Button onClick={handleSaveReferral} disabled={savingReferral} className="rounded-xl">
                  {savingReferral ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Speichern...</> : "Einstellungen speichern"}
                </Button>
              </CardContent>
            </Card>

            {/* Statistik */}
            <Card className="rounded-2xl shadow-sm border border-primary/10 bg-primary/[0.03]">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Sparkles className="h-5 w-5 text-primary" /></div>
                  <div>
                    <CardTitle className="text-lg font-semibold">Empfehlungs-Statistik</CardTitle>
                    <CardDescription>Wie deine Kunden für dich werben</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 bg-card rounded-xl border border-border/30 text-center">
                    <p className="text-3xl font-bold text-foreground">{referralStats.total_invites}</p>
                    <p className="text-xs text-muted-foreground mt-1">Einladungen verschickt</p>
                  </div>
                  <div className="p-4 bg-card rounded-xl border border-border/30 text-center">
                    <p className="text-3xl font-bold text-foreground">{referralStats.accepted}</p>
                    <p className="text-xs text-muted-foreground mt-1">Angenommen</p>
                  </div>
                  <div className="p-4 bg-card rounded-xl border border-border/30 text-center">
                    <p className="text-3xl font-bold text-primary">{referralStats.converted}</p>
                    <p className="text-xs text-muted-foreground mt-1">Erfolgreich (Bonus vergeben)</p>
                  </div>
                </div>

                {referralList.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-semibold text-foreground mb-3">Erfolgreiche Empfehlungen</h4>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {referralList.filter(r => r.bonus_awarded_at).map((r) => (
                        <div
                          key={r.invitation_id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/30"
                        >
                          <div className="text-sm">
                            <p className="font-medium text-foreground">Code {r.share_code}</p>
                            <p className="text-xs text-muted-foreground">
                              {r.bonus_awarded_at
                                ? new Date(r.bonus_awarded_at).toLocaleDateString('de-DE', {
                                    day: '2-digit', month: '2-digit', year: 'numeric',
                                  })
                                : '—'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Vergebene Punkte</p>
                            <p className="text-sm font-semibold text-primary">
                              +{(r.inviter_points ?? 0) + (r.invitee_points ?? 0)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========== BEWERTUNGEN TAB ========== */}
          <TabsContent value="reviews" className="space-y-6 mt-6">
            <ExplainerCarousel slides={bewertungenCards} />
            <Card className="rounded-2xl shadow-sm border border-primary/10 bg-primary/[0.03]">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center"><Star className="w-6 h-6 text-amber-600 fill-amber-500" /></div>
                  <div>
                    <CardTitle className="text-lg font-semibold">Belohne Kunden mit Bonuspunkten für eine Google-Bewertung</CardTitle>
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
          </TabsContent>

          {/* ========== NACHRICHTEN TAB ========== */}
           <TabsContent value="messages" className="space-y-6 mt-6">
            <ExplainerCarousel slides={nachrichtenCards} />
            {/* Push Limit Banner */}
            {!pushLimit.loading && (
              <div className={`p-4 rounded-2xl border ${pushLimit.isLimitReached ? 'bg-destructive/5 border-destructive/20' : 'bg-muted/30 border-border/50'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${pushLimit.isLimitReached ? 'bg-destructive/10' : 'bg-primary/10'}`}>
                    <Bell className={`h-5 w-5 ${pushLimit.isLimitReached ? 'text-destructive' : 'text-primary'}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">
                      Push-Benachrichtigungen: {pushLimit.pushesUsed} / {pushLimit.pushLimit} diesen Monat genutzt
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {pushLimit.isLimitReached
                        ? `Limit erreicht. Nächstes Zurücksetzen am ${pushLimit.resetDate?.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
                        : `Noch ${pushLimit.remaining} Push-Nachricht${pushLimit.remaining !== 1 ? 'en' : ''} verfügbar. Zurücksetzen am ${pushLimit.resetDate?.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
                      }
                    </p>
                  </div>
                  {pushLimit.isLimitReached && <AlertTriangle className="h-5 w-5 text-destructive" />}
                </div>
              </div>
            )}

            <Card className="rounded-2xl shadow-sm border border-border/50 bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center"><MessageSquare className="h-5 w-5 text-blue-600" /></div>
                  <div>
                    <CardTitle className="text-lg font-semibold">Nachrichten an Kunden</CardTitle>
                    <CardDescription>Sende gezielte Nachrichten an deine Kunden</CardDescription>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    if (pushLimit.isLimitReached) {
                      toast.error(`Du hast diesen Monat bereits ${pushLimit.pushLimit} Push-Benachrichtigungen versendet. Dein Limit wird am ${pushLimit.resetDate?.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })} zurückgesetzt.`);
                      return;
                    }
                    resetMessageForm();
                    setShowMessageDialog(true);
                  }}
                  className="rounded-xl"
                  variant={pushLimit.isLimitReached ? "outline" : "default"}
                >
                  <Plus className="h-4 w-4 mr-2" />Neue Nachricht
                </Button>
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
            <ExplainerCarousel slides={automationenCards} />
            <Card className="rounded-2xl shadow-sm border border-border/50 bg-card">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center"><Zap className="h-5 w-5 text-purple-600" /></div>
                  <div>
                    <CardTitle className="text-lg font-semibold">Automatische Nachrichten und Geschenke an deine Kunden</CardTitle>
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
                      <div>
                        <Label className="text-xs text-muted-foreground">Nachricht</Label>
                        <div className="mt-1">
                          <RichTextEditor value={birthdayMessage} onChange={setBirthdayMessage} placeholder="Geburtstagsnachricht..." rows={2} />
                        </div>
                      </div>
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
                        <div>
                          <Label className="text-xs text-muted-foreground">Bonuspunkte</Label>
                          <div className="flex items-start gap-3 mt-1">
                            <Input
                              type="number"
                              min={1}
                              value={birthdayBonusPoints}
                              onChange={e => setBirthdayBonusPoints(parseInt(e.target.value) || 5)}
                              onFocus={() => setShowBonusHint(true)}
                              onBlur={() => setShowBonusHint(false)}
                              className="rounded-xl w-32"
                            />
                            {showBonusHint && middleStampPoints && (
                              <div className="flex-1 bg-primary/5 border border-primary/20 rounded-xl px-3 py-2 text-xs text-foreground/80 animate-in fade-in-0 slide-in-from-left-2 duration-200">
                                💡 Basierend auf dem, was dein Durchschnittskunde bei dir ausgibt, empfehlen wir dir <strong>{middleStampPoints} Punkte</strong> als Geburtstagsgeschenk.
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3 p-3 bg-pink-50/50 rounded-xl border border-pink-100">
                          <div><Label className="text-xs">Angebotstitel</Label><Input value={birthdayOfferTitle} onChange={e=>setBirthdayOfferTitle(e.target.value)} placeholder="z.B. Frühstück zum halben Preis" className="mt-1 rounded-xl text-sm" /></div>
                          <div><Label className="text-xs">Beschreibung</Label>
                            <div className="mt-1">
                              <RichTextEditor value={birthdayOfferDescription} onChange={setBirthdayOfferDescription} placeholder="Details..." rows={2} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Rückholnachrichten */}
                <div className={`p-4 rounded-xl border-2 transition-colors ${winbackEnabled ? 'bg-purple-50/60 border-purple-200' : 'bg-muted/20 border-border/50'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${winbackEnabled ? 'bg-purple-500' : 'bg-muted'}`}>
                        <Clock className={`h-4 w-4 ${winbackEnabled ? 'text-white' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">Rückholnachrichten</h4>
                        <p className="text-xs text-muted-foreground">Automatische Nachricht an Kunden, die länger nicht mehr gestempelt haben</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${winbackEnabled ? 'text-purple-600' : 'text-muted-foreground'}`}>{winbackEnabled ? 'Aktiv' : 'Inaktiv'}</span>
                      <Switch checked={winbackEnabled} onCheckedChange={setWinbackEnabled} />
                    </div>
                  </div>
                  {winbackEnabled && (
                    <div className="mt-3 space-y-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Nachricht an inaktive Kunden</Label>
                        <div className="mt-1">
                          <RichTextEditor value={winbackMessage} onChange={setWinbackMessage} placeholder="Wir vermissen dich! Schau doch bald wieder vorbei..." rows={2} />
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground">Nach wie vielen Tagen ohne Stempel senden?</Label>
                        <div className="flex items-center gap-3 mt-1">
                          <Input
                            type="number"
                            min={7}
                            max={365}
                            value={winbackInactivityDays}
                            onChange={(e) => setWinbackInactivityDays(parseInt(e.target.value) || 90)}
                            className="rounded-xl w-32"
                          />
                          <span className="text-sm text-muted-foreground">Tage (Standard: 90)</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Sobald ein Kunde {winbackInactivityDays} Tage lang keinen Stempel gesammelt hat, bekommt er automatisch deine Nachricht – auch als Push.
                        </p>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-xs text-muted-foreground font-semibold">Geschenk anhängen?</Label>
                        <div className="grid grid-cols-3 gap-2">
                          <button type="button" onClick={() => setWinbackGiftType('none')} className={`p-3 rounded-xl border-2 text-left transition-all ${winbackGiftType === 'none' ? 'border-purple-400 bg-purple-50 ring-1 ring-purple-200' : 'border-border bg-card hover:border-muted-foreground/30'}`}>
                            <div className="font-semibold text-sm">✉️ Nur Nachricht</div>
                            <p className="text-xs text-muted-foreground mt-1">Ohne Geschenk</p>
                          </button>
                          <button type="button" onClick={() => setWinbackGiftType('points')} className={`p-3 rounded-xl border-2 text-left transition-all ${winbackGiftType === 'points' ? 'border-purple-400 bg-purple-50 ring-1 ring-purple-200' : 'border-border bg-card hover:border-muted-foreground/30'}`}>
                            <div className="font-semibold text-sm">🎁 Bonuspunkte</div>
                            <p className="text-xs text-muted-foreground mt-1">Punkte schenken</p>
                          </button>
                          <button type="button" onClick={() => setWinbackGiftType('offer')} className={`p-3 rounded-xl border-2 text-left transition-all ${winbackGiftType === 'offer' ? 'border-purple-400 bg-purple-50 ring-1 ring-purple-200' : 'border-border bg-card hover:border-muted-foreground/30'}`}>
                            <div className="font-semibold text-sm">🎉 Angebot</div>
                            <p className="text-xs text-muted-foreground mt-1">Angebot schenken</p>
                          </button>
                        </div>
                      </div>

                      {winbackGiftType === 'points' && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Bonuspunkte</Label>
                          <Input
                            type="number"
                            min={1}
                            value={winbackBonusPoints}
                            onChange={(e) => setWinbackBonusPoints(parseInt(e.target.value) || 5)}
                            className="rounded-xl w-32 mt-1"
                          />
                        </div>
                      )}

                      {winbackGiftType === 'offer' && (
                        <div className="space-y-3 p-3 bg-purple-50/50 rounded-xl border border-purple-100">
                          <div>
                            <Label className="text-xs">Angebotstitel</Label>
                            <Input value={winbackOfferTitle} onChange={(e) => setWinbackOfferTitle(e.target.value)} placeholder="z.B. Kaffee aufs Haus" className="mt-1 rounded-xl text-sm" />
                          </div>
                          <div>
                            <Label className="text-xs">Beschreibung</Label>
                            <div className="mt-1">
                              <RichTextEditor value={winbackOfferDescription} onChange={setWinbackOfferDescription} placeholder="Details..." rows={2} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleSaveAutomations}
                  disabled={savingAutomations || !customerId}
                  className={cn(
                    "rounded-xl transition-all duration-300",
                    automationsChanged
                      ? "bg-primary text-primary-foreground ring-2 ring-primary/40 ring-offset-2 shadow-lg shadow-primary/20"
                      : ""
                  )}
                  variant={automationsChanged ? "default" : "outline"}
                >
                  {savingAutomations ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  {automationsChanged ? '💾 Änderungen speichern' : 'Automatisierungen speichern'}
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
              <div>
                <Label>Titel</Label>
                <div className="flex items-center gap-1 mt-1">
                  <Input value={messageForm.title} onChange={e=>setMessageForm({...messageForm,title:e.target.value})} placeholder="Betreff..." className="rounded-xl flex-1" />
                  <EmojiPicker onEmojiSelect={(emoji) => setMessageForm(prev => ({...prev, title: prev.title + emoji}))} />
                </div>
              </div>
              <div>
                <Label>Nachricht</Label>
                <div className="mt-1">
                  <RichTextEditor value={messageForm.body} onChange={v => setMessageForm({...messageForm, body: v})} placeholder="Deine Nachricht..." rows={4} />
                </div>
              </div>

              {/* Image Upload */}
              <div className="p-3 bg-muted/30 rounded-xl space-y-2">
                <Label className="text-sm font-medium">Bild anhängen (optional)</Label>
                <label className="cursor-pointer block border-2 border-dashed border-border rounded-xl p-3 text-center hover:border-primary/50 transition-colors">
                  <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleMessageImageUpload(f); }} />
                  {messageForm.image_url ? (
                    <div className="relative inline-block">
                      <img src={messageForm.image_url} alt="Preview" className="w-20 h-20 object-cover mx-auto rounded-lg" />
                      <Button type="button" variant="destructive" size="sm" className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full" onClick={(e) => { e.preventDefault(); setMessageForm(prev => ({...prev, image_url: ''})); }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                      {uploadingMessageImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {uploadingMessageImage ? 'Hochladen...' : 'Bild hochladen'}
                    </span>
                  )}
                </label>
              </div>

              {/* Attach Offer */}
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                <div><p className="text-sm font-medium">Angebot anhängen</p><p className="text-xs text-muted-foreground">7 Tage gültig, einmalig einlösbar per NFC</p></div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${messageForm.attach_offer ? 'text-primary' : 'text-muted-foreground'}`}>{messageForm.attach_offer ? 'Aktiv' : 'Inaktiv'}</span>
                  <Switch checked={messageForm.attach_offer} onCheckedChange={v=>setMessageForm({...messageForm, attach_offer: v, attach_points: v ? false : messageForm.attach_points})} />
                </div>
              </div>
              {messageForm.attach_offer && (
                <div className="space-y-3 p-3 bg-muted/30 rounded-xl">
                  <div><Label>Angebotstitel</Label><Input value={messageForm.offer_title} onChange={e=>setMessageForm({...messageForm,offer_title:e.target.value})} placeholder="z.B. 20% Rabatt" className="rounded-xl mt-1" /></div>
                  <div><Label>Beschreibung</Label>
                    <div className="mt-1">
                      <RichTextEditor value={messageForm.offer_description} onChange={v => setMessageForm({...messageForm, offer_description: v})} placeholder="Details..." rows={2} />
                    </div>
                  </div>
                </div>
              )}

              {/* Attach Points */}
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                <div><p className="text-sm font-medium">Punkte anhängen</p><p className="text-xs text-muted-foreground">Kunden erhalten Punkte beim Öffnen der Nachricht</p></div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${messageForm.attach_points ? 'text-primary' : 'text-muted-foreground'}`}>{messageForm.attach_points ? 'Aktiv' : 'Inaktiv'}</span>
                  <Switch checked={messageForm.attach_points} onCheckedChange={v=>setMessageForm({...messageForm, attach_points: v, attach_offer: v ? false : messageForm.attach_offer})} />
                </div>
              </div>
              {messageForm.attach_points && (
                <div className="p-3 bg-muted/30 rounded-xl">
                  <Label>Anzahl Bonuspunkte</Label>
                  <Input type="number" min={1} value={messageForm.bonus_points || ''} onChange={e=>setMessageForm({...messageForm, bonus_points: parseInt(e.target.value) || 0})} placeholder="z.B. 5" className="rounded-xl mt-1 w-32" />
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
              <div><Label>Beschreibung</Label><textarea value={rewardForm.description} onChange={e => setRewardForm({ ...rewardForm, description: e.target.value })} placeholder="Details..." rows={2} className="flex min-h-[60px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm mt-1" /></div>
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
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 text-sm text-muted-foreground space-y-2">
                <p className="font-medium text-foreground">💡 So funktioniert die Neukundenprämie</p>
                <p>Die Neukundenprämie ist ein <strong>persönliches Sachangebot</strong> deines Geschäfts – z.&nbsp;B. eine Shampooprobe im Friseursalon, eine kleine Portion Pommes oder ein gratis Ayran beim Döner.</p>
                <p>Sobald ein Kunde zum ersten Mal bei dir Punkte sammelt, wird die Prämie automatisch freigeschaltet. Der Kunde zeigt dir den Bestätigungs-Bildschirm an der Kasse.</p>
              </div>

              <div>
                <Label>Titel *</Label>
                <Input value={ncoForm.title} onChange={e => setNcoForm({ ...ncoForm, title: e.target.value })} placeholder="z.B. Gratis Shampooprobe / Kleine Pommes / Ayran gratis" className="rounded-xl mt-1" />
              </div>
              <div>
                <Label>Beschreibung</Label>
                <div className="mt-1">
                  <RichTextEditor value={ncoForm.description} onChange={v => setNcoForm({...ncoForm, description: v})} placeholder="z.B. nur zu einer Bestellung ab 10 € / nur in Verbindung mit einem Haarschnitt / ein Goodie pro Besuch" rows={2} />
                </div>
              </div>
              <div>
                <Label>Bild (optional)</Label>
                <label className="cursor-pointer block mt-1 border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-primary/50 transition-colors">
                  <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleNcoImageUpload(f); }} />
                  {ncoForm.image_url ? (
                    <div className="relative inline-block">
                      <img src={ncoForm.image_url} alt="Preview" className="w-20 h-20 object-cover mx-auto rounded-lg" />
                      <Button type="button" variant="destructive" size="sm" className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full" onClick={(e) => { e.preventDefault(); setNcoForm(prev => ({...prev, image_url: ''})); }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                      {uploadingNcoImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {uploadingNcoImage ? 'Hochladen...' : 'Bild hochladen'}
                    </span>
                  )}
                </label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNcoDialog(false)} className="rounded-xl">Abbrechen</Button>
              <Button onClick={handleSaveNco} disabled={saving || !ncoForm.title} className="rounded-xl">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {newCustomerOffer ? 'Aktualisieren' : 'Erstellen'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete NCO Confirm */}
        <AlertDialog open={showDeleteNcoConfirm} onOpenChange={setShowDeleteNcoConfirm}>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Neukundenprämie löschen?</AlertDialogTitle>
              <AlertDialogDescription>Bist du sicher, dass du diese Neukundenprämie löschen möchtest? Diese Aktion kann nicht rückgängig gemacht werden.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Abbrechen</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteNcoConfirmed} className="bg-destructive hover:bg-destructive/90 rounded-xl">Löschen</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </div>
  );
};

export default Marketing;
