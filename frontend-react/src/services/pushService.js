// Push Service for AgriDirect
import { API } from './api';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const pushService = {
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Push Service Worker registered:', registration);
        return registration;
      } catch (error) {
        console.error('Push Service Worker registration failed:', error);
        throw error;
      }
    }
    throw new Error('Service Workers not supported');
  },

  async subscribeUser() {
    const registration = await navigator.serviceWorker.ready;
    
    // Check if subscription exists
    let subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      return subscription;
    }

    // Get VAPID public key
    const data = await API.getVapidPublicKey();
    const vapidPublicKey = data.publicKey;
    const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey
    });

    // Send subscription to backend
    await API.subscribePush(subscription);

    console.log('Push Subscription successful');
    return subscription;
  },

  async unsubscribeUser() {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      
      // Notify backend
      await API.unsubscribePush(subscription);
      
      console.log('Unsubscribed from Push');
    }
  },

  async getSubscriptionStatus() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return 'unsupported';
    }
    if (Notification.permission === 'denied') {
      return 'denied';
    }
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription ? 'subscribed' : Notification.permission; // 'granted', 'default', or 'denied'
  },

  async shouldPrompt() {
    const status = await this.getSubscriptionStatus();
    // Prompt if status is 'default' (not yet asked) and not already subscribed
    // Also, if locally marked as 'don't bother', skip it (optional)
    const declined = localStorage.getItem('push_declined_at');
    if (declined) {
      const lastDeclined = new Date(declined).getTime();
      const now = new Date().getTime();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (now - lastDeclined < sevenDays) return false;
    }
    return status === 'default';
  },

  markDeclined() {
    localStorage.setItem('push_declined_at', new Date().toISOString());
  }
};
