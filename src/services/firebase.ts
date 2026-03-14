import { initializeApp } from 'firebase/app';
import { getMessaging, getToken } from 'firebase/messaging';
import { api } from './api';

export const initializeFirebaseAndGetToken = async () => {
  try {
    // 1. Fetch the dynamic config from your backend
    const res = await api.get('/config/firebase');
    const config = res.data || res;

    // 2. Initialize Firebase with the dynamic config
    const app = initializeApp(config);
    const messaging = getMessaging(app);

    // 3. Request notification permissions from the user
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      // 4. Pass the config to the Service Worker via URL parameters
      // (This is required because the Service Worker needs the config to run in the background)
      const configString = encodeURIComponent(JSON.stringify(config));
      const registration = await navigator.serviceWorker.register(
        `/firebase-messaging-sw.js?firebaseConfig=${configString}`
      );

      // 5. Generate the FCM Token using the vapidKey from your backend
      const currentToken = await getToken(messaging, { 
        vapidKey: config.vapidKey,
        serviceWorkerRegistration: registration
      });

      if (currentToken) {
        console.log("🔥 FCM Token Generated:", currentToken);
        
        // TODO: Send this token to your backend so it knows where to send the notifications!
        // await api.post('/users/fcm-token', { token: currentToken });

        return currentToken;
      } else {
        console.warn('No registration token available.');
      }
    } else {
      console.warn('Notification permission denied by user.');
    }
  } catch (error) {
    console.error('Failed to initialize Firebase Push Notifications:', error);
  }
  return null;
};