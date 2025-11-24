import { useState, useEffect } from 'react';
import { MiniKit } from '@worldcoin/minikit-js';
import { toast } from 'sonner';

export const useWorldNotifications = () => {
  const [hasPermission, setHasPermission] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  // Check if notifications are already permitted
  useEffect(() => {
    const checkPermission = async () => {
      if (!MiniKit.isInstalled()) return;

      try {
        const permissions = await MiniKit.commands.getPermissions();
        setHasPermission(permissions.includes('notifications'));
        console.log('📲 Notification permission status:', permissions.includes('notifications'));
      } catch (error) {
        console.error('❌ Failed to check notification permissions:', error);
      }
    };

    checkPermission();
  }, []);

  // Request notification permission
  const requestPermission = async () => {
    if (!MiniKit.isInstalled()) {
      toast.error('Please open this app in World App to enable notifications');
      return false;
    }

    if (hasPermission) {
      toast.info('Notifications are already enabled');
      return true;
    }

    setIsRequesting(true);
    try {
      console.log('📲 Requesting notification permission...');
      
      const result = await MiniKit.commands.requestPermission({
        permissionType: 'notifications'
      });

      if (result.finalPayload === 'granted') {
        setHasPermission(true);
        toast.success('Notifications enabled!');
        console.log('✅ Notification permission granted');
        return true;
      } else {
        toast.error('Notification permission denied');
        console.log('❌ Notification permission denied');
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to request notification permission:', error);
      toast.error('Failed to request notification permission');
      return false;
    } finally {
      setIsRequesting(false);
    }
  };

  return {
    hasPermission,
    isRequesting,
    requestPermission
  };
};
