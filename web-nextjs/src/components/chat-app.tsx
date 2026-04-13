"use client";

import {
  HubConnection,
  HubConnectionBuilder,
  LogLevel,
} from "@microsoft/signalr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildConversationId,
  clearCurrentUserId,
  clearToken,
  fallbackContactName,
  loadContacts,
  loadToken,
  saveContacts,
  saveCurrentUserId,
  StoredContact,
  upsertContact,
} from "@/lib/chat-storage";

type CurrentUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  provider: string;
};

type PresenceResponse = {
  userId: string;
  isOnline: boolean;
  lastSeenAt?: string | null;
};

type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  status: "sent" | "delivered" | "read" | string;
  createdAt: string;
};

type RealtimeMessagePayload = {
  messageId: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  status: string;
  createdAt?: string;
  timestamp?: string;
};

const realtimeBaseUrl =
  process.env.NEXT_PUBLIC_REALTIME_BASE_URL ?? "http://localhost:5002";

function formatMessageTime(timestamp?: string) {
  if (!timestamp) {
    return "";
  }

  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function formatLastSeen(timestamp?: string | null) {
  if (!timestamp) {
    return "Offline";
  }

  return `last seen ${new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp))}`;
}

function statusIcon(status: string) {
  if (status === "read") {
    return "Read";
  }

  if (status === "delivered") {
    return "Delivered";
  }

  return "Sent";
}

function renderAvatar(name: string) {
  return name.slice(0, 1).toUpperCase();
}

export function ChatApp() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [profile, setProfile] = useState<CurrentUser | null>(null);
  const [contacts, setContacts] = useState<StoredContact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [presenceMap, setPresenceMap] = useState<Record<string, PresenceResponse>>({});
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const connectionRef = useRef<HubConnection | null>(null);
  const readInFlightRef = useRef(false);

  const selectedContact = useMemo(
    () => contacts.find((contact) => contact.id === selectedContactId) ?? null,
    [contacts, selectedContactId],
  );

  const activeConversationId = useMemo(() => {
    if (!profile || !selectedContact) {
      return "";
    }

    return buildConversationId(profile.id, selectedContact.id);
  }, [profile, selectedContact]);

  const selectedContactSnapshot = useMemo(() => {
    if (!selectedContact) {
      return null;
    }

    return {
      id: selectedContact.id,
      name: selectedContact.name,
      email: selectedContact.email,
      avatarUrl: selectedContact.avatarUrl,
      followed: selectedContact.followed,
      lastMessageAt: selectedContact.lastMessageAt,
      lastMessagePreview: selectedContact.lastMessagePreview,
    };
  }, [selectedContact]);

  const sortedContacts = useMemo(() => {
    return [...contacts].sort((left, right) => {
      const leftAt = left.lastMessageAt ? new Date(left.lastMessageAt).getTime() : 0;
      const rightAt = right.lastMessageAt ? new Date(right.lastMessageAt).getTime() : 0;

      if (leftAt !== rightAt) {
        return rightAt - leftAt;
      }

      if (left.followed !== right.followed) {
        return left.followed ? -1 : 1;
      }

      return left.name.localeCompare(right.name);
    });
  }, [contacts]);

  useEffect(() => {
    const storedToken = loadToken();

    if (!storedToken) {
      router.replace("/login");
      return;
    }

    setToken(storedToken);
  }, [router]);

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;

    const loadProfile = async () => {
      setLoadingProfile(true);

      try {
        const response = await fetch("/api/chat/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.message ?? "Failed to load profile.");
        }

        if (!cancelled) {
          const nextProfile = payload as CurrentUser;
          saveCurrentUserId(nextProfile.id);
          setProfile(nextProfile);
          setContacts(loadContacts(nextProfile.id));
        }
      } catch {
        clearToken();
        clearCurrentUserId();
        if (!cancelled) {
          router.replace("/login");
        }
      } finally {
        if (!cancelled) {
          setLoadingProfile(false);
        }
      }
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [router, token]);

  useEffect(() => {
    if (!profile) {
      return;
    }

    setContacts((current) => current.filter((contact) => contact.id !== profile.id));
  }, [profile]);

  useEffect(() => {
    if (!profile) {
      return;
    }

    saveContacts(contacts, profile.id);
  }, [contacts, profile]);

  useEffect(() => {
    if (!profile || !token) {
      return;
    }

    const connection = new HubConnectionBuilder()
      .withUrl(`${realtimeBaseUrl}/hubs/chat`, {
        accessTokenFactory: async () => token,
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    connection.on("message.received", (payload: RealtimeMessagePayload) => {
      const normalized: ChatMessage = {
        id: payload.messageId,
        conversationId: payload.conversationId,
        senderId: payload.senderId,
        receiverId: payload.receiverId,
        content: payload.content,
        status: payload.status,
        createdAt: payload.createdAt ?? payload.timestamp ?? new Date().toISOString(),
      };

      const otherUserId =
        normalized.senderId === profile.id ? normalized.receiverId : normalized.senderId;

      setContacts((current) =>
        upsertContact(current, {
          id: otherUserId,
          lastMessageAt: normalized.createdAt,
          lastMessagePreview: normalized.content,
          unreadCount:
            selectedContactId === otherUserId && document.visibilityState === "visible"
              ? 0
              : (current.find((contact) => contact.id === otherUserId)?.unreadCount ?? 0) + 1,
        }),
      );

      setMessages((current) => {
        const exists = current.some((message) => message.id === normalized.id);
        if (exists) {
          return current;
        }

        if (selectedContactId && otherUserId !== selectedContactId) {
          return current;
        }

        return [...current, normalized];
      });
    });

    connectionRef.current = connection;
    void connection.start();

    return () => {
      connection.off("message.received");
      void connection.stop();
      connectionRef.current = null;
    };
  }, [profile, selectedContactId, token]);

  useEffect(() => {
    const selectedFromQuery = new URLSearchParams(window.location.search).get("chat");
    if (selectedFromQuery) {
      setSelectedContactId(selectedFromQuery);
      setShowMobileChat(true);
    }
  }, []);

  useEffect(() => {
    if (!token || !activeConversationId || !selectedContactSnapshot) {
      setMessages([]);
      return;
    }

    let cancelled = false;

    const loadConversation = async (silent = false) => {
      if (!silent) {
        setLoadingMessages(true);
      }

      try {
        const response = await fetch(
          `/api/chat/conversation/${encodeURIComponent(activeConversationId)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.message ?? "Failed to load conversation.");
        }

        if (!cancelled) {
          const loadedMessages = payload as ChatMessage[];
          setMessages((current) => {
            const sameLength = current.length === loadedMessages.length;
            const sameItems =
              sameLength &&
              current.every((message, index) => {
                const nextMessage = loadedMessages[index];
                return (
                  message.id === nextMessage.id &&
                  message.status === nextMessage.status &&
                  message.content === nextMessage.content &&
                  message.createdAt === nextMessage.createdAt
                );
              });

            return sameItems ? current : loadedMessages;
          });

          const latest = loadedMessages.at(-1);
          setContacts((current) =>
            upsertContact(current, {
              id: selectedContactSnapshot.id,
              name: selectedContactSnapshot.name,
              email: selectedContactSnapshot.email,
              avatarUrl: selectedContactSnapshot.avatarUrl,
              followed: selectedContactSnapshot.followed,
              unreadCount: 0,
              lastMessageAt: latest?.createdAt ?? selectedContactSnapshot.lastMessageAt,
              lastMessagePreview: latest?.content ?? selectedContactSnapshot.lastMessagePreview,
            }),
          );
        }
      } finally {
        if (!cancelled && !silent) {
          setLoadingMessages(false);
        }
      }
    };

    void loadConversation();
    const intervalId = window.setInterval(() => {
      void loadConversation(true);
    }, 10000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [activeConversationId, selectedContactSnapshot, token]);

  useEffect(() => {
    if (contacts.length === 0) {
      setPresenceMap({});
      return;
    }

    let cancelled = false;

    const loadPresence = async () => {
      const results = await Promise.all(
        contacts.map(async (contact) => {
          try {
            const response = await fetch(`/api/chat/presence/${encodeURIComponent(contact.id)}`);
            const payload = (await response.json()) as PresenceResponse;

            if (!response.ok) {
              return null;
            }

            return payload;
          } catch {
            return null;
          }
        }),
      );

      if (cancelled) {
        return;
      }

      const nextMap: Record<string, PresenceResponse> = {};

      for (const presence of results) {
        if (presence) {
          nextMap[presence.userId] = presence;
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
  }, [contacts]);

  useEffect(() => {
    if (!profile || !activeConversationId || readInFlightRef.current) {
      return;
    }

    const unreadIncomingIds = messages
      .filter(
        (message) =>
          message.conversationId === activeConversationId &&
          message.receiverId === profile.id &&
          message.senderId !== profile.id &&
          message.status !== "read",
      )
      .map((message) => message.id);

    if (unreadIncomingIds.length === 0) {
      return;
    }

    readInFlightRef.current = true;

    const markRead = async () => {
      try {
        const response = await fetch("/api/chat/read", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            conversationId: activeConversationId,
            userId: profile.id,
            messageIds: unreadIncomingIds,
          }),
        });

        if (response.ok) {
          setMessages((current) =>
            current.map((message) =>
              unreadIncomingIds.includes(message.id)
                ? {
                    ...message,
                    status: "read",
                  }
                : message,
            ),
          );

          if (selectedContact) {
            setContacts((current) =>
              upsertContact(current, {
                id: selectedContact.id,
                unreadCount: 0,
              }),
            );
          }
        }
      } finally {
        readInFlightRef.current = false;
      }
    };

    void markRead();
  }, [activeConversationId, messages, profile, selectedContact]);

  const handleLogout = () => {
    clearToken();
    clearCurrentUserId();
    router.replace("/login");
  };

  const handleSelectContact = (contactId: string) => {
    setSelectedContactId(contactId);
    setShowMobileChat(true);

    const selected = contacts.find((contact) => contact.id === contactId);
    if (selected) {
      setContacts((current) =>
        upsertContact(current, {
          ...selected,
          unreadCount: 0,
        }),
      );
    }
  };

  const handleSendMessage = async () => {
    if (!selectedContact || !activeConversationId || !token.trim() || !messageInput.trim()) {
      return;
    }

    setSending(true);

    try {
      const response = await fetch("/api/chat/messages", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId: activeConversationId,
          receiverId: selectedContact.id,
          content: messageInput.trim(),
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "Failed to send message.");
      }

      const sentMessage = payload as ChatMessage;
      setMessages((current) => [...current, sentMessage]);
      setMessageInput("");
      setContacts((current) =>
        upsertContact(current, {
          ...selectedContact,
          lastMessageAt: sentMessage.createdAt,
          lastMessagePreview: sentMessage.content,
        }),
      );
    } finally {
      setSending(false);
    }
  };

  if (loadingProfile) {
    return (
      <main className="loading-screen">
        <div className="loading-card">Preparing your chats...</div>
      </main>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <main className="wa-shell">
      <section className={`wa-sidebar ${showMobileChat ? "wa-sidebar--hidden-mobile" : ""}`}>
        <header className="wa-sidebar__header">
          <div className="wa-profile">
            <div className="wa-avatar">
              {profile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatarUrl} alt={profile.name} />
              ) : (
                <span>{renderAvatar(profile.name)}</span>
              )}
            </div>
            <div className="wa-profile__copy">
              <strong>{profile.name}</strong>
              <span>{profile.email}</span>
            </div>
          </div>

          <div className="wa-header-actions">
            <Link href="/follow" className="icon-button icon-button--ghost" title="Manage contacts">
              +
            </Link>
            <button
              className="icon-button icon-button--text"
              onClick={handleLogout}
              title="Logout"
            >
              Log out
            </button>
          </div>
        </header>

        <div className="wa-sidebar__tabs">
          <p>Chats</p>
          <Link href="/follow">Contacts</Link>
        </div>

        <div className="wa-chat-list">
          {sortedContacts.length === 0 ? (
            <div className="wa-empty">
              Follow someone first, or wait for a new incoming message so your chat list starts filling up.
            </div>
          ) : (
            sortedContacts.map((contact) => {
              const presence = presenceMap[contact.id];

              return (
                <button
                  key={contact.id}
                  className={`wa-chat-row ${selectedContactId === contact.id ? "wa-chat-row--active" : ""}`}
                  onClick={() => handleSelectContact(contact.id)}
                >
                  <div className="wa-avatar wa-avatar--list">
                    {contact.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={contact.avatarUrl} alt={contact.name} />
                    ) : (
                      <span>{renderAvatar(contact.name)}</span>
                    )}
                    {presence?.isOnline ? <span className="wa-online-dot" /> : null}
                  </div>

                  <div className="wa-chat-row__body">
                    <div className="wa-chat-row__top">
                      <strong>{contact.name}</strong>
                      <span>{formatMessageTime(contact.lastMessageAt)}</span>
                    </div>

                    <div className="wa-chat-row__bottom">
                      <p>{contact.lastMessagePreview ?? contact.email ?? fallbackContactName(contact.id)}</p>
                      {contact.unreadCount ? (
                        <span className="wa-unread">{contact.unreadCount}</span>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </section>

      <section className={`wa-chat ${showMobileChat ? "" : "wa-chat--hidden-mobile"}`}>
        {selectedContact ? (
          <>
            <header className="wa-chat__header">
              <div className="wa-chat__identity">
                <button
                  className="icon-button icon-button--back"
                  onClick={() => setShowMobileChat(false)}
                  aria-label="Back"
                >
                  Back
                </button>

                <div className="wa-avatar wa-avatar--list">
                  {selectedContact.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={selectedContact.avatarUrl} alt={selectedContact.name} />
                  ) : (
                    <span>{renderAvatar(selectedContact.name)}</span>
                  )}
                  {presenceMap[selectedContact.id]?.isOnline ? <span className="wa-online-dot" /> : null}
                </div>

                <div className="wa-chat__identity-copy">
                  <strong>{selectedContact.name}</strong>
                  <span>
                    {presenceMap[selectedContact.id]?.isOnline
                      ? "Online"
                      : formatLastSeen(presenceMap[selectedContact.id]?.lastSeenAt)}
                  </span>
                </div>
              </div>
            </header>

            <div className="wa-chat__messages">
              {loadingMessages ? (
                <div className="wa-empty">Loading conversation...</div>
              ) : messages.length === 0 ? (
                <div className="wa-empty">
                  No messages with {selectedContact.name} yet. Say hello first.
                </div>
              ) : (
                messages.map((message) => {
                  const own = message.senderId === profile.id;

                  return (
                    <article
                      key={message.id}
                      className={`wa-bubble ${own ? "wa-bubble--own" : ""}`}
                    >
                      <p>{message.content}</p>
                      <div className="wa-bubble__meta">
                        <span>{formatMessageTime(message.createdAt)}</span>
                        {own ? <span>{statusIcon(message.status)}</span> : null}
                      </div>
                    </article>
                  );
                })
              )}
            </div>

            <footer className="wa-composer">
              <textarea
                value={messageInput}
                onChange={(event) => setMessageInput(event.target.value)}
                className="wa-composer__input"
                placeholder={`Message ${selectedContact.name}`}
              />
              <button
                className="wa-send-button"
                onClick={handleSendMessage}
                disabled={sending}
              >
                {sending ? "..." : "Send"}
              </button>
            </footer>
          </>
        ) : (
          <div className="wa-blank">
            <div className="wa-blank__card">
              <p className="wa-blank__eyebrow">Welcome back</p>
              <h1>Pick a chat and keep the conversation flowing.</h1>
              <p>
                People you follow will appear here. If someone messages you first,
                they will also be added to your chat history automatically.
              </p>
              <Link href="/follow" className="wa-primary-link">
                Explore contacts
              </Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
