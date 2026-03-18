import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { supabase } from '@/integrations/supabase/client';

class PushNotificationService {
  private initialized = false;

  isNativeApp(): boolean {
    return Capacitor.isNativePlatform();
  }

  async initialize(userId?: string): Promise<void> {
    if (this.initialized || !this.isNativeApp()) {
      return;
    }

    try {
      const permStatus = await PushNotifications.checkPermissions();
      
      if (permStatus.receive === 'prompt') {
        const result = await PushNotifications.requestPermissions();
        if (result.receive !== 'granted') {
          console.log('Push notifications permission denied');
          return;
        }
      } else if (permStatus.receive !== 'granted') {
        console.log('Push notifications permission not granted');
        return;
      }

      // Set up listeners BEFORE registering
      this.setupListeners(userId);

      // Register for remote push notifications (FCM)
      await PushNotifications.register();
      console.log('Push notifications: registration initiated');

      // Initialize local notifications too
      await this.initializeLocalNotifications();

      this.initialized = true;
      console.log('Push notifications initialized successfully');
    } catch (error) {
      console.error('Error initializing push notifications:', error);
    }
  }

  private async initializeLocalNotifications(): Promise<void> {
    try {
      const permStatus = await LocalNotifications.checkPermissions();
      if (permStatus.display === 'prompt') {
        await LocalNotifications.requestPermissions();
      }
    } catch (error) {
      console.error('Error initializing local notifications:', error);
    }
  }

  private setupListeners(userId?: string): void {
    PushNotifications.addListener('registration', (token: Token) => {
      console.log('Push registration success, token:', token.value);
      if (userId) {
        this.saveDeviceToken(token.value, userId);
      }
    });

    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Push registration error:', error);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('Push notification received in foreground:', notification);
      // Show local notification when push arrives in foreground
      this.showLocalNotification(notification.title || 'Eloyo', notification.body || '');
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
      console.log('Push notification tapped:', notification);
      this.handleNotificationAction(notification);
    });
  }

  private async saveDeviceToken(token: string, userId: string): Promise<void> {
    try {
      const platform = Capacitor.getPlatform(); // 'android' or 'ios'

      const { error } = await supabase
        .from('device_tokens')
        .upsert(
          { user_id: userId, fcm_token: token, platform, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,fcm_token' }
        );

      if (error) {
        console.error('Error saving device token:', error);
      } else {
        console.log('Device token saved to backend');
      }
    } catch (err) {
      console.error('Error saving device token:', err);
    }
  }

  private handleNotificationAction(notification: ActionPerformed): void {
    const data = notification.notification.data;
    
    if (data?.type === 'message') {
      window.location.href = data.message_id
        ? `/app/messages/${data.message_id}`
        : '/app/messages';
    } else if (data?.type === 'reward_redeemed') {
      window.location.href = '/app/rewards';
    }
  }

  async showLocalNotification(title: string, body: string, data?: Record<string, any>): Promise<void> {
    if (!this.isNativeApp()) {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body });
      }
      return;
    }

    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: Math.floor(Math.random() * 100000),
            title,
            body,
            schedule: { at: new Date(Date.now() + 100) },
            extra: data,
          },
        ],
      });
    } catch (error) {
      console.error('Error showing local notification:', error);
    }
  }

  async notifyRewardRedeemed(rewardTitle: string, pointsSpent: number, merchantName: string): Promise<void> {
    await this.showLocalNotification('🎁 Prämie eingelöst!', `Du hast "${rewardTitle}" bei ${merchantName} eingelöst. (-${pointsSpent} Punkte)`, {
      type: 'reward_redeemed', rewardTitle, pointsSpent, merchantName,
    });
  }

  async notifyNewCustomerOfferRedeemed(bonusPoints: number, merchantName: string): Promise<void> {
    await this.showLocalNotification('🎉 Willkommen!', `Du hast ${bonusPoints} Bonus-Punkte bei ${merchantName} erhalten!`, {
      type: 'new_customer_offer', bonusPoints, merchantName,
    });
  }

  async notifyNewMessage(messageTitle: string, merchantName: string): Promise<void> {
    await this.showLocalNotification(`📬 Neue Nachricht von ${merchantName}`, messageTitle, {
      type: 'message', merchantName,
    });
  }

  async notifyPointsEarned(points: number, merchantName: string): Promise<void> {
    await this.showLocalNotification('⭐ Punkte gesammelt!', `+${points} Punkte bei ${merchantName}`, {
      type: 'points_earned', points, merchantName,
    });
  }

  // Remove device token on logout
  async removeDeviceToken(userId: string): Promise<void> {
    if (!this.isNativeApp()) return;
    try {
      await supabase
        .from('device_tokens')
        .delete()
        .eq('user_id', userId);
      console.log('Device tokens removed for user');
    } catch (err) {
      console.error('Error removing device tokens:', err);
    }
  }
}

export const pushNotificationService = new PushNotificationService();
