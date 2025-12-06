import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { pushNotificationService } from '@/app/services/pushNotificationService';
import { useAuth } from '@/hooks/useAuth';

/**
 * Hook to listen for new messages and trigger push notifications.
 * Should be used in the main app component.
 */
export const useMessageNotifications = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    console.log('Setting up message notification listener for user:', user.id);

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
          console.log('New message received:', payload);
          
          const newMessage = payload.new as {
            id: string;
            title: string;
            body: string;
            merchant_customer_id: string;
            user_id: string;
          };

          // Fetch merchant name for the notification
          try {
            const { data: merchant } = await supabase
              .from('customers')
              .select('name')
              .eq('id', newMessage.merchant_customer_id)
              .single();

            const merchantName = merchant?.name || 'Ein Geschäft';
            
            // Trigger push notification
            await pushNotificationService.notifyNewMessage(
              newMessage.title,
              merchantName
            );
            
            console.log('Push notification sent for new message from:', merchantName);
          } catch (error) {
            console.error('Error sending message notification:', error);
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up message notification listener');
      supabase.removeChannel(channel);
    };
  }, [user?.id]);
};
