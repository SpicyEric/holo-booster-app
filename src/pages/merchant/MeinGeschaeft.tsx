import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Upload, Save, MapPin, Phone, Globe, Instagram, Facebook, Twitter,
  Clock, Store, Gift, Info, UserPlus, Plus, Trash2, Edit2, Loader2, Package, ImageIcon, BarChart3, Nfc, ArrowRight, X, Image as ImageLucide, Sparkles
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PhoneFrame from "@/components/PhoneFrame";
import MerchantPreviewLive from "@/components/merchant/MerchantPreviewLive";
import RichTextEditor from "@/components/merchant/RichTextEditor";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDemoMerchant } from "@/hooks/useDemoMerchant";
import {
  DEMO_ONBOARDING_CARD_ID,
  DEMO_ONBOARDING_CUSTOMER_ID,
  getDemoOnboardingState,
  getDemoOnboardingStep,
  isDemoOnboardingTourActive,
  setDemoOnboardingStep,
  updateDemoOnboardingState,
} from "@/lib/demoOnboardingTour";
import { calculateSuggestion, SPEND_PRESETS } from "../wizard/wizardLogic";
import { cn } from "@/lib/utils";
import { linkOrphanNfcChipsToMerchant } from "@/lib/nfcChipLinking";

const INDUSTRIES = [
  { value: "cafe", label: "Café" },
  { value: "baeckerei", label: "Bäckerei" },
  { value: "restaurant", label: "Restaurant" },
  { value: "imbiss", label: "Imbiss" },
  { value: "friseur", label: "Friseur" },
  { value: "barbershop", label: "Barbershop" },
  { value: "kosmetikstudio", label: "Kosmetikstudio" },
  { value: "shishabar", label: "Shishabar" },
  { value: "einzelhandel", label: "Einzelhandel" },
  { value: "apotheke", label: "Apotheke" },
  { value: "tankstelle", label: "Tankstelle" },
  { value: "kiosk", label: "Kiosk" },
  { value: "fitnessstudio", label: "Fitnessstudio" },
  { value: "nagelstudio", label: "Nagelstudio" },
  { value: "eisdiele", label: "Eisdiele" },
  { value: "waschsalon", label: "Waschsalon" },
  { value: "sonstiges", label: "Sonstiges" },
];

const DAYS = [
  { key: "monday", label: "Montag" },
  { key: "tuesday", label: "Dienstag" },
  { key: "wednesday", label: "Mittwoch" },
  { key: "thursday", label: "Donnerstag" },
  { key: "friday", label: "Freitag" },
  { key: "saturday", label: "Samstag" },
  { key: "sunday", label: "Sonntag" },
];

interface OpeningHours {
  [key: string]: { open: string; close: string; closed: boolean };
}

interface Reward {
  id: string;
  title: string;
  description: string | null;
  points_required: number;
  image_url: string | null;
  is_active: boolean | null;
}

interface NewCustomerOffer {
  id: string;
  title: string;
  description: string | null;
  bonus_stamps: number | null;
  is_active: boolean | null;
}

interface NfcChip {
  id: string;
  chip_uid: string;
  stamp_name: string | null;
  stamp_color: string | null;
  points_value: number | null;
  is_active: boolean | null;
}

interface CustomerBox {
  id: string;
  box_id: string;
  stamp_code: string;
  assigned_at: string;
}

// Empty opening hours by default - merchant must explicitly set them
const defaultOpeningHours: OpeningHours = {};

const formatOpeningHoursPreview = (hours: OpeningHours): string => {
  const dayNames: Record<string, string> = {
    monday: "Mo", tuesday: "Di", wednesday: "Mi",
    thursday: "Do", friday: "Fr", saturday: "Sa", sunday: "So"
  };
  
  return Object.entries(hours)
    .map(([day, h]) => {
      if (h.closed) return `${dayNames[day]}: Geschlossen`;
      return `${dayNames[day]}: ${h.open}-${h.close}`;
    })
    .join(", ");
};

