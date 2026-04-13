"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  loadContacts,
  loadToken,
  saveContacts,
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

    setContacts(loadContacts());

    let cancelled = false;

    const loadUsers = async () => {
      setLoading(true);

      try {
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
    saveContacts(contacts);
  }, [contacts]);

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
  }, [presenceMap, search, users]);

  const handleFollow = (user: DirectoryUser) => {
    setContacts((current) =>
      upsertContact(current, {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        followed: true,
      }),
    );
  };

  const handleUnfollow = (contactId: string) => {
    setContacts((current) =>
      current.map((contact) =>
        contact.id === contactId
          ? {
              ...contact,
              followed: false,
            }
          : contact,
      ),
    );
  };

  return (
    <main className="follow-shell">
      <section className="follow-panel">
        <header className="follow-panel__header">
          <div>
            <p className="follow-panel__eyebrow">Follow contacts</p>
            <h1>Choose who you want to talk to</h1>
            <p>
              Sekarang kamu bisa lihat user internal yang sudah pernah login. Yang online
              bakal naik ke atas list, lalu tinggal klik follow.
            </p>
          </div>

          <Link href="/" className="wa-primary-link">
            Back to chats
          </Link>
        </header>

        <div className="follow-form">
          <input
            className="wa-input"
            placeholder="Search by name or email"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="follow-list">
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
                      {isFollowed ? (
                        <Link href={`/?chat=${user.id}`} className="wa-secondary-link">
                          Open chat
                        </Link>
                      ) : (
                        <button className="wa-primary-button" onClick={() => handleFollow(user)}>
                          Follow
                        </button>
                      )}
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
                    <Link href={`/?chat=${contact.id}`} className="wa-secondary-link">
                      Open chat
                    </Link>
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
