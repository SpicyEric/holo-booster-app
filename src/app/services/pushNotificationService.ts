import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';

class PushNotificationService {
  private initialized = false;

  isNativeApp(): boolean {
    return Capacitor.isNativePlatform();
  }

  async initialize(): Promise<void> {
    if (this.initialized || !this.isNativeApp()) {
      return;
    }

    try {
      // Request permission for push notifications
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

      // Register for push notifications
      await PushNotifications.register();

      // Setup listeners
      this.setupListeners();

      // Initialize local notifications for local alerts
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

  private setupListeners(): void {
    // On registration success
    PushNotifications.addListener('registration', (token: Token) => {
      console.log('Push registration success, token:', token.value);
      // Here you could send the token to your backend for remote push notifications
      this.saveDeviceToken(token.value);
    });

    // On registration error
    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Push registration error:', error);
    });

    // On push notification received while app is in foreground
    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('Push notification received:', notification);
      // Show local notification when push is received in foreground
      this.showLocalNotification(notification.title || 'Eloyo', notification.body || '');
    });

    // On push notification tapped
    PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
      console.log('Push notification action performed:', notification);
      // Handle navigation based on notification data
      this.handleNotificationAction(notification);
    });
  }

  private async saveDeviceToken(token: string): Promise<void> {
    // Save token to localStorage for now
    // In production, you'd send this to your backend
    localStorage.setItem('push_notification_token', token);
    console.log('Device token saved:', token);
  }

  private handleNotificationAction(notification: ActionPerformed): void {
    const data = notification.notification.data;
    
    if (data?.type === 'message') {
      // Navigate to messages
      window.location.href = '/app/messages';
    } else if (data?.type === 'reward_redeemed') {
      // Navigate to rewards or history
      window.location.href = '/app/rewards';
    }
  }

  // Show local notification (for foreground or local triggers)
  async showLocalNotification(title: string, body: string, data?: Record<string, any>): Promise<void> {
    if (!this.isNativeApp()) {
      // For web, use browser notification API if available
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
            schedule: { at: new Date(Date.now() + 100) }, // Show immediately
            extra: data,
          },
        ],
      });
    } catch (error) {
      console.error('Error showing local notification:', error);
    }
  }

  // Notify about reward redemption
  async notifyRewardRedeemed(rewardTitle: string, pointsSpent: number, merchantName: string): Promise<void> {
    const title = '🎁 Prämie eingelöst!';
    const body = `Du hast "${rewardTitle}" bei ${merchantName} eingelöst. (-${pointsSpent} Punkte)`;
    
    await this.showLocalNotification(title, body, {
      type: 'reward_redeemed',
      rewardTitle,
      pointsSpent,
      merchantName,
    });
  }

  // Notify about new customer offer redemption
  async notifyNewCustomerOfferRedeemed(bonusPoints: number, merchantName: string): Promise<void> {
    const title = '🎉 Willkommen!';
    const body = `Du hast ${bonusPoints} Bonus-Punkte bei ${merchantName} erhalten!`;
    
    await this.showLocalNotification(title, body, {
      type: 'new_customer_offer',
      bonusPoints,
      merchantName,
    });
  }

  // Notify about new message received
  async notifyNewMessage(messageTitle: string, merchantName: string): Promise<void> {
    const title = `📬 Neue Nachricht von ${merchantName}`;
    const body = messageTitle;
    
    await this.showLocalNotification(title, body, {
      type: 'message',
      merchantName,
    });
  }

  // Notify about points earned
  async notifyPointsEarned(points: number, merchantName: string): Promise<void> {
    const title = '⭐ Punkte gesammelt!';
    const body = `+${points} Punkte bei ${merchantName}`;
    
    await this.showLocalNotification(title, body, {
      type: 'points_earned',
      points,
      merchantName,
    });
  }
}

export const pushNotificationService = new PushNotificationService();
