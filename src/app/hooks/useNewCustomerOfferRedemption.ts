import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { nfcService, NfcReadResult } from '@/app/services/nfcService';
import { pushNotificationService } from '@/app/services/pushNotificationService';
import { toast } from 'sonner';
import { maybeAwardReferralBonus } from '@/app/lib/referralBonus';

interface UseNewCustomerOfferRedemptionProps {
  userId: string | undefined;
  merchantId: string;
  merchantName: string;
  bonusStamps: number;
  onSuccess: () => void;
}

interface RedemptionState {
  isRedeeming: boolean;
  isScanning: boolean;
  redemptionSuccess: boolean;
  error: string | null;
  showPermissionDialog: boolean;
  permissionDialogType: 'disabled' | 'permission_denied';
}

export const useNewCustomerOfferRedemption = ({ 
  userId, 
  merchantId, 
  merchantName,
  bonusStamps,
  onSuccess 
}: UseNewCustomerOfferRedemptionProps) => {
  const [state, setState] = useState<RedemptionState>({
    isRedeeming: false,
    isScanning: false,
    redemptionSuccess: false,
    error: null,
    showPermissionDialog: false,
    permissionDialogType: 'disabled',
  });

  const validateNfcChip = async (hardwareUid?: string): Promise<boolean> => {
    if (!hardwareUid) return false;

    // Look up the NFC chip directly by hardware UID
    const { data: nfcChip } = await supabase
      .from('nfc_chips')
      .select('merchant_customer_id, is_active')
      .eq('hardware_uid', hardwareUid.toLowerCase())
      .eq('is_active', true)
      .maybeSingle();

    if (!nfcChip) {
      console.log('[NewCustomerOffer] NFC chip not found for hardware UID:', hardwareUid);
      return false;
    }

    return nfcChip.merchant_customer_id === merchantId;
  };

  const processNewCustomerOffer = async (hardwareUid?: string): Promise<{ success: boolean; totalPoints?: number }> => {
    if (!userId) return { success: false };

    try {
      let nfcPointsAwarded = 0;
      let loyaltyAccountId: string | null = null;

      // Step 1: Award NFC stamp points first (if hardware UID provided)
      if (hardwareUid) {
        const { data: nfcResult, error: nfcError } = await supabase.rpc(
          'award_points_via_nfc',
          { p_hardware_uid: hardwareUid, p_user_id: userId }
        );

        const result = nfcResult as any;
        if (!nfcError && result?.success) {
          nfcPointsAwarded = result.points_awarded || 0;
          console.log('[NewCustomerOffer] NFC stamp points awarded:', nfcPointsAwarded);
        } else {
          console.warn('[NewCustomerOffer] NFC award failed, continuing with bonus only:', nfcError || result?.error);
        }
      }

      // Step 2: Get or verify loyalty account exists (NFC RPC may have created it)
      const { data: existingAccount } = await supabase
        .from('loyalty_accounts')
        .select('id, current_points_balance')
        .eq('user_id', userId)
        .eq('merchant_customer_id', merchantId)
        .maybeSingle();

      if (existingAccount) {
        loyaltyAccountId = existingAccount.id;
        
        // Add bonus points on top
        const { error: updateError } = await supabase
          .from('loyalty_accounts')
          .update({
            current_points_balance: (existingAccount.current_points_balance || 0) + bonusStamps,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingAccount.id);

        if (updateError) {
          console.error('Error adding bonus points:', updateError);
          setState(prev => ({ ...prev, error: 'Fehler beim Gutschreiben der Bonuspunkte' }));
          return { success: false };
        }
      } else {
        // No loyalty account yet (NFC didn't create one) — create with bonus points
        const { data: newAccount, error: createError } = await supabase
          .from('loyalty_accounts')
          .insert({
            user_id: userId,
            merchant_customer_id: merchantId,
            current_points_balance: bonusStamps,
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating loyalty account:', createError);
          setState(prev => ({ ...prev, error: 'Fehler beim Erstellen des Kontos' }));
          return { success: false };
        }
        loyaltyAccountId = newAccount.id;
      }

      // Step 3: Record bonus transaction
      await supabase
        .from('point_transactions')
        .insert({
          loyalty_account_id: loyaltyAccountId,
          merchant_customer_id: merchantId,
          points_change: bonusStamps,
          transaction_type: 'new_customer_bonus',
          description: 'Neukundenprämie eingelöst',
        });

      // Step 4: Create user stamp card if needed
      const { data: existingCard } = await supabase
        .from('user_stamp_cards')
        .select('id')
        .eq('user_id', userId)
        .eq('merchant_customer_id', merchantId)
        .maybeSingle();

      if (!existingCard) {
        const { data: stampCard } = await supabase
          .from('stamp_cards')
          .select('id')
          .eq('merchant_customer_id', merchantId)
          .maybeSingle();

        await supabase
          .from('user_stamp_cards')
          .insert({
            user_id: userId,
            merchant_customer_id: merchantId,
            stamp_card_id: stampCard?.id || null,
            current_points: nfcPointsAwarded + bonusStamps,
          });
      }

      const totalPoints = nfcPointsAwarded + bonusStamps;

      // Referral-Bonus zuerst prüfen — wenn ausgezahlt, übernimmt notify-referral-bonus
      // die Push-Benachrichtigung. Sonst lokale Welcome-Push.
      const referralResult = await maybeAwardReferralBonus({
        userId,
        merchantCustomerId: merchantId,
        showToast: false, // Toast wird vom Caller (Welcome-Flow) bereits gezeigt
      });

      if (!referralResult?.bonus_awarded) {
        pushNotificationService.notifyNewCustomerOfferRedeemed(totalPoints, merchantName);
      }

      return { success: true, totalPoints };
    } catch (error) {
      console.error('Error processing new customer offer:', error);
      setState(prev => ({ ...prev, error: 'Fehler beim Einlösen' }));
      return { success: false };
    }
  };

  const startRedemption = useCallback(async () => {
    setState({
      isRedeeming: true,
      isScanning: true,
      redemptionSuccess: false,
      error: null,
      showPermissionDialog: false,
      permissionDialogType: 'disabled',
    });

    const nfcSupported = await nfcService.isSupported();

    if (!nfcSupported) {
      setState({
        isRedeeming: false,
        isScanning: false,
        redemptionSuccess: false,
        error: nfcService.isNativeApp()
          ? 'NFC wird auf diesem Gerät nicht unterstützt'
          : 'NFC ist nur in der mobilen App verfügbar. Bitte nutze die Eloyo-App auf deinem Smartphone.',
        showPermissionDialog: false,
        permissionDialogType: 'disabled',
      });
      return;
    }

    // Check if NFC is enabled
    const nfcEnabled = await nfcService.isEnabled();
    if (!nfcEnabled) {
      setState(prev => ({
        ...prev,
        isScanning: false,
        showPermissionDialog: true,
        permissionDialogType: 'disabled',
      }));
      return;
    }

    // Start NFC scan
    try {
      await nfcService.startScan(async (result: NfcReadResult) => {
        if (!result.success) {
          // Check if it's a permission error
          if (result.error?.toLowerCase().includes('permission') || 
              result.error?.toLowerCase().includes('berechtigung')) {
            setState(prev => ({
              ...prev,
              isScanning: false,
              showPermissionDialog: true,
              permissionDialogType: 'permission_denied',
            }));
            return;
          }
          
          setState(prev => ({
            ...prev,
            isScanning: false,
            error: result.error || 'NFC Scan fehlgeschlagen',
          }));
          return;
        }

        // Validate the NFC chip belongs to the correct merchant (hardware UID only)
        const isValid = await validateNfcChip(result.hardwareUid);
        
        if (!isValid) {
          setState(prev => ({
            ...prev,
            isScanning: false,
            error: 'Dieser Stempel gehört nicht zu diesem Geschäft',
          }));
          toast.error('Falscher Stempel! Bitte verwende den Stempel von diesem Geschäft.');
          return;
        }

        // Process the new customer offer with NFC stamp points
        const offerResult = await processNewCustomerOffer(result.hardwareUid);
        
        if (offerResult.success) {
          setState({
            isRedeeming: true,
            isScanning: false,
            redemptionSuccess: true,
            error: null,
            showPermissionDialog: false,
            permissionDialogType: 'disabled',
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
    } catch (error: any) {
      console.error('NFC scan start error:', error);
      if (error.message?.toLowerCase().includes('permission') || 
          error.message?.toLowerCase().includes('berechtigung')) {
        setState(prev => ({
          ...prev,
          isScanning: false,
          showPermissionDialog: true,
          permissionDialogType: 'permission_denied',
        }));
      } else {
        setState(prev => ({
          ...prev,
          isScanning: false,
          error: error.message || 'NFC Scan konnte nicht gestartet werden',
        }));
      }
    }
  }, [userId, merchantId, bonusStamps, onSuccess]);

  const retryAfterPermission = useCallback(async () => {
    setState(prev => ({ ...prev, showPermissionDialog: false }));
    const enabled = await nfcService.isEnabled();
    if (enabled) {
      startRedemption();
    }
  }, [startRedemption]);

  const closePermissionDialog = useCallback(() => {
    setState(prev => ({ ...prev, showPermissionDialog: false }));
  }, []);

  const cancelRedemption = useCallback(() => {
    nfcService.stopScan();
    setState({
      isRedeeming: false,
      isScanning: false,
      redemptionSuccess: false,
      error: null,
      showPermissionDialog: false,
      permissionDialogType: 'disabled',
    });
  }, []);

  const reset = useCallback(() => {
    setState({
      isRedeeming: false,
      isScanning: false,
      redemptionSuccess: false,
      error: null,
      showPermissionDialog: false,
      permissionDialogType: 'disabled',
    });
  }, []);

  return {
    ...state,
    startRedemption,
    cancelRedemption,
    reset,
    retryAfterPermission,
    closePermissionDialog,
  };
};
