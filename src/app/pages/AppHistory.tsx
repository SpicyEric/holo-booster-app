import { useEffect, useState } from 'react';
import { Clock, Gift, Star, UserPlus, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { MainLayout } from '@/app/components/layout/MainLayout';
import { formatTransactionEntry } from '@/app/lib/transactionLabel';

interface Transaction {
  id: string;
  points_change: number;
  description: string | null;
  transaction_type: string;
  created_at: string;
  merchant_customer_id: string;
  customer: {
    name: string;
    company_name: string | null;
    logo_url: string | null;
  };
}

export const AppHistory = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      // Get user's loyalty accounts first
      const { data: accounts } = await supabase
        .from('loyalty_accounts')
        .select('id')
        .eq('user_id', user?.id);

      if (accounts && accounts.length > 0) {
        const accountIds = accounts.map(a => a.id);
        
        const { data, error } = await supabase
          .from('point_transactions')
          .select(`
            id, points_change, description, transaction_type, created_at, merchant_customer_id,
            customer:customers!merchant_customer_id (name, company_name, logo_url, active)
          `)
          .in('loyalty_account_id', accountIds)
          .order('created_at', { ascending: false })
          .limit(100);

        if (!error && data) {
          // Hide transactions of inactive (cancelled) merchants — data stays in DB
          const visible = (data as any[]).filter((tx) => tx.customer?.active === true);
          setTransactions(visible.slice(0, 50) as unknown as Transaction[]);
        }
      }
    } catch (err) {
      console.error('Error loading history:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type: string, points: number) => {
    if (type === 'redeem' || points < 0) {
      return <Gift className="h-4 w-4 text-orange-500" />;
    }
    return <TrendingUp className="h-4 w-4 text-green-500" />;
  };

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case 'stamp': return 'Karte';
      case 'redeem': return 'Eingelöst';
      case 'bonus': return 'Bonus';
      case 'adjustment': return 'Anpassung';
      default: return type;
    }
  };

  if (loading) {
    return (
      <MainLayout title="Transaktionen" showBack>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </MainLayout>
    );
  }

  const groupedTransactions = transactions.reduce((acc, tx) => {
    const date = format(new Date(tx.created_at), 'yyyy-MM-dd');
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(tx);
    return acc;
  }, {} as Record<string, Transaction[]>);

  return (
    <MainLayout title="Transaktionen" showBack>
      <div className="space-y-6">
        {transactions.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Noch keine Transaktionen</p>
              <p className="text-sm text-muted-foreground mt-1">
                Sammle deine ersten Punkte bei einem Geschäft!
              </p>
            </CardContent>
          </Card>
        ) : (
          Object.entries(groupedTransactions).map(([date, txs]) => (
            <div key={date}>
              <h2 className="text-sm font-medium text-muted-foreground mb-2">
                {format(new Date(date), 'EEEE, d. MMMM', { locale: de })}
              </h2>
              <Card>
                <CardContent className="p-0 divide-y divide-border">
                  {txs.map((tx) => (
                    <div key={tx.id} className="flex items-center gap-4 p-4">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        {getTransactionIcon(tx.transaction_type, tx.points_change)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {tx.customer?.company_name || tx.customer?.name || 'Unbekannt'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatTransactionDescription(tx.description, getTransactionLabel(tx.transaction_type))}
                        </p>
                      </div>
                      <div className={`font-semibold ${tx.points_change >= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                        {tx.points_change >= 0 ? '+' : ''}{tx.points_change}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          ))
        )}
      </div>
    </MainLayout>
  );
};

export default AppHistory;
