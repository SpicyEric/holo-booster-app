import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Contact {
  id: string;
  phone: string;
  created_at: string;
  opt_in: boolean;
  scanCount: number;
  lastScan: string | null;
  stampCount: number;
}

interface CustomerContactsProps {
  customerId: string;
}

const CustomerContacts = ({ customerId }: CustomerContactsProps) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContacts();
  }, [customerId]);

  const loadContacts = async () => {
    try {
      setLoading(true);

      // Get contacts
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('id, phone, created_at, opt_in')
        .eq('customer_id', customerId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (contactsError) throw contactsError;

      // Get scans and stamps for each contact
      const contactsWithStats = await Promise.all(
        (contactsData || []).map(async (contact) => {
          // Count scans
          const { count: scanCount } = await supabase
            .from('scans')
            .select('*', { count: 'exact', head: true })
            .eq('contact_id', contact.id);

          // Get last scan
          const { data: lastScanData } = await supabase
            .from('scans')
            .select('created_at')
            .eq('contact_id', contact.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          // Count stamps
          const { count: stampCount } = await supabase
            .from('stamps')
            .select('*', { count: 'exact', head: true })
            .eq('customer_id', customerId)
            .eq('phone', contact.phone);

          return {
            ...contact,
            scanCount: scanCount || 0,
            lastScan: lastScanData?.created_at || null,
            stampCount: stampCount || 0,
          };
        })
      );

      setContacts(contactsWithStats);
    } catch (error: any) {
      console.error('Error loading contacts:', error);
      toast.error('Fehler beim Laden der Kontakte');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredContacts = contacts.filter(contact =>
    contact.phone.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Input 
        placeholder="Telefonnummer suchen..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      {filteredContacts.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          {searchTerm ? 'Keine Kontakte gefunden' : 'Noch keine Kontakte vorhanden'}
        </p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Telefonnummer</TableHead>
                <TableHead className="text-center">Scans</TableHead>
                <TableHead className="text-center">Stempel</TableHead>
                <TableHead>Letzter Scan</TableHead>
                <TableHead className="text-center">Opt-In</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContacts.map(contact => (
                <TableRow key={contact.id}>
                  <TableCell className="font-mono">{contact.phone}</TableCell>
                  <TableCell className="text-center">{contact.scanCount}</TableCell>
                  <TableCell className="text-center">{contact.stampCount}</TableCell>
                  <TableCell>{formatDate(contact.lastScan)}</TableCell>
                  <TableCell className="text-center">
                    {contact.opt_in ? '✓' : '✗'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Gesamt: {filteredContacts.length} Kontakte
      </p>
    </div>
  );
};

export default CustomerContacts;
