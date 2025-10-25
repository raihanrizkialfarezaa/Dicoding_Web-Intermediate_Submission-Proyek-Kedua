const CONFIG = {
  API_ENDPOINT: 'https://story-api.dicoding.dev/v1',
  MAX_FILE_SIZE: 1048576,
  DEFAULT_LOCATION: {
    lat: -6.2088,
    lng: 106.8456,
  },
  MAP_TILE_LAYERS: {
    street: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; OpenStreetMap contributors',
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: '&copy; Esri',
    },
  },
  PUSH: {
    PUBLIC_KEY: 'BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk',
    KEY_PATHS: [],
    SUBSCRIBE_PATH: '/notifications/subscribe',
    UNSUBSCRIBE_PATH: '/notifications/subscribe',
  },
  CACHE: {
    APP_SHELL: 'dicoding-stories-shell-v1',
    STATIC: 'dicoding-stories-static-v1',
    DYNAMIC: 'dicoding-stories-dynamic-v1',
    OFFLINE_URL: '/offline.html',
  },
};

export default CONFIG;
