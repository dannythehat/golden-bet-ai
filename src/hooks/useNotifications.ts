import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

// Detect if running on iOS
const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

// Detect if running as installed PWA
const isInstalledPWA = () => {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;
};

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [supported, setSupported] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [isPWA, setIsPWA] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const iosDevice = isIOS();
    const pwaInstalled = isInstalledPWA();
    setIsIOSDevice(iosDevice);
    setIsPWA(pwaInstalled);
    
    // On iOS, push notifications only work when installed as PWA
    if ('Notification' in window) {
      // iOS Safari doesn't support Notification API unless in PWA mode
      if (iosDevice && !pwaInstalled) {
        setSupported(false);
      } else {
        setSupported(true);
        setPermission(Notification.permission);
      }
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!supported) {
      toast({
        title: "Notifications not supported",
        description: "Your browser doesn't support push notifications",
        variant: "destructive",
      });
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        toast({
          title: "🔔 Notifications Enabled!",
          description: "You'll receive alerts for your bets",
        });
        return true;
      } else if (result === 'denied') {
        toast({
          title: "Push Notifications Blocked",
          description: "You can still use email alerts. Enable browser notifications in settings for push alerts.",
          duration: 5000,
        });
        // Return true anyway so users can still set up email alerts
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, [supported, toast]);

  const sendNotification = useCallback((title: string, options?: NotificationOptions & { renotify?: boolean }): boolean => {
    if (!supported || permission !== 'granted') {
      // Fallback to toast
      toast({
        title,
        description: options?.body,
      });
      return false;
    }

    try {
      // Filter out non-standard options for TypeScript
      const { renotify, ...standardOptions } = options || {};
      
      const notification = new Notification(title, {
        icon: '/favicon.png',
        badge: '/favicon.png',
        requireInteraction: false,
        ...standardOptions,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Auto-close after 10 seconds
      setTimeout(() => notification.close(), 10000);
      
      return true;
    } catch (error) {
      console.error('Error sending notification:', error);
      toast({
        title,
        description: options?.body,
      });
      return false;
    }
  }, [supported, permission, toast]);

  // Specific notification types for the app
  const notifyBetProgress = useCallback((
    homeTeam: string,
    awayTeam: string,
    stat: string,
    current: number,
    target: number
  ) => {
    const percentage = Math.round((current / target) * 100);
    const isClose = percentage >= 80;
    
    sendNotification(
      isClose ? `🔥 Almost There!` : `📊 Bet Update`,
      {
        body: `${homeTeam} vs ${awayTeam}: ${current}/${target} ${stat} (${percentage}%)`,
        tag: `${homeTeam}-${awayTeam}-${stat}`,
        renotify: isClose, // Only re-notify if close to target
      }
    );
  }, [sendNotification]);

  const notifyBetWon = useCallback((
    homeTeam: string,
    awayTeam: string,
    market: string
  ) => {
    sendNotification(
      `🎉 Bet Won!`,
      {
        body: `${homeTeam} vs ${awayTeam} - ${market} has landed!`,
        tag: `${homeTeam}-${awayTeam}-won`,
        renotify: true,
      }
    );
  }, [sendNotification]);

  const notifyNewGoldenBet = useCallback((
    homeTeam: string,
    awayTeam: string,
    market: string,
    confidence: number
  ) => {
    sendNotification(
      `🎯 New Golden Bet!`,
      {
        body: `${homeTeam} vs ${awayTeam} - ${market} (${Math.round(confidence * 100)}% confidence)`,
        tag: 'new-golden-bet',
        renotify: true,
      }
    );
  }, [sendNotification]);

  return {
    supported,
    permission,
    isIOSDevice,
    isPWA,
    requestPermission,
    sendNotification,
    notifyBetProgress,
    notifyBetWon,
    notifyNewGoldenBet,
  };
}
