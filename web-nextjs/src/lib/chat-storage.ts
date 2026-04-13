export const tokenStorageKey = "distributed-chat.jwt";
export const contactsStorageKey = "distributed-chat.contacts";

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
}

export function loadContacts(): StoredContact[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(contactsStorageKey);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as StoredContact[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    window.localStorage.removeItem(contactsStorageKey);
    return [];
  }
}

export function saveContacts(contacts: StoredContact[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(contactsStorageKey, JSON.stringify(contacts));
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

  const deduped = current.filter((contact) => contact.id !== nextContact.id);
  return [merged, ...deduped];
}

export function fallbackContactName(userId: string) {
  return `User ${userId.slice(0, 6)}`;
}
