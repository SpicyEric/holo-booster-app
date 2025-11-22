import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { LogOut, Euro, TrendingUp, Calendar, AlertCircle } from "lucide-react";
import loyoLogo from '@/assets/loyo-logo.png';
import Particles from "@/components/Particles";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const PartnerDashboard = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error("Logout fehlgeschlagen");
    } else {
      toast.success("Erfolgreich abgemeldet");
      navigate('/auth');
    }
  };

  return (
    <ProtectedRoute allowedRoles={['partner']}>
      <div className="min-h-screen bg-background">
        <Particles 
          particleColors={['#8B5CF6', '#3B82F6', '#8B5CF6']}
          particleCount={100}
          particleSpread={8}
          speed={0.05}
          particleBaseSize={100}
          sizeRandomness={1.5}
          moveParticlesOnHover={true}
          alphaParticles={true}
          disableRotation={false}
          cameraDistance={20}
        />
        <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <img src={loyoLogo} alt="Loyo Logo" className="h-10 w-auto" />
            <Button onClick={handleLogout} variant="outline">
              <LogOut className="mr-2 w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-6 sm:p-8 relative z-10 space-y-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">
              Partner Dashboard
            </h1>
            <p className="text-muted-foreground text-lg">
              Übersicht deiner Provisionen und Konditionen
            </p>
          </div>

          {/* Provisionstabelle */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Euro className="w-6 h-6 text-primary" />
                Provisionsübersicht
              </CardTitle>
              <CardDescription>
                Alle Provisionen sind Netto-Beträge. Bei Umsatzsteuerpflicht kommen 19% MwSt. hinzu.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Paket</TableHead>
                    <TableHead>Einmalprovision</TableHead>
                    <TableHead>Folgeprovision (monatlich)</TableHead>
                    <TableHead>Erste Auszahlung</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">
                      <Badge variant="outline" className="text-base">Basic</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-lg">80,00 €</span>
                        <span className="text-muted-foreground text-sm">netto</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-lg">7,00 €</span>
                        <span className="text-muted-foreground text-sm">netto</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-lg text-primary">87,00 €</span>
                        <span className="text-muted-foreground text-sm">netto</span>
                      </div>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">
                      <Badge variant="outline" className="text-base">Plus</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-lg">100,00 €</span>
                        <span className="text-muted-foreground text-sm">netto</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-lg">9,00 €</span>
                        <span className="text-muted-foreground text-sm">netto</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-lg text-primary">109,00 €</span>
                        <span className="text-muted-foreground text-sm">netto</span>
                      </div>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">
                      <Badge variant="outline" className="text-base">Pro</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-lg">120,00 €</span>
                        <span className="text-muted-foreground text-sm">netto</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-lg">12,00 €</span>
                        <span className="text-muted-foreground text-sm">netto</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-lg text-primary">132,00 €</span>
                        <span className="text-muted-foreground text-sm">netto</span>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Provisionsregeln */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Qualifizierung & Auszahlung
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    14 Tage Qualifizierungsphase
                  </h4>
                  <p className="text-sm text-muted-foreground pl-4">
                    Nach Zahlungseingang des Kunden beginnt eine 14-tägige Qualifizierungsphase. 
                    Die Provision wird am 15. Tag zur Auszahlung freigegeben.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    Erste Auszahlung
                  </h4>
                  <p className="text-sm text-muted-foreground pl-4">
                    Einmalprovision + erste Folgeprovision werden zusammen ausbezahlt.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    Folgeprovision
                  </h4>
                  <p className="text-sm text-muted-foreground pl-4">
                    Ab dem zweiten Monat erhältst du die monatliche Folgeprovision, 
                    solange der Kunde und du aktiv seid.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Aktivitätsstatus
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    Aktiv bleiben
                  </h4>
                  <p className="text-sm text-muted-foreground pl-4">
                    Du bist aktiv, wenn du innerhalb der letzten 90 Tage mindestens 
                    einen Abschluss erzielt hast.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                    Inaktiv
                  </h4>
                  <p className="text-sm text-muted-foreground pl-4">
                    Bei Inaktivität hast du weitere 90 Tage Zeit, einen neuen Abschluss zu erzielen.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    Keine Berechtigung
                  </h4>
                  <p className="text-sm text-muted-foreground pl-4">
                    Nach 180 Tagen ohne Abschluss verlierst du die Berechtigung für Folgeprovisionen. 
                    Diese kann durch einen neuen Abschluss reaktiviert werden.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Hinweis Jahresabschlüsse */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-primary" />
                Jahresabschlüsse
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Kunden können auch jährlich zahlen (11 statt 12 Monate). Bei Jahresabschlüssen 
                erhältst du die Einmalprovision sofort nach der Qualifizierung. Die Folgeprovisionen 
                werden über die 12 Monate verteilt monatlich ausbezahlt, solange du und der Kunde aktiv seid.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default PartnerDashboard;
