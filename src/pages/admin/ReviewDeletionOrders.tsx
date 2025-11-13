import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Star, Eye, Edit, CheckCircle2, XCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminTopNav } from "@/components/AdminTopNav";
import { toast } from "sonner";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface Order {
  id: string;
  customer_id: string;
  created_by_user_id: string | null;
  status: string;
  google_account_linked: boolean;
  google_business_name: string | null;
  total_reviews_selected: number;
  max_cost_cents: number;
  actual_cost_cents: number | null;
  reviews_data: any;
  notes: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  customers?: {
    name: string;
    company_name: string;
    email: string;
  };
}

interface ReviewResult {
  id: string;
  order_id: string;
  review_google_id: string;
  review_stars: number;
  review_text: string | null;
  review_date: string | null;
  reviewer_name: string | null;
  deletion_successful: boolean | null;
  deletion_notes: string | null;
}

export default function ReviewDeletionOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [reviewResults, setReviewResults] = useState<ReviewResult[]>([]);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("review_deletion_orders")
        .select(`
          *,
          customers (
            name,
            company_name,
            email
          )
        `)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error("Error loading orders:", error);
      toast.error("Fehler beim Laden der Aufträge");
    } finally {
      setLoading(false);
    }
  };

  const loadReviewResults = async (orderId: string) => {
    try {
      const { data, error } = await supabase
        .from("review_deletion_results")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReviewResults(data || []);
    } catch (error) {
      console.error("Error loading review results:", error);
      toast.error("Fehler beim Laden der Bewertungsergebnisse");
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      setUpdatingStatus(true);
      const updates: any = { status: newStatus };
      
      if (newStatus === "abgeschlossen") {
        updates.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("review_deletion_orders")
        .update(updates)
        .eq("id", orderId);

      if (error) throw error;

      toast.success("Status erfolgreich aktualisiert");
      loadOrders();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Fehler beim Aktualisieren des Status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const updateReviewResult = async (
    resultId: string,
    deletion_successful: boolean,
    deletion_notes: string
  ) => {
    try {
      const { error } = await supabase
        .from("review_deletion_results")
        .update({
          deletion_successful,
          deletion_notes,
        })
        .eq("id", resultId);

      if (error) throw error;

      toast.success("Bewertungsergebnis aktualisiert");
      if (selectedOrder) {
        loadReviewResults(selectedOrder.id);
      }
    } catch (error) {
      console.error("Error updating review result:", error);
      toast.error("Fehler beim Aktualisieren des Ergebnisses");
    }
  };

  const calculateActualCost = async (orderId: string) => {
    try {
      const { data: results, error } = await supabase
        .from("review_deletion_results")
        .select("deletion_successful")
        .eq("order_id", orderId);

      if (error) throw error;

      const successfulDeletions = results?.filter(r => r.deletion_successful === true).length || 0;
      const actualCostCents = successfulDeletions * 7900; // 79.00 EUR in cents

      const { error: updateError } = await supabase
        .from("review_deletion_orders")
        .update({ actual_cost_cents: actualCostCents })
        .eq("id", orderId);

      if (updateError) throw updateError;

      toast.success("Kosten berechnet und aktualisiert");
      loadOrders();
    } catch (error) {
      console.error("Error calculating cost:", error);
      toast.error("Fehler bei der Kostenberechnung");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      eingereicht: { variant: "outline", label: "Eingereicht" },
      in_bearbeitung: { variant: "secondary", label: "In Bearbeitung" },
      abgeschlossen: { variant: "default", label: "Abgeschlossen" },
      storniert: { variant: "destructive", label: "Storniert" },
    };

    const config = variants[status] || { variant: "outline", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminTopNav />

      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Google-Bewertungen Löschaufträge</h1>
            <p className="text-muted-foreground mt-1">
              Verwalte Kundenaufträge zur Löschung von Fake-Bewertungen
            </p>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Status filtern" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Status</SelectItem>
              <SelectItem value="eingereicht">Eingereicht</SelectItem>
              <SelectItem value="in_bearbeitung">In Bearbeitung</SelectItem>
              <SelectItem value="abgeschlossen">Abgeschlossen</SelectItem>
              <SelectItem value="storniert">Storniert</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : orders.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <p className="text-center text-muted-foreground">
                Keine Löschaufträge gefunden
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Kunde</TableHead>
                  <TableHead>Unternehmen</TableHead>
                  <TableHead>Bewertungen</TableHead>
                  <TableHead>Max. Kosten</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      {format(new Date(order.created_at), "dd.MM.yyyy", { locale: de })}
                    </TableCell>
                    <TableCell>{order.customers?.name || "N/A"}</TableCell>
                    <TableCell>
                      {order.google_business_name || order.customers?.company_name || "N/A"}
                    </TableCell>
                    <TableCell>{order.total_reviews_selected}</TableCell>
                    <TableCell>{(order.max_cost_cents / 100).toFixed(2)} €</TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedOrder(order);
                              loadReviewResults(order.id);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Auftrag Details</DialogTitle>
                            <DialogDescription>
                              Verwalte die Ergebnisse der Bewertungslöschung
                            </DialogDescription>
                          </DialogHeader>

                          {selectedOrder && (
                            <div className="space-y-6">
                              {/* Order Info */}
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label>Kunde</Label>
                                  <p className="text-sm font-medium">
                                    {selectedOrder.customers?.name}
                                  </p>
                                </div>
                                <div>
                                  <Label>Unternehmen</Label>
                                  <p className="text-sm font-medium">
                                    {selectedOrder.google_business_name || "N/A"}
                                  </p>
                                </div>
                                <div>
                                  <Label>Erstellt am</Label>
                                  <p className="text-sm">
                                    {format(new Date(selectedOrder.created_at), "dd.MM.yyyy HH:mm", {
                                      locale: de,
                                    })}
                                  </p>
                                </div>
                                <div>
                                  <Label>Status</Label>
                                  <div className="flex items-center gap-2 mt-1">
                                    {getStatusBadge(selectedOrder.status)}
                                    <Select
                                      value={selectedOrder.status}
                                      onValueChange={(value) =>
                                        updateOrderStatus(selectedOrder.id, value)
                                      }
                                      disabled={updatingStatus}
                                    >
                                      <SelectTrigger className="w-[180px]">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="eingereicht">Eingereicht</SelectItem>
                                        <SelectItem value="in_bearbeitung">
                                          In Bearbeitung
                                        </SelectItem>
                                        <SelectItem value="abgeschlossen">Abgeschlossen</SelectItem>
                                        <SelectItem value="storniert">Storniert</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              </div>

                              {/* Costs */}
                              <div className="grid grid-cols-2 gap-4 p-4 bg-accent/50 rounded-lg">
                                <div>
                                  <Label>Maximale Kosten</Label>
                                  <p className="text-xl font-bold">
                                    {(selectedOrder.max_cost_cents / 100).toFixed(2)} €
                                  </p>
                                </div>
                                <div>
                                  <Label>Tatsächliche Kosten</Label>
                                  <div className="flex items-center gap-2">
                                    <p className="text-xl font-bold text-green-600">
                                      {selectedOrder.actual_cost_cents
                                        ? `${(selectedOrder.actual_cost_cents / 100).toFixed(2)} €`
                                        : "Noch nicht berechnet"}
                                    </p>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => calculateActualCost(selectedOrder.id)}
                                    >
                                      Neu berechnen
                                    </Button>
                                  </div>
                                </div>
                              </div>

                              {/* Review Results */}
                              <div className="space-y-3">
                                <Label className="text-lg">Bewertungen ({reviewResults.length})</Label>
                                {reviewResults.map((result) => (
                                  <Card key={result.id}>
                                    <CardContent className="pt-6 space-y-3">
                                      <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 space-y-2">
                                          <div className="flex items-center gap-2">
                                            <div className="flex">
                                              {[...Array(5)].map((_, i) => (
                                                <Star
                                                  key={i}
                                                  className={`h-4 w-4 ${
                                                    i < result.review_stars
                                                      ? "fill-yellow-400 text-yellow-400"
                                                      : "fill-gray-200 text-gray-200"
                                                  }`}
                                                />
                                              ))}
                                            </div>
                                            <span className="text-sm font-medium">
                                              {result.reviewer_name}
                                            </span>
                                            {result.review_date && (
                                              <span className="text-xs text-muted-foreground">
                                                {format(new Date(result.review_date), "dd.MM.yyyy", {
                                                  locale: de,
                                                })}
                                              </span>
                                            )}
                                          </div>
                                          {result.review_text && (
                                            <p className="text-sm text-muted-foreground">
                                              {result.review_text}
                                            </p>
                                          )}
                                        </div>
                                        <div>
                                          {result.deletion_successful === true && (
                                            <Badge variant="default" className="bg-green-600">
                                              <CheckCircle2 className="h-3 w-3 mr-1" />
                                              Gelöscht
                                            </Badge>
                                          )}
                                          {result.deletion_successful === false && (
                                            <Badge variant="destructive">
                                              <XCircle className="h-3 w-3 mr-1" />
                                              Nicht gelöscht
                                            </Badge>
                                          )}
                                          {result.deletion_successful === null && (
                                            <Badge variant="outline">
                                              <Clock className="h-3 w-3 mr-1" />
                                              Ausstehend
                                            </Badge>
                                          )}
                                        </div>
                                      </div>

                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="text-green-600"
                                          onClick={() =>
                                            updateReviewResult(
                                              result.id,
                                              true,
                                              result.deletion_notes || "Erfolgreich gelöscht"
                                            )
                                          }
                                        >
                                          <CheckCircle2 className="h-3 w-3 mr-1" />
                                          Als gelöscht markieren
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="text-red-600"
                                          onClick={() =>
                                            updateReviewResult(
                                              result.id,
                                              false,
                                              result.deletion_notes || "Nicht gelöscht"
                                            )
                                          }
                                        >
                                          <XCircle className="h-3 w-3 mr-1" />
                                          Als nicht gelöscht markieren
                                        </Button>
                                      </div>

                                      {result.deletion_notes && (
                                        <p className="text-xs text-muted-foreground mt-2">
                                          Notiz: {result.deletion_notes}
                                        </p>
                                      )}
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </main>
    </div>
  );
}
