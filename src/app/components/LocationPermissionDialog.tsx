import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Settings, MapPin } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

interface LocationPermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRetry: () => void;
  onOpenSettings: () => void;
}

export const LocationPermissionDialog = ({ 
  open, 
  onOpenChange, 
  onRetry,
  onOpenSettings
}: LocationPermissionDialogProps) => {
  
  const handleOpenSettings = async () => {
    onOpenSettings();
    // Give user time to enable location, then check again
    setTimeout(() => {
      onRetry();
    }, 1500);
  };

  const isNative = Capacitor.isNativePlatform();
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mx-auto mb-4">
            <MapPin className="h-8 w-8 text-orange-600" />
          </div>
          <DialogTitle className="text-center">
            Standortzugriff benötigt
          </DialogTitle>
          <DialogDescription className="text-center">
            Um dir Geschäfte in deiner Nähe anzuzeigen, benötigt Eloyo Zugriff auf deinen Standort.
            {isNative && (
              <span className="block mt-2 text-sm">
                Bitte erlaube den Standortzugriff in den App-Einstellungen.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-3 mt-4">
          {isNative && (
            <Button onClick={handleOpenSettings} className="w-full">
              <Settings className="mr-2 h-4 w-4" />
              Einstellungen öffnen
            </Button>
          )}
          <Button variant={isNative ? "outline" : "default"} onClick={onRetry} className="w-full">
            <MapPin className="mr-2 h-4 w-4" />
            {isNative ? 'Erneut versuchen' : 'Standort erlauben'}
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)} 
            className="w-full"
          >
            Ohne Standort fortfahren
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
