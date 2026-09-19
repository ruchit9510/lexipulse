const QUEUE_KEY = 'lexipulse_offline_queue';

export function getOfflineQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function queueAction(action) {
  const queue = getOfflineQueue();
  queue.push({
    ...action,
    id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    queuedAt: new Date().toISOString()
  });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function flushOfflineQueue() {
  const queue = getOfflineQueue();
  if (queue.length === 0) return { synced: 0 };

  if (!navigator.onLine) {
    return { synced: 0, offline: true };
  }

  try {
    const res = await fetch('/api/pwa/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actions: queue })
    });
    const data = await res.json();
    if (data.success) {
      localStorage.removeItem(QUEUE_KEY);
      return { synced: data.syncedCount || queue.length };
    }
  } catch (e) {
    console.warn('Could not flush offline queue:', e);
  }
  return { synced: 0 };
}

// Auto-sync listener
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    flushOfflineQueue().then((res) => {
      if (res.synced > 0) {
        window.dispatchEvent(new CustomEvent('lexipulse:synced', { detail: res }));
      }
    });
  });
}