const MeinGeschaeft = () => {
  const { user } = useAuth();
  const isDemo = useDemoMerchant();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("info");
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [scrollTarget, setScrollTarget] = useState<'description' | 'hours' | 'contact' | 'bottom' | null>(null);

  // Sync activeTab with ?tab= URL parameter (Sidebar Sub-Items)
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'info' || tabParam === 'karte') {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchParams({ tab }, { replace: true });
  };
  
  // Business Info
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    industry: "",
    street: "",
    house_number: "",
    postal_code: "",
    city: "",
    logo_url: "",
    cover_image_url: "",
    phone: "",
    website: "",
    instagram: "",
    facebook: "",
    twitter: "",
    opening_hours: defaultOpeningHours,
    gallery_images: [] as string[],
  });
  const [uploadingGallery, setUploadingGallery] = useState(false);

  // Rewards
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [showRewardDialog, setShowRewardDialog] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [rewardForm, setRewardForm] = useState({
    title: "",
    description: "",
    points_required: 10,
    image_url: "",
  });
  const [uploadingRewardImage, setUploadingRewardImage] = useState(false);

  // New Customer Offer
  const [newCustomerOffer, setNewCustomerOffer] = useState<NewCustomerOffer | null>(null);
  const [showNcoDialog, setShowNcoDialog] = useState(false);
  const [ncoForm, setNcoForm] = useState({
    title: "",
    description: "",
    bonus_stamps: 0,
    is_active: true,
    image_url: "",
  });
  const [uploadingNcoImage, setUploadingNcoImage] = useState(false);

  // Stamps
  const [nfcChips, setNfcChips] = useState<NfcChip[]>([]);
  const [customerBoxes, setCustomerBoxes] = useState<CustomerBox[]>([]);
  const [newBoxId, setNewBoxId] = useState('');
  const [addingBox, setAddingBox] = useState(false);
  const [savingChips, setSavingChips] = useState(false);
  const [stampMode, setStampMode] = useState<'classic' | 'revenue'>('classic');
  const [avgRevenue, setAvgRevenue] = useState(7);
  const [manualMode, setManualMode] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<'balanced' | 'umsatzboost'>('balanced');
  const [stampSettingsDirty, setStampSettingsDirty] = useState(false);
  const [initialStampState, setInitialStampState] = useState<{ stampMode: string; avgRevenue: number; manualMode: boolean; selectedVariant: string } | null>(null);
  const initialFormDataRef = useRef<typeof formData | null>(null);
  const [profileDirty, setProfileDirty] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user?.id]);

  // Track dirty state for profile info
  useEffect(() => {
    if (!initialFormDataRef.current) return;
    const isDirty = JSON.stringify(formData) !== JSON.stringify(initialFormDataRef.current);
    setProfileDirty(isDirty);
  }, [formData]);

  // Track dirty state for stamp settings
  useEffect(() => {
    if (!initialStampState) return;
    const isDirty = stampMode !== initialStampState.stampMode || avgRevenue !== initialStampState.avgRevenue || manualMode !== initialStampState.manualMode || selectedVariant !== initialStampState.selectedVariant;
    setStampSettingsDirty(isDirty);
  }, [stampMode, avgRevenue, manualMode, selectedVariant, initialStampState]);

  const loadData = async () => {
    try {
      setLoading(true);

      const { resolveMerchantCustomerId } = await import("@/lib/resolveMerchantCustomerId");
      const resolvedCustomerId = await resolveMerchantCustomerId(user?.id);

      if (!resolvedCustomerId) {
        setLoading(false);
        return;
      }

      const assignment = { customer_id: resolvedCustomerId };
      setCustomerId(resolvedCustomerId);

      if (isDemoOnboardingTourActive() && resolvedCustomerId === DEMO_ONBOARDING_CUSTOMER_ID) {
        const demo = getDemoOnboardingState();
        const p = demo.profile;
        const demoFormData = {
          name: p.company_name || p.name || "",
          description: p.description || "",
          industry: p.industry || "",
          street: p.street || "",
          house_number: p.house_number || "",
          postal_code: p.postal_code || "",
          city: p.city || "",
          logo_url: p.logo_url || "",
          cover_image_url: p.cover_image_url || "",
          phone: p.phone || "",
          website: p.website || "",
          instagram: p.instagram || "",
          facebook: p.facebook || "",
          twitter: p.twitter || "",
          opening_hours: (p.opening_hours as OpeningHours) || defaultOpeningHours,
          gallery_images: (p.gallery_images as string[]) || [],
        };
        setFormData(demoFormData);
        initialFormDataRef.current = demoFormData;
        setRewards(demo.rewards);
        setNewCustomerOffer(demo.newCustomerOffer);
        if (demo.newCustomerOffer) {
          setNcoForm({
            title: demo.newCustomerOffer.title,
            description: demo.newCustomerOffer.description || "",
            bonus_stamps: demo.newCustomerOffer.bonus_stamps || 0,
            is_active: demo.newCustomerOffer.is_active ?? true,
            image_url: demo.newCustomerOffer.image_url || "",
          });
        }
        setNfcChips(demo.chips);
        setCustomerBoxes(demo.boxes);
        const loadedStampMode = p.stamp_mode || 'revenue';
        const loadedAvgRevenue = p.avg_revenue ?? 25;
        const loadedManualMode = p.manual_stamp_mode ?? false;
        setStampMode(loadedStampMode);
        setAvgRevenue(loadedAvgRevenue);
        setManualMode(loadedManualMode);
        setInitialStampState({ stampMode: loadedStampMode, avgRevenue: loadedAvgRevenue, manualMode: loadedManualMode, selectedVariant: 'balanced' });
        setStampSettingsDirty(false);
        return;
      }

      // Load customer data
      const { data: customer } = await supabase
        .from("customers")
        .select("*")
        .eq("id", resolvedCustomerId)
        .single();
      
      if (customer) {
        setFormData({
          name: customer.company_name || customer.name || "",
          description: customer.description || "",
          industry: customer.industry || "",
          street: customer.street || "",
          house_number: customer.house_number || "",
          postal_code: customer.postal_code || "",
          city: customer.city || "",
          logo_url: customer.logo_url || "",
          cover_image_url: customer.cover_image_url || "",
          phone: customer.phone || "",
          website: customer.website || "",
          instagram: customer.instagram || "",
          facebook: customer.facebook || "",
          twitter: customer.twitter || "",
          opening_hours: (customer.opening_hours as OpeningHours) || defaultOpeningHours,
          gallery_images: ((customer as any).gallery_images as string[]) || [],
        });
        // Store initial form data for dirty tracking
        const loadedFormData = {
          name: customer.company_name || customer.name || "",
          description: customer.description || "",
          industry: customer.industry || "",
          street: customer.street || "",
          house_number: customer.house_number || "",
          postal_code: customer.postal_code || "",
          city: customer.city || "",
          logo_url: customer.logo_url || "",
          cover_image_url: customer.cover_image_url || "",
          phone: customer.phone || "",
          website: customer.website || "",
          instagram: customer.instagram || "",
          facebook: customer.facebook || "",
          twitter: customer.twitter || "",
          opening_hours: (customer.opening_hours as OpeningHours) || defaultOpeningHours,
          gallery_images: ((customer as any).gallery_images as string[]) || [],
        };
        initialFormDataRef.current = loadedFormData;
        // Restore stamp settings
        const loadedStampMode = (customer as any).stamp_mode || 'classic';
        const loadedAvgRevenue = (customer as any).avg_revenue ?? 7;
        const loadedManualMode = (customer as any).manual_stamp_mode ?? false;
        setStampMode(loadedStampMode);
        setAvgRevenue(loadedAvgRevenue);
        setManualMode(loadedManualMode);
        setInitialStampState({ stampMode: loadedStampMode, avgRevenue: loadedAvgRevenue, manualMode: loadedManualMode, selectedVariant: 'balanced' });
        setStampSettingsDirty(false);
      }

      // Load rewards
      const { data: rewardsData } = await supabase
        .from("rewards")
        .select("*")
        .eq("merchant_customer_id", assignment.customer_id)
        .order("points_required", { ascending: true });
      
      if (rewardsData) {
        setRewards(rewardsData);
      }

      // Load new customer offer
      const { data: ncoData } = await supabase
        .from("new_customer_offers")
        .select("*")
        .eq("merchant_customer_id", assignment.customer_id)
        .maybeSingle();
      
      setNewCustomerOffer(ncoData);
      if (ncoData) {
        setNcoForm({
          title: ncoData.title,
          description: ncoData.description || "",
          bonus_stamps: ncoData.bonus_stamps || 0,
          is_active: ncoData.is_active ?? true,
          image_url: ncoData.image_url || "",
        });
      }

      // Load NFC chips
      const { data: chips } = await supabase
        .from('nfc_chips')
        .select('*')
        .eq('merchant_customer_id', assignment.customer_id)
        .order('created_at', { ascending: true });

      if (chips) {
        setNfcChips(chips);
      }

      // Load boxes
      const { data: boxes } = await supabase
        .from('customer_boxes')
        .select(`id, box_id, assigned_at, boxes:box_id (stamp_id, stamp_preset)`)
        .eq('customer_id', assignment.customer_id)
        .order('assigned_at', { ascending: false });

      if (boxes) {
        const mappedBoxes: CustomerBox[] = boxes.map((b: any) => ({
          id: b.id,
          box_id: b.box_id,
          stamp_code: b.boxes?.stamp_id || 'Unbekannt',
          assigned_at: b.assigned_at
        }));
        setCustomerBoxes(mappedBoxes);
      }
    } catch (err) {
      console.error("Error:", err);
      toast.error("Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleOpeningHoursChange = (day: string, field: "open" | "close" | "closed", value: string | boolean) => {
    setFormData(prev => {
      const currentDayHours = prev.opening_hours[day] || { open: "09:00", close: "18:00", closed: false };
      return {
        ...prev,
        opening_hours: {
          ...prev.opening_hours,
          [day]: { ...currentDayHours, [field]: value },
        },
      };
    });
  };

  const handleImageUpload = async (file: File, type: "logo" | "cover") => {
    if (!customerId) return;
    
    const setUploading = type === "logo" ? setUploadingLogo : setUploadingCover;
    setUploading(true);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${customerId}/${type}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("customer-assets")
        .upload(fileName, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from("customer-assets")
        .getPublicUrl(fileName);
      
      const field = type === "logo" ? "logo_url" : "cover_image_url";
      setFormData(prev => ({ ...prev, [field]: publicUrl }));
      toast.success(`${type === "logo" ? "Logo" : "Titelbild"} hochgeladen`);
    } catch (error: any) {
      toast.error("Fehler beim Hochladen");
    } finally {
      setUploading(false);
    }
  };

  const handleGalleryUpload = async (file: File) => {
    if (!customerId) return;
    if (formData.gallery_images.length >= 5) {
      toast.error("Maximal 5 Galerie-Bilder erlaubt");
      return;
    }
    setUploadingGallery(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${customerId}/gallery_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("customer-assets")
        .upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage
        .from("customer-assets")
        .getPublicUrl(fileName);
      setFormData(prev => ({ ...prev, gallery_images: [...prev.gallery_images, publicUrl] }));
      toast.success("Bild hinzugefügt");
    } catch {
      toast.error("Fehler beim Hochladen");
    } finally {
      setUploadingGallery(false);
    }
  };

  const handleRemoveGalleryImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      gallery_images: prev.gallery_images.filter((_, i) => i !== index),
    }));
  };

  const geocodeAddress = async (street: string, houseNumber: string, postalCode: string, city: string) => {
    try {
      const { data } = await supabase.functions.invoke('geocode-address', {
        body: { street, houseNumber, postalCode, city }
      });
      return data?.lat && data?.lng ? { lat: data.lat, lng: data.lng } : null;
    } catch {
      return null;
    }
  };

  const handleSaveInfo = async () => {
    if (!customerId) return;
    
    setSaving(true);
    try {
      let coordinates = null;
      if (formData.street && formData.postal_code && formData.city) {
        coordinates = await geocodeAddress(formData.street, formData.house_number, formData.postal_code, formData.city);
      }

      const updateData: Record<string, any> = {
        name: formData.name,
        description: formData.description,
        industry: formData.industry,
        street: formData.street,
        house_number: formData.house_number,
        postal_code: formData.postal_code,
        city: formData.city,
        logo_url: formData.logo_url,
        cover_image_url: formData.cover_image_url,
        phone: formData.phone,
        website: formData.website,
        instagram: formData.instagram,
        facebook: formData.facebook,
        twitter: formData.twitter,
        opening_hours: formData.opening_hours,
        gallery_images: formData.gallery_images,
        updated_at: new Date().toISOString(),
      };

      if (coordinates) {
        updateData.latitude = coordinates.lat;
        updateData.longitude = coordinates.lng;
      }
      
      const { error } = await supabase
        .from("customers")
        .update(updateData)
        .eq("id", customerId);
      
      if (error) throw error;
      toast.success("Gespeichert!");
      initialFormDataRef.current = { ...formData };
      setProfileDirty(false);
    } catch (error: any) {
      toast.error("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  // Reward image upload handler
  const handleRewardImageUpload = async (file: File) => {
    if (!customerId) {
      toast.error("Kein Kunde zugewiesen");
      return;
    }
    
    setUploadingRewardImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${customerId}/reward_${Date.now()}.${fileExt}`;
      
      console.log("Uploading reward image:", fileName);
      
      const { error: uploadError } = await supabase.storage
        .from("customer-assets")
        .upload(fileName, file, { upsert: true });
      
      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw uploadError;
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from("customer-assets")
        .getPublicUrl(fileName);
      
      setRewardForm(prev => ({ ...prev, image_url: publicUrl }));
      toast.success("Bild hochgeladen");
    } catch (error: any) {
      console.error("Reward image upload error:", error);
      toast.error(`Fehler beim Hochladen: ${error?.message || 'Unbekannter Fehler'}`);
    } finally {
      setUploadingRewardImage(false);
    }
  };

  // Rewards handlers
  const handleSaveReward = async () => {
    if (!customerId || !rewardForm.title) {
      toast.error("Bitte Titel eingeben");
      return;
    }

    setSaving(true);
    try {
      if (editingReward) {
        const { error } = await supabase
          .from("rewards")
          .update({
            title: rewardForm.title,
            description: rewardForm.description || null,
            points_required: rewardForm.points_required,
            image_url: rewardForm.image_url || null,
          })
          .eq("id", editingReward.id);
        if (error) throw error;
        toast.success("Prämie aktualisiert");
      } else {
        const { error } = await supabase
          .from("rewards")
          .insert({
            merchant_customer_id: customerId,
            title: rewardForm.title,
            description: rewardForm.description || null,
            points_required: rewardForm.points_required,
            image_url: rewardForm.image_url || null,
            is_active: true,
          });
        if (error) throw error;
        toast.success("Prämie erstellt");
      }
      setShowRewardDialog(false);
      setEditingReward(null);
      setRewardForm({ title: "", description: "", points_required: 10, image_url: "" });
      loadData();
    } catch (error) {
      toast.error("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteReward = async (id: string) => {
    try {
      const { error } = await supabase.from("rewards").delete().eq("id", id);
      if (error) throw error;
      toast.success("Prämie gelöscht");
      loadData();
    } catch {
      toast.error("Fehler beim Löschen");
    }
  };

  // New Customer Offer handlers
  const handleSaveNco = async () => {
    if (!customerId || !ncoForm.title) {
      toast.error("Bitte Titel eingeben");
      return;
    }

    setSaving(true);
    try {
      if (newCustomerOffer) {
        const { error } = await supabase
          .from("new_customer_offers")
          .update({
            title: ncoForm.title,
            description: ncoForm.description || null,
            bonus_stamps: ncoForm.bonus_stamps,
            is_active: ncoForm.is_active,
            image_url: ncoForm.image_url || null,
          })
          .eq("id", newCustomerOffer.id);
        if (error) throw error;
        toast.success("Neukundenprämie aktualisiert");
      } else {
        const { error } = await supabase
          .from("new_customer_offers")
          .insert({
            merchant_customer_id: customerId,
            title: ncoForm.title,
            description: ncoForm.description || null,
            bonus_stamps: ncoForm.bonus_stamps,
            is_active: ncoForm.is_active,
            image_url: ncoForm.image_url || null,
          });
        if (error) throw error;
        toast.success("Neukundenprämie erstellt");
      }
      setShowNcoDialog(false);
      loadData();
    } catch {
      toast.error("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNco = async () => {
    if (!newCustomerOffer) return;
    try {
      const { error } = await supabase.from("new_customer_offers").delete().eq("id", newCustomerOffer.id);
      if (error) throw error;
      toast.success("Neukundenprämie gelöscht");
      setNewCustomerOffer(null);
      setNcoForm({ title: "", description: "", bonus_stamps: 0, is_active: true, image_url: "" });
    } catch {
      toast.error("Fehler beim Löschen");
    }
  };

  // Stamps handlers
  const handleChipChange = (chipId: string, field: keyof NfcChip, value: any) => {
    setNfcChips(chips => chips.map(chip => chip.id === chipId ? { ...chip, [field]: value } : chip));
  };

  const handleSaveChips = async () => {
    if (!customerId) return;
    
    setSavingChips(true);
    try {
      // If not manual, compute chip values from calculateSuggestion
      let chipsToSave = nfcChips;
      if (!manualMode && stampMode === 'revenue') {
        const suggestion = calculateSuggestion(avgRevenue, ['visits'], selectedVariant);
        if (suggestion.type === 'tiered' && suggestion.tiers) {
          const colorMap: Record<string, { points: number }> = {};
          const dbColorMap: Record<string, string> = { green: 'grün', blue: 'blau', red: 'rot' };
          for (const tier of suggestion.tiers) {
            const dbColor = dbColorMap[tier.color] || tier.color;
            colorMap[dbColor] = { points: tier.points };
          }
          chipsToSave = nfcChips.map(chip => {
            const color = chip.stamp_color?.toLowerCase() || '';
            if (colorMap[color]) return { ...chip, points_value: colorMap[color].points };
            return chip;
          });
        }
      }

      for (const chip of chipsToSave) {
        const { error } = await supabase
          .from('nfc_chips')
          .update({
            stamp_name: chip.stamp_name,
            stamp_color: chip.stamp_color,
            points_value: chip.points_value,
            is_active: chip.is_active
          })
          .eq('id', chip.id);
        if (error) throw error;
      }
      // Persist stamp settings to customer
      await supabase
        .from('customers')
        .update({
          stamp_mode: stampMode,
          avg_revenue: avgRevenue,
          manual_stamp_mode: manualMode,
        } as any)
        .eq('id', customerId);
      setNfcChips(chipsToSave);
      setInitialStampState({ stampMode, avgRevenue, manualMode, selectedVariant });
      setStampSettingsDirty(false);
      toast.success('Karte gespeichert');
    } catch {
      toast.error('Fehler beim Speichern');
    } finally {
      setSavingChips(false);
    }
  };

  const formatBoxIdInput = (value: string) => {
    const clean = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const parts = [];
    for (let i = 0; i < clean.length && i < 15; i += 5) {
      parts.push(clean.slice(i, i + 5));
    }
    return parts.join('-');
  };

  const createDefaultStamps = async (boxPreset: string, merchantCustomerId: string) => {
    const stampConfigs: { stamp_name: string; stamp_color: string; points_value: number }[] = [];
    
    if (boxPreset === 'standard_3') {
      stampConfigs.push(
        { stamp_name: 'Karte 1', stamp_color: 'grün', points_value: 1 },
        { stamp_name: 'Karte 2', stamp_color: 'blau', points_value: 1 },
        { stamp_name: 'Karte 3', stamp_color: 'rot', points_value: 1 }
      );
    } else if (boxPreset === 'standard_5') {
      stampConfigs.push(
        { stamp_name: 'Karte 1', stamp_color: 'grün', points_value: 1 },
        { stamp_name: 'Karte 2', stamp_color: 'blau', points_value: 1 },
        { stamp_name: 'Karte 3', stamp_color: 'rot', points_value: 1 },
        { stamp_name: 'Karte 4', stamp_color: 'gelb', points_value: 1 },
        { stamp_name: 'Karte 5', stamp_color: 'lila', points_value: 1 }
      );
    }

    for (let i = 0; i < stampConfigs.length; i++) {
      const config = stampConfigs[i];
      // Pro (merchant, color) nur EINEN Eintrag — keine Duplikate erzeugen.
      const { data: existing } = await supabase
        .from('nfc_chips')
        .select('id')
        .eq('merchant_customer_id', merchantCustomerId)
        .eq('stamp_color', config.stamp_color)
        .maybeSingle();

      if (existing) continue;

      const chipUid = `${merchantCustomerId.substring(0, 8)}-${config.stamp_color}`;
      await supabase.from('nfc_chips').insert({
        merchant_customer_id: merchantCustomerId,
        chip_uid: chipUid,
        stamp_name: config.stamp_name,
        stamp_color: config.stamp_color,
        points_value: config.points_value,
        is_active: true,
        is_default: i === 0
      });
    }
  };

  const handleAddBox = async () => {
    if (!customerId || !newBoxId.trim()) return;

    const boxIdPattern = /^[A-Za-z0-9]{5}-[A-Za-z0-9]{5}-[A-Za-z0-9]{5}$/;
    if (!boxIdPattern.test(newBoxId.trim())) {
      toast.error('Ungültiges Format: XXXXX-XXXXX-XXXXX');
      return;
    }

    setAddingBox(true);
    try {
      const { data: boxData } = await supabase
        .from('boxes')
        .select('id, stamp_id, stamp_preset')
        .eq('stamp_id', newBoxId.trim().toUpperCase())
        .maybeSingle();

      if (!boxData) {
        toast.error('Karten-ID existiert nicht');
        return;
      }

      const { data: ownAssignment } = await supabase
        .from('customer_boxes')
        .select('id')
        .eq('customer_id', customerId)
        .eq('box_id', boxData.id)
        .maybeSingle();

      if (ownAssignment) {
        toast.error('Karten-ID bereits verknüpft');
        return;
      }

      const { count } = await supabase
        .from('customer_boxes')
        .select('id', { count: 'exact', head: true })
        .eq('box_id', boxData.id);

      if (count && count > 0) {
        toast.error('Karten-ID bereits vergeben');
        return;
      }

      await supabase.from('customer_boxes').insert({ customer_id: customerId, box_id: boxData.id });

      const stampIdValue = newBoxId.trim().toUpperCase();

      // Persistiere die Karten-ID auch direkt am Händler-Datensatz
      await supabase
        .from('customers')
        .update({ stamp_id: stampIdValue })
        .eq('id', customerId);

      // Link eloyo_box if exists with this stamp_id — trigger handles status automatically
      const { data: eloyoBox } = await supabase
        .from('eloyo_boxes')
        .select('id')
        .eq('stempel_id', stampIdValue)
        .in('status', ['versendet', 'verfuegbar'])
        .maybeSingle();

      if (eloyoBox) {
        await supabase.from('eloyo_boxes').update({
          haendler_id: customerId,
        }).eq('id', eloyoBox.id);
      }

      // Immer: bereits registrierte Hardware-Chips mit diesem Händler verknüpfen,
      // unabhängig davon, ob ein eloyo_boxes-Eintrag existiert.
      await linkOrphanNfcChipsToMerchant(stampIdValue, customerId);

      await createDefaultStamps(boxData.stamp_preset || 'standard_3', customerId);

      toast.success('Karten-ID hinzugefügt');
      setNewBoxId('');
      loadData();
    } catch {
      toast.error('Fehler');
    } finally {
      setAddingBox(false);
    }
  };

  const getColorBadge = (color: string | null) => {
    const colorMap: Record<string, string> = {
      'grün': 'bg-green-500', 'green': 'bg-green-500',
      'blau': 'bg-blue-500', 'blue': 'bg-blue-500',
      'rot': 'bg-red-500', 'red': 'bg-red-500',
      'gelb': 'bg-yellow-500', 'yellow': 'bg-yellow-500',
      'lila': 'bg-purple-500', 'purple': 'bg-purple-500',
    };
    return colorMap[color?.toLowerCase() || ''] || 'bg-gray-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!customerId) {
    return (
      <div className="min-h-screen bg-white p-8">
        <div className="text-center py-12">
          <Store className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Kein Geschäft zugewiesen</h2>
          <p className="text-muted-foreground">Bitte kontaktiere support@eloyo.de</p>
        </div>
      </div>
    );
  }

  const handleDiscardChanges = () => {
    if (initialFormDataRef.current) {
      setFormData(initialFormDataRef.current);
      toast.info("Änderungen verworfen");
    }
  };

  const handleDiscardStampChanges = () => {
    if (initialStampState) {
      setStampMode(initialStampState.stampMode as 'classic' | 'revenue');
      setAvgRevenue(initialStampState.avgRevenue);
      setManualMode(initialStampState.manualMode);
      setSelectedVariant(initialStampState.selectedVariant as 'balanced' | 'umsatzboost');
      toast.info("Änderungen verworfen");
    }
  };

  const showSaveBar = (activeTab === 'info' && profileDirty) || (activeTab === 'karte' && stampSettingsDirty);

  return (
    <div className="min-h-screen pb-24">
      <div className="w-full mx-auto px-6 sm:px-10 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Content - LEFT column (fields) */}
          <div className="lg:col-span-7 order-2 lg:order-1">
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="hidden">
                <TabsTrigger value="info" />
                <TabsTrigger value="karte" />
              </TabsList>


              {/* Info Tab */}
              <TabsContent value="info" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                {/* Section 1: Bilder — kompakt */}
                <Card className="rounded-xl border border-border/60 bg-white p-5 shadow-sm h-full flex flex-col">
                  <div className="flex items-center gap-2 mb-4">
                    <ImageLucide className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">Bilder</h3>
                  </div>

                  <div className="grid grid-cols-[80px_1fr] gap-4 items-start">
                    {/* Logo */}
                    <div>
                      <Label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">Logo</Label>
                      <label className="group relative w-20 h-20 rounded-xl bg-muted/40 border border-border overflow-hidden flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors block">
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImageUpload(file, "logo"); }} />
                        {formData.logo_url ? (
                          <img src={formData.logo_url} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-muted-foreground/50" />
                        )}
                        {uploadingLogo && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <Loader2 className="w-5 h-5 text-white animate-spin" />
                          </div>
                        )}
                      </label>
                    </div>

                    {/* Cover — kompakt, max-Höhe 120px */}
                    <div>
                      <Label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">Titelbild</Label>
                      <label className="group relative w-full h-[120px] rounded-xl bg-muted/40 border border-border overflow-hidden flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors block">
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImageUpload(file, "cover"); }} />
                        {formData.cover_image_url ? (
                          <img src={formData.cover_image_url} alt="Titelbild" className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-muted-foreground/60">
                            <ImageIcon className="w-5 h-5" />
                            <span className="text-[11px]">Titelbild hochladen</span>
                          </div>
                        )}
                        {uploadingCover && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <Loader2 className="w-5 h-5 text-white animate-spin" />
                          </div>
                        )}
                      </label>
                    </div>
                  </div>

                  {/* Galerie — kompakt */}
                  <div className="mt-4 pt-4 border-t border-border/60">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-semibold text-foreground">Weitere Bilder (Slideshow)</h4>
                      <span className="text-[11px] text-muted-foreground">{formData.gallery_images.length}/5</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.gallery_images.map((url, i) => (
                        <div key={i} className="relative group w-[72px] h-[54px] rounded-lg overflow-hidden border border-border bg-muted/40">
                          <img src={url} alt={`Galerie ${i + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemoveGalleryImage(i)}
                            className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                      {formData.gallery_images.length < 5 && (
                        <label className="w-[72px] h-[54px] rounded-lg border-2 border-dashed border-border bg-muted/30 hover:border-primary/50 hover:bg-primary/5 flex items-center justify-center cursor-pointer transition-colors">
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleGalleryUpload(file); }} />
                          {uploadingGallery ? (
                            <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                          ) : (
                            <Plus className="w-4 h-4 text-muted-foreground/60" />
                          )}
                        </label>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Section 2: Geschäftsinfos + Adresse kombiniert */}
                <Card className="rounded-xl border border-border/60 bg-white p-5 shadow-sm h-full flex flex-col">
                  <div className="flex items-center gap-2 mb-4">
                    <Store className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">Geschäftsinformationen</h3>
                  </div>
                  <div className="space-y-3 flex-1">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">Geschäftsname *</Label>
                        <Input value={formData.name} onChange={(e) => handleInputChange("name", e.target.value)} placeholder="z.B. Café Sonnenschein" className="h-9 rounded-lg bg-slate-50 border-slate-300 focus-visible:border-primary focus-visible:ring-primary/30 text-foreground placeholder:text-slate-400" />
                      </div>
                      <div>
                        <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">Branche</Label>
                        <Select value={formData.industry} onValueChange={(value) => handleInputChange("industry", value)}>
                          <SelectTrigger className="h-9 rounded-lg bg-slate-50 border-slate-300 focus-visible:border-primary focus-visible:ring-primary/30 text-foreground"><SelectValue placeholder="Branche auswählen" /></SelectTrigger>
                          <SelectContent>{INDUSTRIES.map((ind) => (<SelectItem key={ind.value} value={ind.value}>{ind.label}</SelectItem>))}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    {/* Adresse — Zeile 1: Straße + Nr. */}
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-9">
                        <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">Straße</Label>
                        <Input value={formData.street} onChange={(e) => handleInputChange("street", e.target.value)} placeholder="Hauptstraße" className="h-9 rounded-lg bg-slate-50 border-slate-300 focus-visible:border-primary focus-visible:ring-primary/30 text-foreground placeholder:text-slate-400" />
                      </div>
                      <div className="col-span-3">
                        <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">Nr.</Label>
                        <Input value={formData.house_number} onChange={(e) => handleInputChange("house_number", e.target.value)} placeholder="12" className="h-9 rounded-lg bg-slate-50 border-slate-300 focus-visible:border-primary focus-visible:ring-primary/30 text-foreground placeholder:text-slate-400" />
                      </div>
                    </div>
                    {/* Adresse — Zeile 2: PLZ + Ort */}
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-4">
                        <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">PLZ</Label>
                        <Input value={formData.postal_code} onChange={(e) => handleInputChange("postal_code", e.target.value)} placeholder="12345" className="h-9 rounded-lg bg-slate-50 border-slate-300 focus-visible:border-primary focus-visible:ring-primary/30 text-foreground placeholder:text-slate-400" />
                      </div>
                      <div className="col-span-8">
                        <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">Ort</Label>
                        <Input value={formData.city} onChange={(e) => handleInputChange("city", e.target.value)} placeholder="Berlin" className="h-9 rounded-lg bg-slate-50 border-slate-300 focus-visible:border-primary focus-visible:ring-primary/30 text-foreground placeholder:text-slate-400" />
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Spalte links: Beschreibung + Kontakt */}
                <div className="space-y-4 h-full flex flex-col">
                {/* Section 3: Beschreibung */}
                <Card className="rounded-xl border border-border/60 bg-white p-5 shadow-sm flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Edit2 className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-semibold text-foreground">Beschreibung</h3>
                    </div>
                    <span className="text-[11px] text-muted-foreground">{formData.description?.length || 0} Zeichen</span>
                  </div>
                  <RichTextEditor
                    value={formData.description}
                    onChange={(value) => handleInputChange("description", value)}
                    placeholder="Erzähle etwas über dein Geschäft..."
                    rows={7}
                  />
                  <div className="mt-3">
                    <p className="text-[11px] text-muted-foreground mb-1.5 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Vorlagen einfügen:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: "👋 Willkommen", text: `Herzlich willkommen bei ${formData.name || "uns"}! Wir freuen uns auf deinen Besuch und darauf, dich mit unseren Lieblingsprodukten zu verwöhnen. ✨` },
                        { label: "🎁 Treue belohnt", text: "Bei uns lohnt sich jeder Besuch: Sammle Punkte, sichere dir tolle Prämien und genieße exklusive Vorteile als Stammgast. 💜" },
                        { label: "🤝 Freunde einladen", text: `Lade 2 Freunde ein, die noch nie bei uns waren — und du hast direkt genug Punkte für eine tolle Prämie! 🎁` },
                        { label: "⭐ Qualität", text: "Mit Liebe zum Detail und höchsten Qualitätsansprüchen sorgen wir dafür, dass jeder Besuch zu einem kleinen Highlight wird." },
                        { label: "📍 Zentral", text: `Du findest uns zentral gelegen${formData.city ? ` in ${formData.city}` : ""} — perfekt für einen kurzen Stopp. Wir freuen uns auf dich!` },
                      ].map((tpl) => (
                        <Button
                          key={tpl.label}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const current = formData.description?.trim() || "";
                            const next = current ? `${current}\n\n${tpl.text}` : tpl.text;
                            handleInputChange("description", next);
                          }}
                          className="h-7 px-2.5 text-xs rounded-lg bg-slate-100 border-slate-300 hover:bg-primary/10 hover:border-primary/50 hover:text-primary transition-colors"
                        >
                          {tpl.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </Card>

                {/* Section 5 (in linke Spalte verschoben): Kontakt & Links */}
                <Card className="rounded-xl border border-border/60 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Globe className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">Kontakt & Links</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={formData.phone}
                        onChange={(e) => handleInputChange("phone", e.target.value)}
                        onFocus={() => setScrollTarget('contact')}
                        placeholder="Telefon"
                        className="h-9 pl-10 rounded-lg bg-slate-50 border-slate-300 focus-visible:border-primary focus-visible:ring-primary/30 text-foreground placeholder:text-slate-400"
                      />
                    </div>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={formData.website}
                        onChange={(e) => handleInputChange("website", e.target.value)}
                        onFocus={() => setScrollTarget('contact')}
                        placeholder="Website"
                        className="h-9 pl-10 rounded-lg bg-slate-50 border-slate-300 focus-visible:border-primary focus-visible:ring-primary/30 text-foreground placeholder:text-slate-400"
                      />
                    </div>
                    <div className="relative flex items-stretch rounded-lg bg-slate-50 border border-slate-300 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30 h-9 overflow-hidden">
                      <div className="flex items-center gap-1.5 pl-3 pr-2 text-xs text-muted-foreground bg-slate-100 border-r border-slate-300 select-none whitespace-nowrap">
                        <Instagram className="w-4 h-4" />
                        <span>instagram.com/</span>
                      </div>
                      <input
                        value={(formData.instagram || "").replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@/, "")}
                        onChange={(e) => {
                          const handle = e.target.value.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@/, "").trim();
                          handleInputChange("instagram", handle ? `https://www.instagram.com/${handle}` : "");
                        }}
                        onFocus={() => setScrollTarget('contact')}
                        placeholder="dein-name"
                        className="flex-1 px-2 bg-transparent outline-none text-sm text-foreground placeholder:text-slate-400"
                      />
                    </div>
                    <div className="relative">
                      <Facebook className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={formData.facebook}
                        onChange={(e) => handleInputChange("facebook", e.target.value)}
                        onFocus={() => setScrollTarget('contact')}
                        placeholder="Facebook-URL"
                        className="h-9 pl-10 rounded-lg bg-slate-50 border-slate-300 focus-visible:border-primary focus-visible:ring-primary/30 text-foreground placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                </Card>
                </div>
                {/* Ende linke Spalte (Beschreibung + Kontakt) */}

                {/* Section 4: Öffnungszeiten — kompakt 2-spaltig (rechte Spalte) */}
                <Card className="rounded-xl border border-border/60 bg-white p-5 shadow-sm h-full flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-semibold text-foreground">Öffnungszeiten</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground">Anzeigen</span>
                      <Switch
                        checked={Object.keys(formData.opening_hours).length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            const defaultHours: OpeningHours = {};
                            DAYS.forEach(day => {
                              defaultHours[day.key] = { open: "09:00", close: "18:00", closed: false };
                            });
                            setFormData(prev => ({ ...prev, opening_hours: defaultHours }));
                          } else {
                            setFormData(prev => ({ ...prev, opening_hours: {} }));
                          }
                        }}
                      />
                    </div>
                  </div>
                  {Object.keys(formData.opening_hours).length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                      {DAYS.map((day) => {
                        const closed = formData.opening_hours[day.key]?.closed || false;
                        return (
                          <div key={day.key} className="flex items-center gap-2 py-0.5">
                            <div className="w-10 text-xs font-medium text-foreground">{day.label.slice(0, 2)}</div>
                            {!closed ? (
                              <div className="flex items-center gap-1 flex-1">
                                <Input type="time" value={formData.opening_hours[day.key]?.open || "09:00"} onChange={(e) => handleOpeningHoursChange(day.key, "open", e.target.value)} className="h-8 px-2 text-xs rounded-md bg-slate-50 border-slate-300 focus-visible:border-primary focus-visible:ring-primary/30 text-foreground flex-1" />
                                <span className="text-muted-foreground text-[11px]">–</span>
                                <Input type="time" value={formData.opening_hours[day.key]?.close || "18:00"} onChange={(e) => handleOpeningHoursChange(day.key, "close", e.target.value)} className="h-8 px-2 text-xs rounded-md bg-slate-50 border-slate-300 focus-visible:border-primary focus-visible:ring-primary/30 text-foreground flex-1" />
                              </div>
                            ) : (
                              <div className="flex-1 text-[11px] text-muted-foreground italic">Geschlossen</div>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpeningHoursChange(day.key, "closed", !closed)}
                              className={cn(
                                "text-[10px] px-2 py-1 rounded-md font-medium transition-colors",
                                closed
                                  ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                                  : "bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200"
                              )}
                            >
                              {closed ? "Zu" : "Auf"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      Öffnungszeiten sind deaktiviert.
                    </p>
                  )}
                </Card>
                </div>
                {/* Ende 2-spaltiges Profil-Grid */}
              </TabsContent>

                {/* Karte Tab - 2-spaltiges Layout wie Profil */}
              <TabsContent value="karte" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                {/* LINKS: Automatisches Karten-System */}
                <Card className="rounded-2xl shadow-sm border-0 bg-muted/40">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-3 text-lg font-semibold">
                        <span className="text-lg">⚙️</span>
                        Automatisches Karten-System
                        <Badge variant="outline" className={cn("text-xs", !manualMode ? "bg-emerald-50 text-emerald-700 border-emerald-300" : "bg-muted text-muted-foreground")}>
                          {!manualMode ? "aktiviert" : "deaktiviert"}
                        </Badge>
                      </CardTitle>
                      <Switch
                        checked={!manualMode}
                        onCheckedChange={(checked) => setManualMode(!checked)}
                      />
                    </div>
                  </CardHeader>
                  {!manualMode && (
                    <CardContent className="space-y-6">
                      <div>
                        <p className="text-sm text-muted-foreground mb-4">
                          Wie viel gibt ein Kunde bei dir im Durchschnitt pro Besuch aus?
                        </p>



                        {/* Slider */}
                        <div className="space-y-3">
                          <div className="text-center">
                            <div className="bg-primary/10 border border-primary/30 rounded-full px-4 py-1.5 inline-block">
                              <span className="text-lg font-bold text-primary">
                                ca. {avgRevenue} €
                              </span>
                            </div>
                          </div>
                          <Slider
                            min={3}
                            max={200}
                            step={1}
                            value={[avgRevenue]}
                            onValueChange={(val) => {
                              setAvgRevenue(val[0]);
                              setStampMode('revenue');
                            }}
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>3 €</span>
                            <span>200 €</span>
                          </div>

                          {stampSettingsDirty && (
                            <Button onClick={handleSaveChips} disabled={savingChips} className="rounded-xl w-full animate-pulse">
                              {savingChips ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                              Karte speichern
                            </Button>
                          )}
                        </div>

                        {/* Variant selector */}
                        {stampMode === 'revenue' && (
                          <div className="flex gap-2 mt-4">
                            <button
                              type="button"
                              onClick={() => setSelectedVariant('balanced')}
                              className={cn(
                                "flex-1 py-2.5 px-3 rounded-lg border-2 text-sm font-medium transition-all",
                                selectedVariant === 'balanced'
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border text-muted-foreground hover:border-primary/40"
                              )}
                            >
                              ⚖️ Ausgewogen
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedVariant('umsatzboost')}
                              className={cn(
                                "flex-1 py-2.5 px-3 rounded-lg border-2 text-sm font-medium transition-all",
                                selectedVariant === 'umsatzboost'
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border text-muted-foreground hover:border-primary/40"
                              )}
                            >
                              🚀 Umsatzboost
                            </button>
                          </div>
                        )}

                        {/* Threshold display using calculateSuggestion */}
                        {stampMode === 'revenue' && (() => {
                          const suggestion = calculateSuggestion(avgRevenue, ['visits'], selectedVariant);
                          return suggestion.type === 'tiered' && suggestion.tiers ? (
                            <>
                              {/* Tier cards */}
                              <div className="grid grid-cols-3 gap-3 mt-4">
                                {suggestion.tiers.map((tier) => {
                                  const colorStyles: Record<string, string> = {
                                    green: "bg-emerald-50 border-emerald-300 text-emerald-700",
                                    blue: "bg-blue-50 border-blue-300 text-blue-700",
                                    red: "bg-red-50 border-red-300 text-red-700",
                                  };
                                  const stampColor: Record<string, string> = {
                                    green: "text-emerald-500",
                                    blue: "text-blue-500",
                                    red: "text-red-500",
                                  };
                                  return (
                                    <div
                                      key={tier.label}
                                      className={cn("rounded-xl border-2 p-4 text-center", colorStyles[tier.color])}
                                    >
                                      <Nfc className={cn("h-8 w-8 mx-auto mb-2", stampColor[tier.color])} />
                                      <p className="font-bold text-base">{tier.label}</p>
                                      <p className="text-sm mt-1">ab {tier.threshold} €</p>
                                      <p className="text-xl font-bold mt-1">{tier.points} Pkt.</p>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Example purchases */}
                              <div className="bg-muted/50 rounded-lg p-4 border border-border mt-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <Info className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm font-medium text-foreground">Beispiel-Einkäufe</span>
                                </div>
                                <div className="space-y-2">
                                  {[avgRevenue * 0.5, avgRevenue * 0.8, avgRevenue * 1.3, avgRevenue * 2.8].map((amt) => {
                                    const formatted = amt.toFixed(2).replace(".", ",");
                                    let label = "Kein Karte";
                                    const tiers = suggestion.tiers!;
                                    for (let i = tiers.length - 1; i >= 0; i--) {
                                      if (amt >= tiers[i].threshold) {
                                        label = `${tiers[i].label} (${tiers[i].points} Pkt.)`;
                                        break;
                                      }
                                    }
                                    return (
                                      <div key={amt} className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Einkauf: {formatted} €</span>
                                        <span className={cn("font-medium", label === "Kein Karte" ? "text-muted-foreground" : "text-foreground")}>
                                          → {label}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </>
                          ) : null;
                        })()}
                      </div>
                    </CardContent>
                  )}
                </Card>

                {/* Manuelles Karten-System */}
                <Card className="rounded-2xl shadow-sm border-0 bg-muted/40">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-3 text-lg font-semibold">
                        <span className="text-lg">🔖</span>
                        Manuelles Karten-System
                        <Badge variant="outline" className={cn("text-xs", manualMode ? "bg-emerald-50 text-emerald-700 border-emerald-300" : "bg-muted text-muted-foreground")}>
                          {manualMode ? "aktiviert" : "deaktiviert"}
                        </Badge>
                      </CardTitle>
                      <Switch
                        checked={manualMode}
                        onCheckedChange={setManualMode}
                      />
                    </div>
                  </CardHeader>
                  {manualMode && nfcChips.length > 0 && (
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">Punktzahl pro Karte selbst festlegen</p>
                      {(() => {
                        // Eindeutige Karten nach stamp_color, sortiert in fixer Reihenfolge: grün → blau → rot → andere
                        const order = ['grün', 'gruen', 'green', 'blau', 'blue', 'rot', 'red', 'gelb', 'yellow', 'lila', 'purple', 'orange'];
                        const seen = new Set<string>();
                        const unique = nfcChips.filter((chip) => {
                          const color = chip.stamp_color?.toLowerCase() || '';
                          if (seen.has(color)) return false;
                          seen.add(color);
                          return true;
                        }).sort((a, b) => {
                          const ai = order.indexOf((a.stamp_color || '').toLowerCase());
                          const bi = order.indexOf((b.stamp_color || '').toLowerCase());
                          return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
                        });
                        return unique.map((chip, idx) => (
                          <div key={chip.id} className="flex items-center gap-4 p-4 bg-background rounded-xl border-2 border-border shadow-sm">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 shadow-sm flex-shrink-0 flex items-center justify-center">
                              <span className="text-white font-bold text-sm">{idx + 1}</span>
                            </div>
                            <div className="flex-1 grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-xs text-muted-foreground">Karte</Label>
                                <p className="text-sm font-medium text-foreground mt-1">Karte {idx + 1}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Punkte</Label>
                                <Input
                                  type="number"
                                  min={1}
                                  value={chip.points_value || 1}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value) || 1;
                                    const color = chip.stamp_color?.toLowerCase() || '';
                                    setNfcChips(chips => chips.map(c =>
                                      c.stamp_color?.toLowerCase() === color ? { ...c, points_value: val } : c
                                    ));
                                  }}
                                  className="h-8 w-20 mt-1 bg-background border-2 border-primary/30 font-bold text-foreground"
                                />
                              </div>
                            </div>
                          </div>
                        ));
                      })()}

                      <Button onClick={handleSaveChips} disabled={savingChips} className="rounded-xl w-full animate-pulse">
                        {savingChips ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        Karte speichern
                      </Button>
                    </CardContent>
                  )}
                </Card>

                {/* RECHTE SPALTE: Karten-IDs + Prämien */}
                <div className="flex flex-col gap-4">
                {/* Karten-IDs */}
                <Card className="rounded-2xl shadow-sm border-0 bg-gray-50/80">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Package className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-semibold text-gray-900">Karten-ID</CardTitle>
                        <CardDescription className="text-gray-500">Verknüpfen Sie Ihre Karten-ID</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {customerBoxes.length > 0 && (
                      <div className="space-y-3">
                        {customerBoxes.map((box) => (
                          <div key={box.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100">
                            <code className="font-mono text-sm font-semibold text-gray-900">{box.stamp_code}</code>
                            <span className="text-xs text-gray-500">Hinzugefügt: {new Date(box.assigned_at).toLocaleDateString('de-DE')}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-3">
                      <Input
                        value={newBoxId}
                        onChange={(e) => setNewBoxId(formatBoxIdInput(e.target.value))}
                        placeholder="XXXXX-XXXXX-XXXXX"
                        className="font-mono rounded-xl"
                        maxLength={17}
                      />
                      <Button onClick={handleAddBox} disabled={addingBox || !newBoxId.trim()} className="rounded-xl">
                        {addingBox ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Prämien-Schnellzugriff */}
                <Card className="rounded-2xl shadow-sm border-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
                  <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center">
                      <Gift className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Verwalte deine Prämien</p>
                      <p className="text-sm text-muted-foreground">Lege fest, wofür Kunden ihre Punkte einlösen können</p>
                    </div>
                    <Button
                      onClick={() => navigate('/kunde/marketing?tab=praemien')}
                      className="rounded-xl gap-2"
                      size="lg"
                    >
                      <Gift className="h-4 w-4" />
                      Zu deinen Prämien
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
                </div>
                {/* Ende rechte Spalte */}
                </div>
                {/* Ende 2-spaltiges Karte-Grid */}
              </TabsContent>
            </Tabs>
          </div>

          {/* Phone Preview - RIGHT column, sticky, größer */}
          <div className="lg:col-span-5 order-1 lg:order-2">
            <div className="sticky top-6 pt-16">
              <div className="flex justify-center">
                <div className="scale-[1.3] origin-top">
                  <PhoneFrame>
                    <MerchantPreviewLive 
                      data={{
                        name: formData.name || "Geschäftsname",
                        description: formData.description,
                        logo_url: formData.logo_url,
                        cover_image_url: formData.cover_image_url,
                        street: formData.street,
                        house_number: formData.house_number,
                        postal_code: formData.postal_code,
                        city: formData.city,
                        phone: formData.phone,
                        website: formData.website,
                        instagram: formData.instagram,
                        facebook: formData.facebook,
                        twitter: formData.twitter,
                        opening_hours: formData.opening_hours,
                      }}
                      rewards={rewards}
                      activeTab={activeTab === 'info' ? 'info' : 'rewards'}
                      onTabChange={(tab) => setActiveTab(tab === 'info' ? 'info' : 'karte')}
                      userPoints={25}
                      scrollTarget={scrollTarget}
                    />
                  </PhoneFrame>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Save Bar — taucht nur auf bei Änderungen */}
        {showSaveBar && (
          <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom-4 duration-200">
            <div className="bg-white/95 backdrop-blur-md border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
              <div className="w-full mx-auto px-6 sm:px-10 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full animate-pulse", isDemo ? "bg-amber-500" : "bg-amber-500")} />
                  <span className="text-sm font-medium text-foreground">
                    {isDemo ? "Demo-Modus: Änderungen werden nicht gespeichert" : "Du hast ungespeicherte Änderungen"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    onClick={activeTab === 'info' ? handleDiscardChanges : handleDiscardStampChanges}
                    disabled={saving || savingChips}
                    className="rounded-lg"
                  >
                    Verwerfen
                  </Button>
                  <Button
                    onClick={activeTab === 'info' ? handleSaveInfo : handleSaveChips}
                    disabled={saving || savingChips}
                    className="rounded-lg bg-primary hover:bg-primary/90"
                  >
                    {(saving || savingChips) ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Änderungen speichern
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* Reward Dialog */}
        <Dialog open={showRewardDialog} onOpenChange={setShowRewardDialog}>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>{editingReward ? "Prämie bearbeiten" : "Neue Prämie"}</DialogTitle>
              <DialogDescription>Erstellen oder bearbeiten Sie eine Prämie für Ihre Kunden</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Titel *</Label>
                <Input value={rewardForm.title} onChange={(e) => setRewardForm(f => ({ ...f, title: e.target.value }))} placeholder="z.B. Gratis Kaffee" className="rounded-xl" />
              </div>
              <div>
                <Label>Beschreibung</Label>
                <Textarea value={rewardForm.description} onChange={(e) => setRewardForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional" className="rounded-xl" rows={2} />
              </div>
              <div>
                <Label>Benötigte Punkte</Label>
                <Input type="number" min={1} value={rewardForm.points_required} onChange={(e) => setRewardForm(f => ({ ...f, points_required: parseInt(e.target.value) || 10 }))} className="rounded-xl w-32" />
              </div>
              <div>
                <Label>Bild (optional)</Label>
                <div className="flex items-center gap-3 mt-1">
                  {rewardForm.image_url ? (
                    <div className="flex items-center gap-3">
                      <img src={rewardForm.image_url} alt="Prämie" className="w-16 h-16 rounded-xl object-cover" />
                      <div className="flex flex-col gap-1">
                        <label className="cursor-pointer text-sm text-primary hover:underline">
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleRewardImageUpload(file); }} />
                          {uploadingRewardImage ? "Hochladen..." : "Ändern"}
                        </label>
                        <button type="button" onClick={() => setRewardForm(f => ({ ...f, image_url: "" }))} className="text-sm text-destructive hover:underline text-left">
                          Entfernen
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-primary/50 transition-colors flex-1">
                      <label className="cursor-pointer block">
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleRewardImageUpload(file); }} />
                        <Gift className="w-6 h-6 mx-auto text-gray-400 mb-1" />
                        <span className="text-sm text-gray-500">{uploadingRewardImage ? "Hochladen..." : "Bild hochladen"}</span>
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRewardDialog(false)} className="rounded-xl">Abbrechen</Button>
              <Button onClick={handleSaveReward} disabled={saving} className="rounded-xl">
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Speichern
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* NCO Dialog */}
        <Dialog open={showNcoDialog} onOpenChange={setShowNcoDialog}>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>{newCustomerOffer ? "Neukundenprämie bearbeiten" : "Neukundenprämie erstellen"}</DialogTitle>
              <DialogDescription>Diese Prämie wird nur neuen Kunden angezeigt</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Titel *</Label>
                <Input value={ncoForm.title} onChange={(e) => setNcoForm(f => ({ ...f, title: e.target.value }))} placeholder="z.B. Willkommensbonus" className="rounded-xl" />
              </div>
              <div>
                <Label>Beschreibung</Label>
                <Textarea value={ncoForm.description} onChange={(e) => setNcoForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional" className="rounded-xl" rows={2} />
              </div>
              
              <div>
                <Label>Bild (optional)</Label>
                <p className="text-xs text-muted-foreground mb-2">Wird im Feed angezeigt. Ohne Bild wird das Titelbild verwendet.</p>
                {ncoForm.image_url ? (
                  <div className="flex items-center gap-3">
                    <img src={ncoForm.image_url} alt="Vorschau" className="w-20 h-20 rounded-xl object-cover" />
                    <div className="flex flex-col gap-1">
                      <label className="cursor-pointer text-sm text-primary hover:underline">
                        <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file || !customerId) return;
                          setUploadingNcoImage(true);
                          try {
                            const fileExt = file.name.split('.').pop();
                            const fileName = `${customerId}/nco_${Date.now()}.${fileExt}`;
                            const { error: uploadError } = await supabase.storage.from("customer-assets").upload(fileName, file, { upsert: true });
                            if (uploadError) throw uploadError;
                            const { data: { publicUrl } } = supabase.storage.from("customer-assets").getPublicUrl(fileName);
                            setNcoForm(f => ({ ...f, image_url: publicUrl }));
                            toast.success("Bild hochgeladen");
                          } catch (err: any) {
                            toast.error(`Fehler: ${err?.message || 'Unbekannt'}`);
                          } finally {
                            setUploadingNcoImage(false);
                          }
                        }} />
                        {uploadingNcoImage ? "Hochladen..." : "Ändern"}
                      </label>
                      <button type="button" onClick={() => setNcoForm(f => ({ ...f, image_url: "" }))} className="text-sm text-destructive hover:underline text-left">Entfernen</button>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-muted rounded-xl p-4 text-center hover:border-primary/50 transition-colors">
                    <label className="cursor-pointer block">
                      <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !customerId) return;
                        setUploadingNcoImage(true);
                        try {
                          const fileExt = file.name.split('.').pop();
                          const fileName = `${customerId}/nco_${Date.now()}.${fileExt}`;
                          const { error: uploadError } = await supabase.storage.from("customer-assets").upload(fileName, file, { upsert: true });
                          if (uploadError) throw uploadError;
                          const { data: { publicUrl } } = supabase.storage.from("customer-assets").getPublicUrl(fileName);
                          setNcoForm(f => ({ ...f, image_url: publicUrl }));
                          toast.success("Bild hochgeladen");
                        } catch (err: any) {
                          toast.error(`Fehler: ${err?.message || 'Unbekannt'}`);
                        } finally {
                          setUploadingNcoImage(false);
                        }
                      }} />
                      <ImageIcon className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
                      <span className="text-sm text-muted-foreground">{uploadingNcoImage ? "Hochladen..." : "Bild hochladen"}</span>
                    </label>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNcoDialog(false)} className="rounded-xl">Abbrechen</Button>
              <Button onClick={handleSaveNco} disabled={saving} className="rounded-xl">
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

export default MeinGeschaeft;