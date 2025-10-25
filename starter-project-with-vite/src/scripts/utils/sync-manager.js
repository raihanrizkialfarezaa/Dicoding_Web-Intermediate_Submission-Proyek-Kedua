import StoriesService from '../data/api';
import { getPendingDrafts, deletePendingDraft, readStoriesFromDb, cacheStoriesToDb } from '../data/indexed-db';
import { showNotification } from './index';
import Auth from './auth';

let syncing = false;

function buildFormData(story) {
  const formData = new FormData();
  formData.append('description', story.description);
  if (story.photo) {
    const fileName = story.photoName || (story.photo && story.photo.name) || 'offline-photo.jpg';
    formData.append('photo', story.photo, fileName);
  }
  formData.append('lat', story.lat);
  formData.append('lon', story.lon);
  return formData;
}

export async function flushPendingStories() {
  if (syncing) {
    return;
  }

  if (!navigator.onLine) {
    return;
  }

  syncing = true;
  let hasSentStories = false;

  try {
    const pendingStories = await getPendingDrafts();
    if (!pendingStories.length) {
      return;
    }

    for (const story of pendingStories) {
      if (!navigator.onLine) {
        break;
      }

      try {
        const formData = buildFormData(story);
        const postedStory = await StoriesService.postStory(formData);
        await deletePendingDraft(story.id);
        hasSentStories = true;
        showNotification('Cerita offline berhasil dikirim', 'success');

        if (!Auth.isLoggedIn()) {
          if (postedStory && postedStory.id) {
            const normalized = {
              id: postedStory.id,
              name: postedStory.name || 'Guest User',
              description: postedStory.description || story.description,
              photoUrl: postedStory.photoUrl || story.photoUrl || null,
              createdAt: postedStory.createdAt || new Date().toISOString(),
              lat: typeof postedStory.lat === 'number' ? postedStory.lat : story.lat,
              lon: typeof postedStory.lon === 'number' ? postedStory.lon : story.lon,
            };

            const currentCache = await readStoriesFromDb();
            const deduped = currentCache.filter((s) => {
              try {
                if (!s || !s.id) return false;
                if (!String(s.id).startsWith('guest-')) return true;
                const sameDescription = String(s.description || '').trim() === String(normalized.description || '').trim();
                const sTime = s.createdAt ? Date.parse(s.createdAt) : 0;
                const nTime = normalized.createdAt ? Date.parse(normalized.createdAt) : 0;
                const closeTime = Math.abs(sTime - nTime) < 10000; 
                return !(sameDescription && closeTime);
              } catch (e) {
                return true;
              }
            });

            const updatedCache = [normalized, ...deduped];
            await cacheStoriesToDb(updatedCache);
          } else {
            const description = story.description;
            const lat = story.lat;
            const lon = story.lon;
            let photoUrl = 'https://picsum.photos/400/300?random=guest';
            if (story.photo) {
              photoUrl = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(story.photo);
              });
            }

            const guestStory = {
              id: `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              name: 'Guest User',
              description,
              photoUrl,
              createdAt: new Date().toISOString(),
              lat: Number.isFinite(lat) ? lat : -6.2088,
              lon: Number.isFinite(lon) ? lon : 106.8456,
            };

            const currentCache = await readStoriesFromDb();
            const updatedCache = [guestStory, ...currentCache];
            await cacheStoriesToDb(updatedCache);
          }
        }
      } catch (error) {
        if (error.message && error.message.includes('Unauthorized')) {
          showNotification('Sesi login berakhir. Masuk kembali untuk mengirim draft offline.', 'error');
          break;
        }
        if (!navigator.onLine) {
          break;
        }
      }
    }

    if (hasSentStories && window.location.hash.includes('#/add')) {
      setTimeout(() => {
        window.location.hash = '#/';
      }, 1000);
    }
  } finally {
    syncing = false;
  }
}

export function initOfflineSyncWatcher() {
  if (typeof window === 'undefined') {
    return;
  }

  window.addEventListener('online', () => {
    flushPendingStories();
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      flushPendingStories();
    }
  });

  flushPendingStories();
}
