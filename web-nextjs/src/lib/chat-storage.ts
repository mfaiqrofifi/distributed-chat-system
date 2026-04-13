export const tokenStorageKey = "distributed-chat.jwt";
export const contactsStorageKey = "distributed-chat.contacts";
export const currentUserStorageKey = "distributed-chat.current-user";

export type StoredContact = {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  followed: boolean;
  lastMessagePreview?: string;
  lastMessageAt?: string;
  unreadCount?: number;
};

export function buildConversationId(firstUserId: string, secondUserId: string) {
  return `dm-${[firstUserId.trim(), secondUserId.trim()].sort().join("--")}`;
}

export function loadToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(tokenStorageKey) ?? "";
}

export function saveToken(token: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(tokenStorageKey, token);
}

export function clearToken() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(tokenStorageKey);
  window.localStorage.removeItem(currentUserStorageKey);
}

function contactsStorageKeyForUser(userId: string) {
  return `${contactsStorageKey}.${userId}`;
}

export function saveCurrentUserId(userId: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(currentUserStorageKey, userId);
}

export function loadCurrentUserId() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(currentUserStorageKey) ?? "";
}

export function clearCurrentUserId() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(currentUserStorageKey);
}

export function loadContacts(userId?: string): StoredContact[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const scopedUserId = userId?.trim() || loadCurrentUserId();
    const scopedKey = scopedUserId ? contactsStorageKeyForUser(scopedUserId) : contactsStorageKey;
    let raw = window.localStorage.getItem(scopedKey);

    if (!raw && scopedUserId) {
      raw = window.localStorage.getItem(contactsStorageKey);
      if (raw) {
        window.localStorage.setItem(scopedKey, raw);
        window.localStorage.removeItem(contactsStorageKey);
      }
    }

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as StoredContact[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    const scopedUserId = userId?.trim() || loadCurrentUserId();
    const scopedKey = scopedUserId ? contactsStorageKeyForUser(scopedUserId) : contactsStorageKey;
    window.localStorage.removeItem(scopedKey);
    return [];
  }
}

export function saveContacts(contacts: StoredContact[], userId?: string) {
  if (typeof window === "undefined") {
    return;
  }

  const scopedUserId = userId?.trim() || loadCurrentUserId();
  const scopedKey = scopedUserId ? contactsStorageKeyForUser(scopedUserId) : contactsStorageKey;
  window.localStorage.setItem(scopedKey, JSON.stringify(contacts));
}

export function upsertContact(
  current: StoredContact[],
  nextContact: Partial<StoredContact> & Pick<StoredContact, "id">,
) {
  const existing = current.find((contact) => contact.id === nextContact.id);
  const merged: StoredContact = {
    id: nextContact.id,
    name: nextContact.name?.trim() || existing?.name || fallbackContactName(nextContact.id),
    email: nextContact.email ?? existing?.email,
    avatarUrl: nextContact.avatarUrl ?? existing?.avatarUrl,
    followed: nextContact.followed ?? existing?.followed ?? false,
    lastMessagePreview: nextContact.lastMessagePreview ?? existing?.lastMessagePreview,
    lastMessageAt: nextContact.lastMessageAt ?? existing?.lastMessageAt,
    unreadCount: nextContact.unreadCount ?? existing?.unreadCount ?? 0,
  };

  if (
    existing &&
    existing.name === merged.name &&
    existing.email === merged.email &&
    existing.avatarUrl === merged.avatarUrl &&
    existing.followed === merged.followed &&
    existing.lastMessagePreview === merged.lastMessagePreview &&
    existing.lastMessageAt === merged.lastMessageAt &&
    existing.unreadCount === merged.unreadCount
  ) {
    return current;
  }

  const deduped = current.filter((contact) => contact.id !== nextContact.id);
  return [merged, ...deduped];
}

export function fallbackContactName(userId: string) {
  return `User ${userId.slice(0, 6)}`;
}
