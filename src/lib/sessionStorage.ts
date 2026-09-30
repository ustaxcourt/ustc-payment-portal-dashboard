import {
  LAST_ACTIVITY_STORAGE_KEY,
  LOGOUT_SIGNAL_STORAGE_KEY,
} from "./session";

function readKey(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeKey(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    return;
  }
}

function removeKey(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    return;
  }
}

export function readLastActivity(): number | null {
  const storedValue = readKey(LAST_ACTIVITY_STORAGE_KEY);

  if (storedValue === null) {
    return null;
  }

  const parsedValue = Number.parseInt(storedValue, 10);
  return Number.isNaN(parsedValue) ? null : parsedValue;
}

export function writeLastActivity(timestamp: number) {
  writeKey(LAST_ACTIVITY_STORAGE_KEY, timestamp.toString());
}

export function clearSessionMarkers() {
  removeKey(LAST_ACTIVITY_STORAGE_KEY);
  removeKey(LOGOUT_SIGNAL_STORAGE_KEY);
}

export function broadcastLogout() {
  removeKey(LAST_ACTIVITY_STORAGE_KEY);
  writeKey(LOGOUT_SIGNAL_STORAGE_KEY, Date.now().toString());
}
