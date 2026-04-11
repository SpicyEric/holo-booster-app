import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { pushNotificationService } from '@/app/services/pushNotificationService';
import { useAuth } from '@/hooks/useAuth';

/**
 * On web, listens for new messages and shows browser notifications.
 * Native delivery is handled server-side via FCM.
 */
export const useMessageNotifications = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id || pushNotificationService.isNativeApp()) return;

    console.log('Setting up web message notification listener for user:', user.id);

    const channel = supabase
      .channel('message-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'app_messages',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          console.log('New web message received:', payload);

          const newMessage = payload.new as {
            id: string;
            title: string;
            body: string;
            merchant_customer_id: string;
            user_id: string;
          };

          try {
            const { data: merchant } = await supabase
              .from('customers')
              .select('name')
              .eq('id', newMessage.merchant_customer_id)
              .single();

            const merchantName = merchant?.name || 'Ein Geschäft';

            await pushNotificationService.notifyNewMessage(
              newMessage.title,
              merchantName
            );

            console.log('Web notification sent for new message from:', merchantName);
          } catch (error) {
            console.error('Error sending web message notification:', error);
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up web message notification listener');
      supabase.removeChannel(channel);
    };
  }, [user?.id]);
};
