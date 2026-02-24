import { useState, useEffect } from "react";
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
  Clock, Store, Gift, Info, UserPlus, Plus, Trash2, Edit2, Loader2, Package, ImageIcon
} from "lucide-react";
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

const INDUSTRIES = [
  { value: "cafe", label: "Café" },
  { value: "restaurant", label: "Restaurant" },
  { value: "shishabar", label: "Shishabar" },
  { value: "cbd-shop", label: "CBD-Shop" },
  { value: "baeckerei", label: "Bäckerei" },
  { value: "fashion-store", label: "Fashion Store" },
  { value: "barbershop", label: "Barbershop" },
  { value: "apotheke", label: "Apotheke" },
  { value: "supermarkt", label: "Supermarkt" },
  { value: "reformhaus", label: "Reformhaus" },
  { value: "vegan-restaurant", label: "Veganes Restaurant" },
  { value: "lieferservice", label: "Lieferservice" },
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
  box_code: string;
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("praemien");
  const [scrollTarget, setScrollTarget] = useState<'description' | 'hours' | 'contact' | 'bottom' | null>(null);
  
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
  });

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

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user?.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const { data: assignment } = await supabase
        .from("merchant_assignments")
        .select("customer_id")
        .eq("merchant_user_id", user?.id)
        .maybeSingle();
      
      if (!assignment?.customer_id) {
        setLoading(false);
        return;
      }
      
      setCustomerId(assignment.customer_id);
      
      // Load customer data
      const { data: customer } = await supabase
        .from("customers")
        .select("*")
        .eq("id", assignment.customer_id)
        .single();
      
      if (customer) {
        setFormData({
          name: customer.name || "",
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
        });
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
        .select(`id, box_id, assigned_at, boxes:box_id (box_id, stamp_preset)`)
        .eq('customer_id', assignment.customer_id)
        .order('assigned_at', { ascending: false });

      if (boxes) {
        const mappedBoxes: CustomerBox[] = boxes.map((b: any) => ({
          id: b.id,
          box_id: b.box_id,
          box_code: b.boxes?.box_id || 'Unbekannt',
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
      for (const chip of nfcChips) {
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
      toast.success('Stempel gespeichert');
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
        { stamp_name: 'Stempel 1', stamp_color: 'grün', points_value: 1 },
        { stamp_name: 'Stempel 2', stamp_color: 'blau', points_value: 1 },
        { stamp_name: 'Stempel 3', stamp_color: 'rot', points_value: 1 }
      );
    } else if (boxPreset === 'standard_5') {
      stampConfigs.push(
        { stamp_name: 'Stempel 1', stamp_color: 'grün', points_value: 1 },
        { stamp_name: 'Stempel 2', stamp_color: 'blau', points_value: 1 },
        { stamp_name: 'Stempel 3', stamp_color: 'rot', points_value: 1 },
        { stamp_name: 'Stempel 4', stamp_color: 'gelb', points_value: 1 },
        { stamp_name: 'Stempel 5', stamp_color: 'lila', points_value: 1 }
      );
    }

    for (let i = 0; i < stampConfigs.length; i++) {
      const config = stampConfigs[i];
      const chipUid = `${merchantCustomerId.substring(0, 8)}-${i + 1}`;
      
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
        .select('id, box_id, stamp_preset')
        .eq('box_id', newBoxId.trim().toUpperCase())
        .maybeSingle();

      if (!boxData) {
        toast.error('Box-ID existiert nicht');
        return;
      }

      const { data: ownAssignment } = await supabase
        .from('customer_boxes')
        .select('id')
        .eq('customer_id', customerId)
        .eq('box_id', boxData.id)
        .maybeSingle();

      if (ownAssignment) {
        toast.error('Box bereits verknüpft');
        return;
      }

      const { count } = await supabase
        .from('customer_boxes')
        .select('id', { count: 'exact', head: true })
        .eq('box_id', boxData.id);

      if (count && count > 0) {
        toast.error('Box bereits vergeben');
        return;
      }

      await supabase.from('customer_boxes').insert({ customer_id: customerId, box_id: boxData.id });
      await createDefaultStamps(boxData.stamp_preset || 'standard_3', customerId);

      toast.success('Box hinzugefügt');
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

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto p-6 sm:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Mein Geschäft</h1>
          <p className="text-gray-500 mt-1">Verwalten Sie Ihre Prämien, Geschäftsinfos und Stempel</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Phone Preview */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <div className="sticky top-24">
              <PhoneFrame title="Live-Vorschau">
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
                  onTabChange={(tab) => setActiveTab(tab === 'info' ? 'info' : 'praemien')}
                  userPoints={25}
                  scrollTarget={scrollTarget}
                />
              </PhoneFrame>
              
              {/* Global Save Button below phone */}
              {activeTab === 'info' && (
                <Button onClick={handleSaveInfo} disabled={saving} className="w-full rounded-xl mt-4" size="lg">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Änderungen speichern
                </Button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="lg:col-span-2 order-1 lg:order-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 mb-6 rounded-xl">
                <TabsTrigger value="praemien" className="rounded-lg">
                  <Gift className="w-4 h-4 mr-2" />
                  Prämien
                </TabsTrigger>
                <TabsTrigger value="info" className="rounded-lg">
                  <Info className="w-4 h-4 mr-2" />
                  Info
                </TabsTrigger>
                <TabsTrigger value="stempel" className="rounded-lg">
                  <Package className="w-4 h-4 mr-2" />
                  Stempel
                </TabsTrigger>
              </TabsList>

              {/* Prämien Tab */}
              <TabsContent value="praemien" className="space-y-6">
                <Card className="rounded-2xl shadow-sm border-0 bg-gray-50/80">
                  <CardHeader className="flex flex-row items-center justify-between pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                        <Gift className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-semibold text-gray-900">Prämien</CardTitle>
                        <CardDescription className="text-gray-500">Prämien für Ihre Kunden</CardDescription>
                      </div>
                    </div>
                    <Button onClick={() => { setEditingReward(null); setRewardForm({ title: "", description: "", points_required: 10, image_url: "" }); setShowRewardDialog(true); }} className="rounded-xl">
                      <Plus className="h-4 w-4 mr-2" />
                      Neue Prämie
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {rewards.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">Noch keine Prämien erstellt</p>
                    ) : (
                      <div className="space-y-3">
                        {rewards.map((reward) => (
                          <div key={reward.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100">
                            <div className="flex items-center gap-3">
                              {reward.image_url ? (
                                <img src={reward.image_url} alt={reward.title} className="w-12 h-12 rounded-xl object-cover" />
                              ) : (
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                  <Gift className="h-6 w-6 text-primary" />
                                </div>
                              )}
                              <div>
                                <p className="font-semibold text-gray-900">{reward.title}</p>
                                {reward.description && <p className="text-sm text-gray-500">{reward.description}</p>}
                                <Badge variant="secondary" className="rounded-full mt-1">{reward.points_required} Punkte</Badge>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="sm" onClick={() => { setEditingReward(reward); setRewardForm({ title: reward.title, description: reward.description || "", points_required: reward.points_required, image_url: reward.image_url || "" }); setShowRewardDialog(true); }} className="rounded-lg">
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteReward(reward.id)} className="rounded-lg">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Neukundenprämie Section */}
                <Card className="rounded-2xl shadow-sm border-0 bg-primary/5">
                  <CardHeader className="flex flex-row items-center justify-between pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <UserPlus className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-semibold text-gray-900">Neukundenprämie</CardTitle>
                        <CardDescription className="text-gray-500">Locken Sie neue Kunden an</CardDescription>
                      </div>
                    </div>
                    <Button variant={newCustomerOffer ? "outline" : "default"} onClick={() => setShowNcoDialog(true)} className="rounded-xl">
                      {newCustomerOffer ? <><Edit2 className="h-4 w-4 mr-2" />Bearbeiten</> : <><Plus className="h-4 w-4 mr-2" />Erstellen</>}
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {newCustomerOffer ? (
                      <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-gray-900">{newCustomerOffer.title}</p>
                            <Badge variant={newCustomerOffer.is_active ? "default" : "secondary"} className="rounded-full">
                              {newCustomerOffer.is_active ? 'Aktiv' : 'Inaktiv'}
                            </Badge>
                          </div>
                          {newCustomerOffer.description && <p className="text-sm text-gray-500">{newCustomerOffer.description}</p>}
                        </div>
                        <Button variant="ghost" size="sm" onClick={handleDeleteNco} className="rounded-lg">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">
                        Noch keine Neukundenprämie erstellt. Diese wird nur neuen Kunden angezeigt, die noch nie bei Ihnen gestempelt haben.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Info Tab */}
              <TabsContent value="info" className="space-y-6">
                {/* Images */}
                <Card className="rounded-2xl shadow-sm border-0 bg-gray-50/80 p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    Bilder
                  </h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <Label className="mb-2 block">Logo</Label>
                      <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-primary/50 transition-colors">
                        {formData.logo_url ? (
                          <div className="space-y-3">
                            <img src={formData.logo_url} alt="Logo" className="w-20 h-20 object-contain mx-auto rounded-lg bg-white" />
                            <label className="cursor-pointer text-sm text-primary hover:underline block">
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImageUpload(file, "logo"); }} />
                              {uploadingLogo ? "Hochladen..." : "Ändern"}
                            </label>
                          </div>
                        ) : (
                          <label className="cursor-pointer block py-4">
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImageUpload(file, "logo"); }} />
                            <ImageIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                            <span className="text-sm text-gray-500">{uploadingLogo ? "Hochladen..." : "Logo hochladen"}</span>
                          </label>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label className="mb-2 block">Titelbild</Label>
                      <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-primary/50 transition-colors">
                        {formData.cover_image_url ? (
                          <div className="space-y-3">
                            <img src={formData.cover_image_url} alt="Titelbild" className="w-full h-24 object-cover mx-auto rounded-lg" />
                            <label className="cursor-pointer text-sm text-primary hover:underline block">
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImageUpload(file, "cover"); }} />
                              {uploadingCover ? "Hochladen..." : "Ändern"}
                            </label>
                          </div>
                        ) : (
                          <label className="cursor-pointer block py-4">
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImageUpload(file, "cover"); }} />
                            <ImageIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                            <span className="text-sm text-gray-500">{uploadingCover ? "Hochladen..." : "Titelbild hochladen"}</span>
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Business Info */}
                <Card className="rounded-2xl shadow-sm border-0 bg-gray-50/80 p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Store className="w-5 h-5" />
                    Geschäftsinformationen
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <Label>Geschäftsname *</Label>
                      <Input value={formData.name} onChange={(e) => handleInputChange("name", e.target.value)} placeholder="z.B. Café Sonnenschein" className="rounded-xl" />
                    </div>
                    <div>
                      <Label>Branche</Label>
                      <Select value={formData.industry} onValueChange={(value) => handleInputChange("industry", value)}>
                        <SelectTrigger className="rounded-xl"><SelectValue placeholder="Branche auswählen" /></SelectTrigger>
                        <SelectContent>{INDUSTRIES.map((ind) => (<SelectItem key={ind.value} value={ind.value}>{ind.label}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Beschreibung</Label>
                      <RichTextEditor
                        value={formData.description}
                        onChange={(value) => handleInputChange("description", value)}
                        placeholder="Erzähle etwas über dein Geschäft..."
                        rows={4}
                      />
                    </div>
                  </div>
                </Card>

                {/* Address */}
                <Card className="rounded-2xl shadow-sm border-0 bg-gray-50/80 p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Adresse
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2">
                        <Label>Straße</Label>
                        <Input value={formData.street} onChange={(e) => handleInputChange("street", e.target.value)} placeholder="Hauptstraße" className="rounded-xl" />
                      </div>
                      <div>
                        <Label>Nr.</Label>
                        <Input value={formData.house_number} onChange={(e) => handleInputChange("house_number", e.target.value)} placeholder="123" className="rounded-xl" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>PLZ</Label>
                        <Input value={formData.postal_code} onChange={(e) => handleInputChange("postal_code", e.target.value)} placeholder="12345" className="rounded-xl" />
                      </div>
                      <div>
                        <Label>Ort</Label>
                        <Input value={formData.city} onChange={(e) => handleInputChange("city", e.target.value)} placeholder="Berlin" className="rounded-xl" />
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Opening Hours */}
                <Card className="rounded-2xl shadow-sm border-0 bg-gray-50/80 p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Öffnungszeiten
                  </h3>
                  <div className="space-y-3">
                    {DAYS.map((day) => (
                      <div key={day.key} className="flex items-center gap-4">
                        <div className="w-24 text-sm font-medium">{day.label}</div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={formData.opening_hours[day.key]?.closed || false} onChange={(e) => handleOpeningHoursChange(day.key, "closed", e.target.checked)} className="rounded" />
                          <span className="text-sm text-gray-500">Geschlossen</span>
                        </label>
                        {!formData.opening_hours[day.key]?.closed && (
                          <div className="flex items-center gap-2 flex-1">
                            <Input type="time" value={formData.opening_hours[day.key]?.open || "09:00"} onChange={(e) => handleOpeningHoursChange(day.key, "open", e.target.value)} className="w-28 rounded-xl" />
                            <span className="text-gray-400">-</span>
                            <Input type="time" value={formData.opening_hours[day.key]?.close || "18:00"} onChange={(e) => handleOpeningHoursChange(day.key, "close", e.target.value)} className="w-28 rounded-xl" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Contact & Links */}
                <Card className="rounded-2xl shadow-sm border-0 bg-gray-50/80 p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    Kontakt & Links
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <Label>Telefon</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input 
                          value={formData.phone} 
                          onChange={(e) => handleInputChange("phone", e.target.value)} 
                          onFocus={() => setScrollTarget('contact')}
                          placeholder="+49 123 456789" 
                          className="pl-10 rounded-xl" 
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Website</Label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input 
                          value={formData.website} 
                          onChange={(e) => handleInputChange("website", e.target.value)} 
                          onFocus={() => setScrollTarget('contact')}
                          placeholder="https://..." 
                          className="pl-10 rounded-xl" 
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Instagram</Label>
                      <div className="relative">
                        <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input 
                          value={formData.instagram} 
                          onChange={(e) => handleInputChange("instagram", e.target.value)} 
                          onFocus={() => setScrollTarget('contact')}
                          placeholder="https://instagram.com/..." 
                          className="pl-10 rounded-xl" 
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Facebook</Label>
                      <div className="relative">
                        <Facebook className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input 
                          value={formData.facebook} 
                          onChange={(e) => handleInputChange("facebook", e.target.value)} 
                          onFocus={() => setScrollTarget('contact')}
                          placeholder="https://facebook.com/..." 
                          className="pl-10 rounded-xl" 
                        />
                      </div>
                    </div>
                    <div>
                      <Label>X (Twitter)</Label>
                      <div className="relative">
                        <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input 
                          value={formData.twitter} 
                          onChange={(e) => handleInputChange("twitter", e.target.value)} 
                          onFocus={() => setScrollTarget('contact')}
                          placeholder="https://x.com/..." 
                          className="pl-10 rounded-xl" 
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              </TabsContent>

              {/* Stempel Tab */}
              <TabsContent value="stempel" className="space-y-6">
                {/* Stamp Colors & Points */}
                {nfcChips.length > 0 && (
                  <Card className="rounded-2xl shadow-sm border-0 bg-gray-50/80">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-3 text-lg font-semibold text-gray-900">
                        <span className="text-lg">🔖</span>
                        Stempelfarben & Punkte (manuell einstellen)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {nfcChips.map((chip) => (
                        <div key={chip.id} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100">
                          <div className={`h-10 w-10 rounded-full ${getColorBadge(chip.stamp_color)} shadow-sm flex-shrink-0`} />
                          <div className="flex-1 grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-xs text-gray-500">Farbe</Label>
                              <p className="text-sm font-medium text-gray-900 capitalize mt-1">{chip.stamp_color || '–'}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-gray-500">Punkte</Label>
                              <Input type="number" min="1" value={chip.points_value || 1} onChange={(e) => handleChipChange(chip.id, 'points_value', parseInt(e.target.value) || 1)} className="h-9 rounded-lg" />
                            </div>
                          </div>
                        </div>
                      ))}
                      <Button onClick={handleSaveChips} disabled={savingChips} className="rounded-xl">
                        {savingChips ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        Stempel speichern
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Box-IDs */}
                <Card className="rounded-2xl shadow-sm border-0 bg-gray-50/80">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Package className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-semibold text-gray-900">Box-IDs</CardTitle>
                        <CardDescription className="text-gray-500">Verknüpfen Sie Ihre Starterbox</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {customerBoxes.length > 0 && (
                      <div className="space-y-3">
                        {customerBoxes.map((box) => (
                          <div key={box.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100">
                            <code className="font-mono text-sm font-semibold text-gray-900">{box.box_code}</code>
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
              </TabsContent>
            </Tabs>
          </div>
        </div>

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