import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { nfcService, NfcReadResult } from '@/app/services/nfcService';
import { pushNotificationService } from '@/app/services/pushNotificationService';
import { toast } from 'sonner';

interface UseRewardRedemptionProps {
  userId: string | undefined;
  merchantId: string;
  merchantName: string;
  rewardTitle: string;
  onSuccess: (pointsChange: number) => void;
}

interface RedemptionState {
  isRedeeming: boolean;
  isScanning: boolean;
  redemptionSuccess: boolean;
  error: string | null;
  showPermissionDialog: boolean;
  permissionDialogType: 'disabled' | 'permission_denied';
}

export const useRewardRedemption = ({ userId, merchantId, merchantName, rewardTitle, onSuccess }: UseRewardRedemptionProps) => {
  const [state, setState] = useState<RedemptionState>({
    isRedeeming: false,
    isScanning: false,
    redemptionSuccess: false,
    error: null,
    showPermissionDialog: false,
    permissionDialogType: 'disabled',
  });
  
  const [pendingReward, setPendingReward] = useState<{ id: string; points: number } | null>(null);

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
      console.log('[RewardRedemption] NFC chip not found for hardware UID:', hardwareUid);
      return false;
    }

    return nfcChip.merchant_customer_id === merchantId;
  };

  const redeemReward = async (rewardId: string, pointsRequired: number): Promise<boolean> => {
    if (!userId) return false;

    try {
      // Get or create loyalty account
      let { data: loyaltyAccount } = await supabase
        .from('loyalty_accounts')
        .select('id, current_points_balance')
        .eq('user_id', userId)
        .eq('merchant_customer_id', merchantId)
        .maybeSingle();

      if (!loyaltyAccount) {
        return false; // No loyalty account means no points
      }

      if ((loyaltyAccount.current_points_balance || 0) < pointsRequired) {
        setState(prev => ({ ...prev, error: 'Nicht genügend Punkte' }));
        return false;
      }

      // Deduct points
      const newBalance = (loyaltyAccount.current_points_balance || 0) - pointsRequired;
      await supabase
        .from('loyalty_accounts')
        .update({ current_points_balance: newBalance })
        .eq('id', loyaltyAccount.id);

      // Also update user_stamp_cards for consistency
      await supabase
        .from('user_stamp_cards')
        .update({ current_points: newBalance })
        .eq('user_id', userId)
        .eq('merchant_customer_id', merchantId);

      // Record the redemption
      await supabase
        .from('reward_redemptions')
        .insert({
          user_id: userId,
          reward_id: rewardId,
          loyalty_account_id: loyaltyAccount.id,
          merchant_customer_id: merchantId,
          points_spent: pointsRequired,
          status: 'completed',
        });

      // Record transaction
      await supabase
        .from('point_transactions')
        .insert({
          loyalty_account_id: loyaltyAccount.id,
          merchant_customer_id: merchantId,
          points_change: -pointsRequired,
          transaction_type: 'redemption',
          description: `Prämie eingelöst: ${rewardTitle}`,
        });

      // Send push notification
      pushNotificationService.notifyRewardRedeemed(rewardTitle, pointsRequired, merchantName);

      return true;
    } catch (error) {
      console.error('Error redeeming reward:', error);
      setState(prev => ({ ...prev, error: 'Fehler beim Einlösen' }));
      return false;
    }
  };

  const startRedemption = useCallback(async (rewardId: string, pointsRequired: number) => {
    setPendingReward({ id: rewardId, points: pointsRequired });
    
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
      // For web preview/testing, simulate successful scan after 3 seconds
      if (!nfcService.isNativeApp()) {
        toast.info('NFC nicht verfügbar - Simuliere Scan für Test...');
        setTimeout(async () => {
          const success = await redeemReward(rewardId, pointsRequired);
          if (success) {
            setState({
              isRedeeming: true,
              isScanning: false,
              redemptionSuccess: true,
              error: null,
              showPermissionDialog: false,
              permissionDialogType: 'disabled',
            });
            onSuccess(-pointsRequired);
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

        // Process the redemption
        const success = await redeemReward(rewardId, pointsRequired);
        
        if (success) {
          setState({
            isRedeeming: true,
            isScanning: false,
            redemptionSuccess: true,
            error: null,
            showPermissionDialog: false,
            permissionDialogType: 'disabled',
          });
          onSuccess(-pointsRequired);
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
  }, [userId, merchantId, onSuccess]);

  const retryAfterPermission = useCallback(async () => {
    setState(prev => ({ ...prev, showPermissionDialog: false }));
    const enabled = await nfcService.isEnabled();
    if (enabled && pendingReward) {
      startRedemption(pendingReward.id, pendingReward.points);
    }
  }, [pendingReward, startRedemption]);

  const closePermissionDialog = useCallback(() => {
    setState(prev => ({ ...prev, showPermissionDialog: false }));
  }, []);

  const cancelRedemption = useCallback(() => {
    nfcService.stopScan();
    setPendingReward(null);
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
    setPendingReward(null);
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
