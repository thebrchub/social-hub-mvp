import { useEffect } from 'react';
import { api } from '../services/api';
import { useAuthStore } from '../store/useAuthStore';

export const usePushNotifications = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return;

    const initPush = async () => {
      try {
        // 1. Ask for browser permission FIRST (must be granted to get token)
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        // 2. Fetch public Firebase config from backend
        const res = await api.get('/config/firebase');
        const config = res.data || res;
        
        if (!config.apiKey || !config.projectId) {
          console.warn('Firebase config missing from backend.');
          return;
        }

        // 3. Initialize Firebase App on the window
        const firebase = (window as any).firebase;
        if (!firebase.apps.length) {
          firebase.initializeApp(config);
        }
        const messaging = firebase.messaging();

        // 4. Register the Service Worker, passing config as URL params
        const swParams = new URLSearchParams({
          apiKey: config.apiKey,
          authDomain: config.authDomain,
          projectId: config.projectId,
          storageBucket: config.storageBucket,
          messagingSenderId: config.messagingSenderId,
          appId: config.appId,
        });
        const swReg = await navigator.serviceWorker.register(
          `/firebase-messaging-sw.js?${swParams.toString()}`
        );

        // 5. Get FCM Token
        const fcmToken = await messaging.getToken({
          vapidKey: config.vapidKey,
          serviceWorkerRegistration: swReg,
        });

        // 6. Register device token with your backend so they can push to us
        if (fcmToken) {
          await api.post('/auth/device', {
            token: fcmToken,
            device_type: 'web'
          });
          console.log('✅ Push Notifications enabled and registered!');
        }

        // 7. Foreground Messages: The backend docs say WebSockets handle realtime 
        // messages when the app is open. So we can just silently log these.
        messaging.onMessage((payload: any) => {
          console.log('[FCM Foreground]', payload);
        });

      } catch (error) {
        console.error('Failed to setup push notifications:', error);
      }
    };

    initPush();
  }, [isAuthenticated]);
};