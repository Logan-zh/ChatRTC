const STORAGE_KEY = 'chatrtc.identity';

type StoredIdentity = {
  userId: string;
  displayName: string;
};

function createUserId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `user-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
}

export function loadIdentity(): StoredIdentity | null {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredIdentity;
  } catch {
    return null;
  }
}

export function persistIdentity(displayName: string) {
  const current = loadIdentity();
  const identity = {
    userId: current?.userId ?? createUserId(),
    displayName: displayName.trim(),
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
  return identity;
}
