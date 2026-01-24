import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Settings, Nfc } from 'lucide-react';
import { nfcService } from '@/app/services/nfcService';

interface NfcPermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRetry: () => void;
  type: 'disabled' | 'permission_denied';
}

export const NfcPermissionDialog = ({ 
  open, 
  onOpenChange, 
  onRetry,
  type 
}: NfcPermissionDialogProps) => {
  
  const handleOpenSettings = async () => {
    await nfcService.openSettings();
    // Give user time to enable NFC, then check again
    setTimeout(() => {
      onRetry();
    }, 1500);
  };

  const isDisabled = type === 'disabled';
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mx-auto mb-4">
            {isDisabled ? (
              <Settings className="h-8 w-8 text-orange-600" />
            ) : (
              <Nfc className="h-8 w-8 text-orange-600" />
            )}
          </div>
          <DialogTitle className="text-center">
            {isDisabled ? 'NFC ist deaktiviert' : 'NFC-Berechtigung benötigt'}
          </DialogTitle>
          <DialogDescription className="text-center">
            {isDisabled 
              ? 'Bitte aktiviere NFC in deinen Geräteeinstellungen, um Punkte sammeln zu können.'
              : 'Die App benötigt Zugriff auf NFC, um Stempel scannen zu können. Bitte erlaube den Zugriff in den Einstellungen.'
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-3 mt-4">
          <Button onClick={handleOpenSettings} className="w-full">
            <Settings className="mr-2 h-4 w-4" />
            Einstellungen öffnen
          </Button>
          <Button variant="outline" onClick={onRetry} className="w-full">
            Erneut versuchen
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)} 
            className="w-full"
          >
            Abbrechen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
