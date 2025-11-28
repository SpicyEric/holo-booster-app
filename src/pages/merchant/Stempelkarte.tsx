import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Upload, 
  Save, 
  MapPin, 
  Phone, 
  Globe, 
  Instagram, 
  Facebook, 
  Twitter,
  Star,
  Clock,
  Store,
  RefreshCw
} from "lucide-react";
import { appSupabase } from "@/integrations/app-supabase/client";
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

interface MerchantData {
  id: string;
  name: string;
  description: string;
  category: string;
  address: string;
  postal_code: string;
  city: string;
  logo_url: string;
  cover_image_url: string;
  phone_number: string;
  website: string;
  instagram_url: string;
  facebook_url: string;
  twitter_url: string;
  google_review_url: string;
  opening_hours: OpeningHours;
}

const defaultOpeningHours: OpeningHours = {
  monday: { open: "09:00", close: "18:00", closed: false },
  tuesday: { open: "09:00", close: "18:00", closed: false },
  wednesday: { open: "09:00", close: "18:00", closed: false },
  thursday: { open: "09:00", close: "18:00", closed: false },
  friday: { open: "09:00", close: "18:00", closed: false },
  saturday: { open: "10:00", close: "16:00", closed: false },
  sunday: { open: "00:00", close: "00:00", closed: true },
};

