import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { nfcService, NfcReadResult } from '@/app/services/nfcService';
import { toast } from 'sonner';

interface UseNewCustomerOfferRedemptionProps {
  userId: string | undefined;
  merchantId: string;
  bonusStamps: number;
  onSuccess: () => void;
}

interface RedemptionState {
  isRedeeming: boolean;
  isScanning: boolean;
  redemptionSuccess: boolean;
  error: string | null;
}

export const useNewCustomerOfferRedemption = ({ 
  userId, 
  merchantId, 
  bonusStamps,
  onSuccess 
}: UseNewCustomerOfferRedemptionProps) => {
  const [state, setState] = useState<RedemptionState>({
    isRedeeming: false,
    isScanning: false,
    redemptionSuccess: false,
    error: null,
  });

  const validateNfcChip = async (chipData: string): Promise<boolean> => {
    const parts = chipData.split(':');
    if (parts.length !== 2) {
      return false;
    }

    const [boxId] = parts;

    // Check if this NFC chip belongs to the correct merchant
    const { data: nfcChip, error } = await supabase
      .from('nfc_chips')
      .select('merchant_customer_id, is_active')
      .eq('chip_uid', chipData)
      .maybeSingle();

    if (error || !nfcChip) {
      // Try looking up by box_id pattern
      const { data: box } = await supabase
        .from('boxes')
        .select('id')
        .eq('box_id', boxId)
        .maybeSingle();

      if (box) {
        const { data: customerBox } = await supabase
          .from('customer_boxes')
          .select('customer_id')
          .eq('box_id', box.id)
          .maybeSingle();

        if (customerBox && customerBox.customer_id === merchantId) {
          return true;
        }
      }
      return false;
    }

    return nfcChip.merchant_customer_id === merchantId && nfcChip.is_active;
  };

  const processNewCustomerOffer = async (): Promise<boolean> => {
    if (!userId) return false;

    try {
      // Check if user already has a stamp card for this merchant (shouldn't happen, but safety check)
      const { data: existingCard } = await supabase
        .from('user_stamp_cards')
        .select('id')
        .eq('user_id', userId)
        .eq('merchant_customer_id', merchantId)
        .maybeSingle();

      if (existingCard) {
        setState(prev => ({ ...prev, error: 'Du hast bereits Punkte bei diesem Geschäft gesammelt' }));
        return false;
      }

      // Get stamp card design for this merchant
      const { data: stampCard } = await supabase
        .from('stamp_cards')
        .select('id')
        .eq('merchant_customer_id', merchantId)
        .maybeSingle();

      // Create loyalty account with bonus points
      const { data: loyaltyAccount, error: loyaltyError } = await supabase
        .from('loyalty_accounts')
        .insert({
          user_id: userId,
          merchant_customer_id: merchantId,
          current_points_balance: bonusStamps,
        })
        .select()
        .single();

      if (loyaltyError) {
        console.error('Error creating loyalty account:', loyaltyError);
        setState(prev => ({ ...prev, error: 'Fehler beim Erstellen des Kontos' }));
        return false;
      }

      // Create user stamp card
      await supabase
        .from('user_stamp_cards')
        .insert({
          user_id: userId,
          merchant_customer_id: merchantId,
          stamp_card_id: stampCard?.id || null,
          current_points: bonusStamps,
        });

      // Record transaction
      await supabase
        .from('point_transactions')
        .insert({
          loyalty_account_id: loyaltyAccount.id,
          merchant_customer_id: merchantId,
          points_change: bonusStamps,
          transaction_type: 'new_customer_bonus',
          description: 'Neukundenprämie eingelöst',
        });

      return true;
    } catch (error) {
      console.error('Error processing new customer offer:', error);
      setState(prev => ({ ...prev, error: 'Fehler beim Einlösen' }));
      return false;
    }
  };

  const startRedemption = useCallback(async () => {
    setState({
      isRedeeming: true,
      isScanning: true,
      redemptionSuccess: false,
      error: null,
    });

    const nfcSupported = await nfcService.isSupported();
    
    if (!nfcSupported) {
      // For web preview/testing, simulate successful scan
      if (!nfcService.isNativeApp()) {
        toast.info('NFC nicht verfügbar - Simuliere Scan für Test...');
        setTimeout(async () => {
          const success = await processNewCustomerOffer();
          if (success) {
            setState({
              isRedeeming: true,
              isScanning: false,
              redemptionSuccess: true,
              error: null,
            });
            onSuccess();
          } else {
            setState(prev => ({
              ...prev,
              isScanning: false,
              error: prev.error || 'Einlösung fehlgeschlagen',
            }));
          }
        }, 2000);
        return;
      }
      
      setState({
        isRedeeming: false,
        isScanning: false,
        redemptionSuccess: false,
        error: 'NFC wird auf diesem Gerät nicht unterstützt',
      });
      return;
    }

    // Start NFC scan
    await nfcService.startScan(async (result: NfcReadResult) => {
      if (!result.success) {
        setState(prev => ({
          ...prev,
          isScanning: false,
          error: result.error || 'NFC Scan fehlgeschlagen',
        }));
        return;
      }

      // Validate the NFC chip belongs to the correct merchant
      const isValid = await validateNfcChip(result.chipData);
      
      if (!isValid) {
        setState(prev => ({
          ...prev,
          isScanning: false,
          error: 'Dieser Stempel gehört nicht zu diesem Geschäft',
        }));
        toast.error('Falscher Stempel! Bitte verwende den Stempel von diesem Geschäft.');
        return;
      }

      // Process the new customer offer
      const success = await processNewCustomerOffer();
      
      if (success) {
        setState({
          isRedeeming: true,
          isScanning: false,
          redemptionSuccess: true,
          error: null,
        });
        onSuccess();
      } else {
        setState(prev => ({
          ...prev,
          isScanning: false,
          error: prev.error || 'Einlösung fehlgeschlagen',
        }));
      }
    });
  }, [userId, merchantId, bonusStamps, onSuccess]);

  const cancelRedemption = useCallback(() => {
    nfcService.stopScan();
    setState({
      isRedeeming: false,
      isScanning: false,
      redemptionSuccess: false,
      error: null,
    });
  }, []);

  const reset = useCallback(() => {
    setState({
      isRedeeming: false,
      isScanning: false,
      redemptionSuccess: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    startRedemption,
    cancelRedemption,
    reset,
  };
};
