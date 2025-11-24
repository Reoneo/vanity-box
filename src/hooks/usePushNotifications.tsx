import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface NotificationPermission {
  granted: boolean;
  denied: boolean;
  prompt: boolean;
}

export const usePushNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>({
    granted: false,
    denied: false,
    prompt: true
  });

  useEffect(() => {
    if ('Notification' in window) {
      updatePermissionState();
    }
  }, []);

  const updatePermissionState = () => {
    if (!('Notification' in window)) return;

    const currentPermission = Notification.permission;
    setPermission({
      granted: currentPermission === 'granted',
      denied: currentPermission === 'denied',
      prompt: currentPermission === 'default'
    });
  };

  const requestPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      toast.error('Notifications not supported in this browser');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      toast.error('Notification permission was denied. Please enable it in your browser settings.');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      updatePermissionState();

      if (result === 'granted') {
        toast.success('Notifications enabled!');
        return true;
      } else {
        toast.error('Notification permission denied');
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Failed to request notification permission');
      return false;
    }
  };

  const showNotification = async (title: string, options?: NotificationOptions): Promise<void> => {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return;
    }

    if (Notification.permission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) return;
    }

    try {
      const notification = new Notification(title, {
        icon: '/vanity-box-logo.png',
        badge: '/vanity-box-logo.png',
        ...options
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  };

  const showMessageNotification = async (
    senderName: string,
    messagePreview: string,
    senderAddress?: string
  ): Promise<void> => {
    await showNotification(`New message from ${senderName}`, {
      body: messagePreview,
      tag: `message-${senderAddress || Date.now()}`,
      requireInteraction: false,
      data: { senderAddress }
    });
  };

  return {
    permission,
    requestPermission,
    showNotification,
    showMessageNotification,
    isSupported: 'Notification' in window
  };
};
