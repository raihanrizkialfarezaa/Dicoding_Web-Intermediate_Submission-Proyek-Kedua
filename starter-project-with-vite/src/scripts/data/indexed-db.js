const DB_NAME = 'dicodingStoriesStorage';
const DB_VERSION = 2;
const STORY_STORE = 'stories';
const PENDING_STORE = 'pendingStories';
const SETTINGS_STORE = 'settings';

let openRequest;

function openDatabase() {
  if (openRequest) {
    return openRequest;
  }

  openRequest = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      if (!database.objectStoreNames.contains(STORY_STORE)) {
        database.createObjectStore(STORY_STORE, { keyPath: 'id' });
      }

      if (!database.objectStoreNames.contains(PENDING_STORE)) {
        database.createObjectStore(PENDING_STORE, { keyPath: 'id' });
      }

      if (!database.objectStoreNames.contains(SETTINGS_STORE)) {
        database.createObjectStore(SETTINGS_STORE, { keyPath: 'name' });
      }
    };

    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => {
        database.close();
      };
      resolve(database);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });

  return openRequest;
}

async function withStore(storeName, mode, callback) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    let result;

    try {
      result = callback(store, transaction);
    } catch (error) {
      transaction.abort();
      reject(error);
      return;
    }

    transaction.oncomplete = () => {
      Promise.resolve(result).then(resolve).catch(reject);
    };
    transaction.onabort = () => {
      reject(transaction.error);
    };
    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
}

export async function cacheStoriesToDb(stories) {
  return withStore(STORY_STORE, 'readwrite', (store) => {
    return new Promise((resolve, reject) => {
      const clearRequest = store.clear();

      clearRequest.onsuccess = () => {
        stories.forEach((story) => {
          if (story && story.id) {
            store.put(story);
          }
        });
        resolve(true);
      };

      clearRequest.onerror = () => {
        reject(clearRequest.error);
      };
    });
  });
}

export async function readStoriesFromDb() {
  return withStore(STORY_STORE, 'readonly', (store) => {
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        resolve(request.result || []);
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  });
}

export async function savePendingDraft(story) {
  const entry = {
    ...story,
    id: story.id || `pending-${Date.now()}`,
  };

  await withStore(PENDING_STORE, 'readwrite', (store) => {
    return new Promise((resolve, reject) => {
      const putRequest = store.put(entry);
      putRequest.onsuccess = () => resolve(entry.id);
      putRequest.onerror = () => reject(putRequest.error);
    });
  });

  return entry.id;
}

export async function getPendingDrafts() {
  return withStore(PENDING_STORE, 'readonly', (store) => {
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  });
}

export async function deletePendingDraft(id) {
  return withStore(PENDING_STORE, 'readwrite', (store) => {
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  });
}

export async function saveSetting(name, value) {
  return withStore(SETTINGS_STORE, 'readwrite', (store) => {
    return new Promise((resolve, reject) => {
      const request = store.put({ name, value });
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  });
}

export async function readSettingValue(name) {
  return withStore(SETTINGS_STORE, 'readonly', (store) => {
    return new Promise((resolve, reject) => {
      const request = store.get(name);
      request.onsuccess = () => {
        const record = request.result;
        resolve(record ? record.value : null);
      };
      request.onerror = () => reject(request.error);
    });
  });
}

export default {
  cacheStoriesToDb,
  readStoriesFromDb,
  savePendingDraft,
  getPendingDrafts,
  deletePendingDraft,
  saveSetting,
  readSettingValue,
};