const Stempelkarte = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [merchantId, setMerchantId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<MerchantData>({
    id: "",
    name: "",
    description: "",
    category: "",
    address: "",
    postal_code: "",
    city: "",
    logo_url: "",
    cover_image_url: "",
    phone_number: "",
    website: "",
    instagram_url: "",
    facebook_url: "",
    twitter_url: "",
    google_review_url: "",
    opening_hours: defaultOpeningHours,
  });

  useEffect(() => {
    const fetchMerchant = async () => {
      if (!user?.id) return;
      
      try {
        const { data, error } = await appSupabase
          .from("merchants")
          .select("*")
          .eq("owner_user_id", user.id)
          .single();
        
        if (error && error.code !== "PGRST116") {
          console.error("Error fetching merchant:", error);
          toast.error("Fehler beim Laden der Daten");
          return;
        }
        
        if (data) {
          const merchantData = data as any;
          setMerchantId(merchantData.id);
          setFormData({
            id: merchantData.id,
            name: merchantData.name || "",
            description: merchantData.description || "",
            category: merchantData.category || "",
            address: merchantData.address || "",
            postal_code: merchantData.postal_code || "",
            city: merchantData.city || "",
            logo_url: merchantData.logo_url || "",
            cover_image_url: merchantData.cover_image_url || "",
            phone_number: merchantData.phone_number || "",
            website: merchantData.website || "",
            instagram_url: merchantData.instagram_url || "",
            facebook_url: merchantData.facebook_url || "",
            twitter_url: merchantData.twitter_url || "",
            google_review_url: merchantData.google_review_url || "",
            opening_hours: (merchantData.opening_hours as OpeningHours) || defaultOpeningHours,
          });
        }
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMerchant();
  }, [user?.id]);

  const handleInputChange = (field: keyof MerchantData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleOpeningHoursChange = (day: string, field: "open" | "close" | "closed", value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      opening_hours: {
        ...prev.opening_hours,
        [day]: {
          ...prev.opening_hours[day],
          [field]: value,
        },
      },
    }));
  };

  const handleImageUpload = async (file: File, type: "logo" | "cover") => {
    if (!user?.id || !merchantId) {
      toast.error("Bitte speichere zuerst deine Daten, bevor du Bilder hochlädst.");
      return;
    }
    
    const setUploading = type === "logo" ? setUploadingLogo : setUploadingCover;
    setUploading(true);
    
    try {
      const fileExt = file.name.split('.').pop();
      // Use merchantId in path to match RLS policy, and underscore naming convention
      const fileName = `${merchantId}/${type}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await appSupabase.storage
        .from("merchant-images")
        .upload(fileName, file, { upsert: true });
      
      if (uploadError) {
        if (uploadError.message.includes("Bucket not found")) {
          toast.error("Storage-Bucket nicht gefunden. Bitte kontaktieren Sie den Support.");
          return;
        }
        throw uploadError;
      }
      
      const { data: { publicUrl } } = appSupabase.storage
        .from("merchant-images")
        .getPublicUrl(fileName);
      
      const field = type === "logo" ? "logo_url" : "cover_image_url";
      setFormData(prev => ({ ...prev, [field]: publicUrl }));
      toast.success(`${type === "logo" ? "Logo" : "Titelbild"} erfolgreich hochgeladen!`);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Fehler beim Hochladen");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;
    
    setSaving(true);
    try {
      const updateData = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        address: formData.address,
        postal_code: formData.postal_code,
        city: formData.city,
        logo_url: formData.logo_url,
        cover_image_url: formData.cover_image_url,
        phone_number: formData.phone_number,
        website: formData.website,
        instagram_url: formData.instagram_url,
        facebook_url: formData.facebook_url,
        twitter_url: formData.twitter_url,
        google_review_url: formData.google_review_url,
        opening_hours: formData.opening_hours,
        updated_at: new Date().toISOString(),
      };
      
      if (merchantId) {
        const { error } = await (appSupabase
          .from("merchants") as any)
          .update(updateData)
          .eq("id", merchantId);
        
        if (error) throw error;
      } else {
        const { data, error } = await (appSupabase
          .from("merchants") as any)
          .insert({
            ...updateData,
            owner_user_id: user.id,
            lat: 0,
            lng: 0,
          })
          .select()
          .single();
        
        if (error) throw error;
        if (data) setMerchantId(data.id);
      }
      
      toast.success("Stempelkarte erfolgreich gespeichert!");
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  const getCategoryLabel = (value: string) => {
    return INDUSTRIES.find(i => i.value === value)?.label || value;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6 sm:p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 sm:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Stempelkarte</h1>
        <p className="text-muted-foreground">
          Passe dein Geschäftsprofil an und sieh dir die Live-Vorschau an.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Smartphone Preview - Echte App-Vorschau via iframe */}
        <div className="lg:col-span-1 order-2 lg:order-1">
          <div className="sticky top-24">
            <h3 className="text-lg font-semibold mb-4 text-center">Smartphone-Vorschau</h3>
            <div className="mx-auto w-[300px] h-[620px] bg-foreground rounded-[40px] p-3 shadow-2xl">
              <div className="w-full h-full bg-background rounded-[32px] overflow-hidden relative">
                {/* iframe mit echter App-Preview */}
                {merchantId ? (
                  <iframe
                    src={`https://eloyo.lovable.app/preview/${merchantId}?points=25&t=${Date.now()}`}
                    className="w-full h-full border-none"
                    title="App-Vorschau"
                    key={`preview-${merchantId}-${saving ? 'saving' : 'idle'}`}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                    <div className="text-center p-4">
                      <Store className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                      <p>Speichere deine Daten, um die Vorschau zu sehen</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Save Button - Below Phone Preview */}
            <div className="mt-6 space-y-2">
              <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
                <Save className="mr-2 w-4 h-4" />
                {saving ? "Speichern..." : "Änderungen speichern"}
              </Button>
              {merchantId && (
                <Button 
                  variant="outline" 
                  className="w-full" 
                  size="sm"
                  onClick={() => {
                    // Force iframe reload
                    const iframe = document.querySelector('iframe');
                    if (iframe) {
                      iframe.src = `https://eloyo.lovable.app/preview/${merchantId}?points=25&t=${Date.now()}`;
                    }
                  }}
                >
                  Vorschau aktualisieren
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Settings Form */}
        <div className="lg:col-span-2 order-1 lg:order-2 space-y-6">
          {/* Logo & Cover Upload */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Bilder hochladen
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Logo Upload */}
              <div>
                <Label className="mb-2 block">Logo</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                  {formData.logo_url ? (
                    <div className="relative">
                      <img 
                        src={formData.logo_url} 
                        alt="Logo" 
                        className="w-24 h-24 object-cover rounded-lg mx-auto"
                      />
                      <label className="mt-2 inline-block cursor-pointer text-sm text-primary hover:underline">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(file, "logo");
                          }}
                        />
                        {uploadingLogo ? "Hochladen..." : "Ändern"}
                        Ändern
                      </label>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file, "logo");
                        }}
                      />
                      <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center mx-auto mb-2">
                        <Store className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {uploadingLogo ? "Hochladen..." : "Logo hochladen"}
                      </span>
                    </label>
                  )}
                </div>
              </div>
              
              {/* Cover Upload */}
              <div>
                <Label className="mb-2 block">Titelbild</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                  {formData.cover_image_url ? (
                    <div className="relative">
                      <img 
                        src={formData.cover_image_url} 
                        alt="Cover" 
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <label className="mt-2 inline-block cursor-pointer text-sm text-primary hover:underline">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(file, "cover");
                          }}
                        />
                        {uploadingCover ? "Hochladen..." : "Ändern"}
                      </label>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file, "cover");
                        }}
                      />
                      <div className="w-full h-16 bg-muted rounded-lg flex items-center justify-center mb-2">
                        <Upload className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {uploadingCover ? "Hochladen..." : "Titelbild hochladen"}
                      </span>
                    </label>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Business Info */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Store className="w-5 h-5" />
              Geschäftsinformationen
            </h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Geschäftsname *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="z.B. Café Sonnenschein"
                />
              </div>
              
              <div>
                <Label htmlFor="category">Branche *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => handleInputChange("category", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Branche auswählen" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border border-border z-50">
                    {INDUSTRIES.map((industry) => (
                      <SelectItem key={industry.value} value={industry.value}>
                        {industry.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="description">Beschreibung</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder="Erzähle etwas über dein Geschäft..."
                  rows={3}
                />
              </div>
            </div>
          </Card>

          {/* Address */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Adresse
            </h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="address">Straße & Hausnummer</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  placeholder="z.B. Hauptstraße 123"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="postal_code">PLZ</Label>
                  <Input
                    id="postal_code"
                    value={formData.postal_code}
                    onChange={(e) => handleInputChange("postal_code", e.target.value)}
                    placeholder="z.B. 12345"
                  />
                </div>
                <div>
                  <Label htmlFor="city">Ort</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                    placeholder="z.B. Berlin"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Opening Hours */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Öffnungszeiten
            </h3>
            
            <div className="space-y-3">
              {DAYS.map((day) => (
                <div key={day.key} className="flex items-center gap-4">
                  <div className="w-24 text-sm font-medium">{day.label}</div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.opening_hours[day.key]?.closed || false}
                      onChange={(e) => handleOpeningHoursChange(day.key, "closed", e.target.checked)}
                      className="rounded border-border"
                    />
                    <span className="text-sm text-muted-foreground">Geschlossen</span>
                  </label>
                  {!formData.opening_hours[day.key]?.closed && (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        type="time"
                        value={formData.opening_hours[day.key]?.open || "09:00"}
                        onChange={(e) => handleOpeningHoursChange(day.key, "open", e.target.value)}
                        className="w-28"
                      />
                      <span className="text-muted-foreground">-</span>
                      <Input
                        type="time"
                        value={formData.opening_hours[day.key]?.close || "18:00"}
                        onChange={(e) => handleOpeningHoursChange(day.key, "close", e.target.value)}
                        className="w-28"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Contact & Links */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Kontakt & Links
            </h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="phone_number">Telefonnummer</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="phone_number"
                    value={formData.phone_number}
                    onChange={(e) => handleInputChange("phone_number", e.target.value)}
                    placeholder="z.B. +49 123 456789"
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="website">Website</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => handleInputChange("website", e.target.value)}
                    placeholder="https://www.example.com"
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="instagram_url">Instagram</Label>
                <div className="relative">
                  <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="instagram_url"
                    value={formData.instagram_url}
                    onChange={(e) => handleInputChange("instagram_url", e.target.value)}
                    placeholder="https://instagram.com/deinprofil"
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="facebook_url">Facebook</Label>
                <div className="relative">
                  <Facebook className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="facebook_url"
                    value={formData.facebook_url}
                    onChange={(e) => handleInputChange("facebook_url", e.target.value)}
                    placeholder="https://facebook.com/deinprofil"
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="twitter_url">X (Twitter)</Label>
                <div className="relative">
                  <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="twitter_url"
                    value={formData.twitter_url}
                    onChange={(e) => handleInputChange("twitter_url", e.target.value)}
                    placeholder="https://x.com/deinprofil"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Google Review */}
          <Card className="p-6 border-amber-200 bg-amber-50/50">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-amber-800">
              <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
              Google Bewertungen
            </h3>
            <p className="text-sm text-amber-700 mb-4">
              Füge deinen Google-Bewertungslink hinzu, damit Kunden dich nach dem Stempeln bewerten können.
            </p>
            
            <div>
              <Label htmlFor="google_review_url">Google Bewertungslink</Label>
              <div className="relative">
                <Star className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
                <Input
                  id="google_review_url"
                  value={formData.google_review_url}
                  onChange={(e) => handleInputChange("google_review_url", e.target.value)}
                  placeholder="https://g.page/r/..."
                  className="pl-10"
                />
              </div>
            </div>
          </Card>

          {/* Save Button (Mobile) */}
          <div className="lg:hidden">
            <Button onClick={handleSave} disabled={saving} className="w-full">
              <Save className="mr-2 w-4 h-4" />
              {saving ? "Speichern..." : "Änderungen speichern"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Stempelkarte;
