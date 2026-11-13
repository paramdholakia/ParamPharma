import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@param_pharma_api_url';

// Default to LAN IP so physical Android devices on the same Wi-Fi connect immediately
export const DEFAULT_API_URL = 'http://192.168.1.4:8000/api';

export const SERVER_PRESETS = [
  { label: 'USB Cable (ADB Reverse: 127.0.0.1:8000)', url: 'http://127.0.0.1:8000/api' },
  { label: 'LAN Wi-Fi (Host PC: 192.168.1.4:8000)', url: 'http://192.168.1.4:8000/api' },
  { label: 'Android Emulator (10.0.2.2:8000)', url: 'http://10.0.2.2:8000/api' },
];

let currentApiUrl = DEFAULT_API_URL;

export async function getApiBaseUrl(): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved && saved.trim()) {
      currentApiUrl = saved.trim().replace(/\/+$/, '');
      return currentApiUrl;
    }
  } catch (err) {
    console.warn('Failed to read saved API URL:', err);
  }
  return DEFAULT_API_URL;
}

export async function setApiBaseUrl(newUrl: string): Promise<void> {
  const clean = newUrl.trim().replace(/\/+$/, '');
  currentApiUrl = clean;
  await AsyncStorage.setItem(STORAGE_KEY, clean);
}

export function getCurrentApiUrl(): string {
  return currentApiUrl;
}
