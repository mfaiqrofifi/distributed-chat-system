"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  clearCurrentUserId,
  loadContacts,
  loadToken,
  saveContacts,
  saveCurrentUserId,
  StoredContact,
  upsertContact,
} from "@/lib/chat-storage";

type DirectoryUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  provider: string;
};

type PresenceResponse = {
  userId: string;
  isOnline: boolean;
  lastSeenAt?: string | null;
};

export function FollowPage() {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState("");
  const [contacts, setContacts] = useState<StoredContact[]>([]);
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [presenceMap, setPresenceMap] = useState<Record<string, PresenceResponse>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = loadToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    let cancelled = false;

    const loadUsers = async () => {
      setLoading(true);

      try {
        const meResponse = await fetch("/api/chat/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const mePayload = await meResponse.json();

        if (!meResponse.ok) {
          throw new Error(mePayload?.message ?? "Failed to load profile.");
        }

        const resolvedUserId = (mePayload?.id as string | undefined) ?? "";
        if (!resolvedUserId) {
          throw new Error("Current user id is missing.");
        }

        if (!cancelled) {
          saveCurrentUserId(resolvedUserId);
          setCurrentUserId(resolvedUserId);
          setContacts(loadContacts(resolvedUserId));
        }

        const response = await fetch("/api/chat/users", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const raw = await response.text();
        const payload = raw ? JSON.parse(raw) : null;

        if (!response.ok) {
          throw new Error(payload?.message ?? "Failed to load users.");
        }

        if (!cancelled) {
          setUsers((payload ?? []) as DirectoryUser[]);
        }
      } catch {
        clearCurrentUserId();
        if (!cancelled) {
          setUsers([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadUsers();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    saveContacts(contacts, currentUserId);
  }, [contacts, currentUserId]);

  useEffect(() => {
    if (users.length === 0) {
      setPresenceMap({});
      return;
    }

    let cancelled = false;

    const loadPresence = async () => {
      const results = await Promise.all(
        users.map(async (user) => {
          try {
            const response = await fetch(`/api/chat/presence/${encodeURIComponent(user.id)}`);
            const payload = (await response.json()) as PresenceResponse;
            return response.ok ? payload : null;
          } catch {
            return null;
          }
        }),
      );

      if (cancelled) {
        return;
      }

      const nextMap: Record<string, PresenceResponse> = {};
      for (const item of results) {
        if (item) {
          nextMap[item.userId] = item;
        }
      }

      setPresenceMap(nextMap);
    };

    void loadPresence();
    const intervalId = window.setInterval(() => {
      void loadPresence();
    }, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [users]);

  const followedContacts = useMemo(
    () => contacts.filter((contact) => contact.followed),
    [contacts],
  );

  const visibleUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return [...users]
      .filter((user) => {
        const alreadyFollowed = followedContacts.some((contact) => contact.id === user.id);
        if (alreadyFollowed) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        return (
          user.name.toLowerCase().includes(normalizedSearch) ||
          user.email.toLowerCase().includes(normalizedSearch)
        );
      })
      .sort((left, right) => {
        const leftOnline = presenceMap[left.id]?.isOnline ? 1 : 0;
        const rightOnline = presenceMap[right.id]?.isOnline ? 1 : 0;

        if (leftOnline !== rightOnline) {
          return rightOnline - leftOnline;
        }

        return left.name.localeCompare(right.name);
      });
  }, [followedContacts, presenceMap, search, users]);

  const handleFollow = (user: DirectoryUser) => {
    setContacts((current) => {
      const nextContacts = upsertContact(current, {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        followed: true,
      });

      saveContacts(nextContacts, currentUserId);
      return nextContacts;
    });
  };

  const handleUnfollow = (contactId: string) => {
    setContacts((current) => {
      const nextContacts = current.map((contact) =>
        contact.id === contactId
          ? {
              ...contact,
              followed: false,
            }
          : contact,
      );

      saveContacts(nextContacts, currentUserId);
      return nextContacts;
    });
  };

  const handleOpenChat = (contact: {
    id: string;
    name: string;
    email?: string;
    avatarUrl?: string;
  }) => {
    setContacts((current) => {
      const nextContacts = upsertContact(current, {
        id: contact.id,
        name: contact.name,
        email: contact.email,
        avatarUrl: contact.avatarUrl,
        followed: true,
      });

      saveContacts(nextContacts, currentUserId);
      return nextContacts;
    });

    router.push(`/?chat=${contact.id}`);
  };

  return (
    <main className="follow-shell">
      <section className="follow-panel">
        <header className="follow-hero">
          <div className="follow-hero__copy">
            <p className="follow-panel__eyebrow">Follow contacts</p>
            <h1>People</h1>
            <p>
              Cari user yang pernah login, follow sekali, lalu langsung buka chat.
            </p>
          </div>

          <div className="follow-hero__actions">
            <Link href="/" className="wa-primary-link">
              Back to chats
            </Link>
          </div>
        </header>

        <div className="follow-toolbar">
          <div className="follow-summary-card">
            <strong>{visibleUsers.length}</strong>
            <span>available now</span>
          </div>
          <div className="follow-summary-card">
            <strong>{Object.values(presenceMap).filter((presence) => presence.isOnline).length}</strong>
            <span>online</span>
          </div>
          <div className="follow-summary-card">
            <strong>{followedContacts.length}</strong>
            <span>following</span>
          </div>
        </div>

        <div className="follow-form">
          <label className="follow-search">
            <span className="follow-search__icon">Search</span>
            <input
              className="wa-input"
              placeholder="Search by name or email"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>

        <div className="follow-list follow-list--grid">
          <section className="follow-group">
            <div className="follow-group__title">
              <strong>Available people</strong>
              <span>{visibleUsers.length} user</span>
            </div>

            {loading ? (
              <div className="wa-empty">Loading users...</div>
            ) : visibleUsers.length === 0 ? (
              <div className="wa-empty">Belum ada user lain yang bisa ditampilkan.</div>
            ) : (
              visibleUsers.map((user) => {
                const isFollowed = followedContacts.some((contact) => contact.id === user.id);
                const presence = presenceMap[user.id];

                return (
                  <article key={user.id} className="follow-row">
                    <div className="wa-avatar wa-avatar--list">
                      {user.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={user.avatarUrl} alt={user.name} />
                      ) : (
                        <span>{user.name.slice(0, 1).toUpperCase()}</span>
                      )}
                      {presence?.isOnline ? <span className="wa-online-dot" /> : null}
                    </div>
                    <div className="follow-row__body">
                      <strong>{user.name}</strong>
                      <span>{user.email}</span>
                    </div>
                    <div className="follow-row__actions">
                      {isFollowed ? null : (
                        <button className="wa-primary-button" onClick={() => handleFollow(user)}>
                          Follow
                        </button>
                      )}
                      <button
                        className="wa-secondary-link"
                        onClick={() =>
                          handleOpenChat({
                            id: user.id,
                            name: user.name,
                            email: user.email,
                            avatarUrl: user.avatarUrl,
                          })
                        }
                      >
                        Open chat
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </section>

          <section className="follow-group">
            <div className="follow-group__title">
              <strong>Following</strong>
              <span>{followedContacts.length} contact</span>
            </div>

            {followedContacts.length === 0 ? (
              <div className="wa-empty">Belum ada contact yang kamu follow.</div>
            ) : (
              followedContacts.map((contact) => (
                <article key={contact.id} className="follow-row">
                  <div className="wa-avatar wa-avatar--list">
                    {contact.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={contact.avatarUrl} alt={contact.name} />
                    ) : (
                      <span>{contact.name.slice(0, 1).toUpperCase()}</span>
                    )}
                    {presenceMap[contact.id]?.isOnline ? <span className="wa-online-dot" /> : null}
                  </div>
                  <div className="follow-row__body">
                    <strong>{contact.name}</strong>
                    <span>{contact.email ?? contact.id}</span>
                  </div>
                  <div className="follow-row__actions">
                    <button
                      className="wa-secondary-link"
                      onClick={() =>
                        handleOpenChat({
                          id: contact.id,
                          name: contact.name,
                          email: contact.email,
                          avatarUrl: contact.avatarUrl,
                        })
                      }
                    >
                      Open chat
                    </button>
                    <button className="wa-text-button" onClick={() => handleUnfollow(contact.id)}>
                      Unfollow
                    </button>
                  </div>
                </article>
              ))
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
