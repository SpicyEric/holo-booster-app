import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getUserCustomer } from "@/lib/auth";
import { Loader2, TrendingUp, Gift, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Transaction {
  id: string;
  created_at: string;
  points_change: number;
  transaction_type: string | null;
  description: string | null;
}

export default function Transaktionen() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (user) loadTransactions();
  }, [user]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const customer = await getUserCustomer(user!.id);
      if (!customer) return;

      const { data } = await supabase
        .from("point_transactions")
        .select("id, created_at, points_change, transaction_type, description")
        .eq("merchant_customer_id", customer.id)
        .order("created_at", { ascending: false })
        .limit(500);

      setTransactions(data || []);
    } catch (err) {
      console.error("Error loading transactions:", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = transactions.filter(tx =>
    !search || (tx.description || tx.transaction_type || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Transaktionen</h1>
          <p className="text-gray-500 mt-1">Alle Punkte-Transaktionen im Überblick</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="space-y-2">
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-12">Keine Transaktionen gefunden</p>
          ) : (
            filtered.map((tx) => (
              <div key={tx.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    tx.points_change > 0 ? 'bg-green-100' : tx.points_change < 0 ? 'bg-amber-100' : 'bg-blue-100'
                  }`}>
                    {tx.points_change > 0 ? (
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    ) : (
                      <Gift className="w-5 h-5 text-amber-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {tx.description || tx.transaction_type || 'Transaktion'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(tx.created_at).toLocaleDateString("de-DE", {
                        day: "2-digit", month: "2-digit", year: "numeric",
                        hour: "2-digit", minute: "2-digit"
                      })}
                    </p>
                  </div>
                </div>
                <span className={`font-bold text-lg ${
                  tx.points_change > 0 ? 'text-green-600' : tx.points_change < 0 ? 'text-amber-600' : 'text-blue-600'
                }`}>
                  {tx.points_change > 0 ? '+' : ''}{tx.points_change}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
