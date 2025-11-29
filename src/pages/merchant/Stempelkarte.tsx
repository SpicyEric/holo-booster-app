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
  Store
} from "lucide-react";
import MerchantPreview from "@/components/merchant/MerchantPreview";
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

interface MerchantData {
  id: string;
  name: string;
  description: string;
  industry: string;
  street: string;
  house_number: string;
  postal_code: string;
  city: string;
  logo_url: string;
  cover_image_url: string;
  phone: string;
  website: string;
  instagram: string;
  facebook: string;
  twitter: string;
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
  const [customerId, setCustomerId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<MerchantData>({
    id: "",
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
    google_review_url: "",
    opening_hours: defaultOpeningHours,
  });

  useEffect(() => {
    const fetchCustomerData = async () => {
      if (!user?.id) return;
      
      try {
        // First get the customer_id from merchant_assignments
        const { data: assignment, error: assignmentError } = await supabase
          .from("merchant_assignments")
          .select("customer_id")
          .eq("merchant_user_id", user.id)
          .single();
        
        if (assignmentError) {
          console.error("Error fetching merchant assignment:", assignmentError);
          toast.error("Kein Geschäft zugewiesen. Bitte kontaktiere den Support.");
          setLoading(false);
          return;
        }
        
        if (!assignment?.customer_id) {
          toast.error("Kein Geschäft gefunden.");
          setLoading(false);
          return;
        }
        
        setCustomerId(assignment.customer_id);
        
        // Now fetch the customer data
        const { data: customer, error: customerError } = await supabase
          .from("customers")
          .select("*")
          .eq("id", assignment.customer_id)
          .single();
        
        if (customerError) {
          console.error("Error fetching customer:", customerError);
          toast.error("Fehler beim Laden der Daten");
          setLoading(false);
          return;
        }
        
        if (customer) {
          setFormData({
            id: customer.id,
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
            google_review_url: customer.google_review_url || "",
            opening_hours: (customer.opening_hours as OpeningHours) || defaultOpeningHours,
          });
        }
      } catch (err) {
        console.error("Error:", err);
        toast.error("Fehler beim Laden");
      } finally {
        setLoading(false);
      }
    };
    
    fetchCustomerData();
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
    if (!user?.id || !customerId) {
      toast.error("Bitte warte, bis deine Daten geladen sind.");
      return;
    }
    
    const setUploading = type === "logo" ? setUploadingLogo : setUploadingCover;
    setUploading(true);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${customerId}/${type}_${Date.now()}.${fileExt}`;
      
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
      
      const field = type === "logo" ? "logo_url" : "cover_image_url";
      setFormData(prev => ({ ...prev, [field]: publicUrl }));
      toast.success(`${type === "logo" ? "Logo" : "Titelbild"} erfolgreich hochgeladen!`);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Fehler beim Hochladen: " + (error.message || "Unbekannter Fehler"));
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id || !customerId) {
      toast.error("Keine Berechtigung zum Speichern");
      return;
    }
    
    setSaving(true);
    try {
      const updateData = {
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
        google_review_url: formData.google_review_url,
        opening_hours: formData.opening_hours,
        updated_at: new Date().toISOString(),
      };
      
      const { error } = await supabase
        .from("customers")
        .update(updateData)
        .eq("id", customerId);
      
      if (error) {
        console.error("Save error:", error);
        throw error;
      }
      
      toast.success("Stempelkarte erfolgreich gespeichert!");
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error("Fehler beim Speichern: " + (error.message || "Unbekannter Fehler"));
    } finally {
      setSaving(false);
    }
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

  if (!customerId) {
    return (
      <div className="max-w-7xl mx-auto p-6 sm:p-8">
        <div className="text-center py-12">
          <Store className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Kein Geschäft zugewiesen</h2>
          <p className="text-muted-foreground">
            Bitte kontaktiere den Support unter support@eloyo.de
          </p>
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
        {/* Smartphone Preview */}
        <div className="lg:col-span-1 order-2 lg:order-1">
          <div className="sticky top-24">
            <h3 className="text-lg font-semibold mb-4 text-center">Live-Vorschau</h3>
            <div className="mx-auto w-[300px] h-[620px] bg-foreground rounded-[40px] p-3 shadow-2xl">
              <div className="w-full h-full bg-background rounded-[32px] overflow-hidden relative">
                <MerchantPreview
                  name={formData.name}
                  description={formData.description}
                  industry={formData.industry}
                  logo_url={formData.logo_url}
                  cover_image_url={formData.cover_image_url}
                  street={formData.street}
                  house_number={formData.house_number}
                  postal_code={formData.postal_code}
                  city={formData.city}
                  phone={formData.phone}
                  website={formData.website}
                  instagram={formData.instagram}
                  facebook={formData.facebook}
                  twitter={formData.twitter}
                  google_review_url={formData.google_review_url}
                  opening_hours={formData.opening_hours}
                />
              </div>
            </div>
            
            {/* Save Button - Below Phone Preview */}
            <div className="mt-6">
              <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
                <Save className="mr-2 w-4 h-4" />
                {saving ? "Speichern..." : "Änderungen speichern"}
              </Button>
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
                <Label htmlFor="industry">Branche *</Label>
                <Select
                  value={formData.industry}
                  onValueChange={(value) => handleInputChange("industry", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Branche auswählen" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border border-border z-50">
                    {INDUSTRIES.map((ind) => (
                      <SelectItem key={ind.value} value={ind.value}>
                        {ind.label}
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
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="street">Straße</Label>
                  <Input
                    id="street"
                    value={formData.street}
                    onChange={(e) => handleInputChange("street", e.target.value)}
                    placeholder="z.B. Hauptstraße"
                  />
                </div>
                <div>
                  <Label htmlFor="house_number">Nr.</Label>
                  <Input
                    id="house_number"
                    value={formData.house_number}
                    onChange={(e) => handleInputChange("house_number", e.target.value)}
                    placeholder="123"
                  />
                </div>
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
                <Label htmlFor="phone">Telefonnummer</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
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
                <Label htmlFor="instagram">Instagram</Label>
                <div className="relative">
                  <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="instagram"
                    value={formData.instagram}
                    onChange={(e) => handleInputChange("instagram", e.target.value)}
                    placeholder="https://instagram.com/deinprofil"
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="facebook">Facebook</Label>
                <div className="relative">
                  <Facebook className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="facebook"
                    value={formData.facebook}
                    onChange={(e) => handleInputChange("facebook", e.target.value)}
                    placeholder="https://facebook.com/deinprofil"
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="twitter">X (Twitter)</Label>
                <div className="relative">
                  <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="twitter"
                    value={formData.twitter}
                    onChange={(e) => handleInputChange("twitter", e.target.value)}
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
