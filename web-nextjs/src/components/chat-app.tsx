"use client";

import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from "@microsoft/signalr";
import { useEffect, useMemo, useRef, useState } from "react";

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

type Contact = {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
};

const tokenStorageKey = "distributed-chat.jwt";
const contactsStorageKey = "distributed-chat.contacts";
const gatewayBaseUrl =
  process.env.NEXT_PUBLIC_GATEWAY_BASE_URL ?? "http://localhost:5001";
const realtimeBaseUrl =
  process.env.NEXT_PUBLIC_REALTIME_BASE_URL ?? "http://localhost:5002";

function buildConversationId(firstUserId: string, secondUserId: string) {
  return `dm-${[firstUserId.trim(), secondUserId.trim()].sort().join("--")}`;
}

function formatTime(timestamp?: string) {
  if (!timestamp) {
    return "--:--";
  }

  const date = new Date(timestamp);
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatLastSeen(timestamp?: string | null) {
  if (!timestamp) {
    return "offline";
  }

  const date = new Date(timestamp);
  return `last seen ${new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)}`;
}

function getStatusLabel(status: string) {
  if (status === "read") {
    return "Read";
  }

  if (status === "delivered") {
    return "Delivered";
  }

  return "Sent";
}

export function ChatApp() {
  const [token, setToken] = useState("");
  const [profile, setProfile] = useState<CurrentUser | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [connectionState, setConnectionState] = useState("Disconnected");
  const [presence, setPresence] = useState<PresenceResponse | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [newContactId, setNewContactId] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
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

  const appendLog = (message: string) => {
    const timestamp = new Date().toISOString();
    setLogs((current) => [`[${timestamp}] ${message}`, ...current].slice(0, 60));
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedToken = window.localStorage.getItem(tokenStorageKey) ?? "";
    const storedContacts = window.localStorage.getItem(contactsStorageKey);

    if (storedToken) {
      setToken(storedToken);
    }

    if (storedContacts) {
      try {
        setContacts(JSON.parse(storedContacts) as Contact[]);
      } catch {
        window.localStorage.removeItem(contactsStorageKey);
      }
    }

    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;

    if (!hash) {
      appendLog("Frontend ready. Login Google atau paste JWT untuk mulai.");
      return;
    }

    const params = new URLSearchParams(hash);
    const accessToken = params.get("accessToken");

    if (params.get("oauth") === "success" && accessToken) {
      window.localStorage.setItem(tokenStorageKey, accessToken);
      setToken(accessToken);
      appendLog("OAuth berhasil. JWT dari gateway disimpan otomatis.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(contactsStorageKey, JSON.stringify(contacts));
  }, [contacts]);

  useEffect(() => {
    if (!token) {
      setProfile(null);
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
          setProfile(payload as CurrentUser);
          appendLog(`Profile loaded untuk ${payload.name}.`);
        }
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "Failed to load profile.";
          appendLog(`Load profile gagal: ${message}`);
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
  }, [token]);

  useEffect(() => {
    if (!profile) {
      return;
    }

    setContacts((current) => current.filter((contact) => contact.id !== profile.id));
  }, [profile]);

  useEffect(() => {
    if (!profile || !token) {
      if (connectionRef.current) {
        void connectionRef.current.stop();
        connectionRef.current = null;
      }

      setConnectionState("Disconnected");
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

      setMessages((current) => {
        const exists = current.some((message) => message.id === normalized.id);
        if (exists) {
          return current;
        }

        return [...current, normalized];
      });

      appendLog(
        `Realtime message masuk untuk conversation ${payload.conversationId} dari ${payload.senderId}.`,
      );
    });

    connection.onreconnecting(() => {
      setConnectionState("Reconnecting");
      appendLog("SignalR reconnecting...");
    });

    connection.onreconnected(() => {
      setConnectionState("Connected");
      appendLog("SignalR connected kembali.");
    });

    connection.onclose(() => {
      setConnectionState("Disconnected");
      appendLog("SignalR disconnected.");
    });

    connectionRef.current = connection;

    const startConnection = async () => {
      try {
        await connection.start();
        setConnectionState("Connected");
        appendLog(`SignalR connected sebagai user ${profile.id}.`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown SignalR error.";
        setConnectionState("Disconnected");
        appendLog(`SignalR connect gagal: ${message}`);
      }
    };

    void startConnection();

    return () => {
      connection.off("message.received");
      void connection.stop();
      connectionRef.current = null;
    };
  }, [profile, token]);

  useEffect(() => {
    if (!token || !activeConversationId) {
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
          setMessages(payload as ChatMessage[]);
          if (!silent) {
            appendLog(`Conversation ${activeConversationId} dimuat.`);
          }
        }
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "Failed to load conversation.";
          appendLog(`Load conversation gagal: ${message}`);
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
  }, [activeConversationId, token]);

  useEffect(() => {
    if (!selectedContact) {
      setPresence(null);
      return;
    }

    let cancelled = false;

    const loadPresence = async (silent = false) => {
      try {
        const response = await fetch(`/api/chat/presence/${encodeURIComponent(selectedContact.id)}`);
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.message ?? "Failed to load presence.");
        }

        if (!cancelled) {
          setPresence(payload as PresenceResponse);
          if (!silent) {
            appendLog(`Presence ${selectedContact.id}: ${payload.isOnline ? "online" : "offline"}.`);
          }
        }
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "Failed to load presence.";
          appendLog(`Presence check gagal: ${message}`);
        }
      }
    };

    void loadPresence();
    const intervalId = window.setInterval(() => {
      void loadPresence(true);
    }, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [selectedContact]);

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

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.message ?? "Failed to publish read event.");
        }

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

        appendLog(`Read event dipublish untuk ${unreadIncomingIds.length} pesan.`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to publish read event.";
        appendLog(`Mark read gagal: ${message}`);
      } finally {
        readInFlightRef.current = false;
      }
    };

    void markRead();
  }, [activeConversationId, messages, profile]);

  const handleLogin = () => {
    const returnUrl = `${window.location.origin}${window.location.pathname}`;
    const loginUrl = `${gatewayBaseUrl}/api/auth/google/login?returnUrl=${encodeURIComponent(returnUrl)}`;
    window.location.href = loginUrl;
  };

  const handleManualTokenSave = () => {
    if (!token.trim()) {
      appendLog("JWT masih kosong.");
      return;
    }

    window.localStorage.setItem(tokenStorageKey, token.trim());
    setToken(token.trim());
    appendLog("JWT disimpan ke local storage.");
  };

  const handleLogout = () => {
    window.localStorage.removeItem(tokenStorageKey);
    setToken("");
    setProfile(null);
    setMessages([]);
    appendLog("Session lokal dibersihkan.");
  };

  const handleAddContact = () => {
    if (!newContactId.trim() || !newContactName.trim()) {
      appendLog("Contact id dan name wajib diisi.");
      return;
    }

    const nextContact: Contact = {
      id: newContactId.trim(),
      name: newContactName.trim(),
      email: newContactEmail.trim() || undefined,
    };

    setContacts((current) => {
      const deduped = current.filter((contact) => contact.id !== nextContact.id);
      return [nextContact, ...deduped];
    });

    setSelectedContactId(nextContact.id);
    setShowMobileChat(true);
    setNewContactId("");
    setNewContactName("");
    setNewContactEmail("");
    appendLog(`Contact ${nextContact.name} ditambahkan ke sidebar.`);
  };

  const handleSendMessage = async () => {
    if (!selectedContact || !activeConversationId || !token.trim() || !messageInput.trim()) {
      appendLog("Belum bisa kirim pesan. Cek login, contact, dan isi pesan.");
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
        const retryAfter = response.headers.get("Retry-After");
        const suffix = retryAfter ? ` Retry after ${retryAfter}s.` : "";
        throw new Error((payload.message ?? "Failed to send message.") + suffix);
      }

      setMessages((current) => [...current, payload as ChatMessage]);
      setMessageInput("");
      appendLog(`Pesan dikirim ke ${selectedContact.name}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send message.";
      appendLog(`Kirim pesan gagal: ${message}`);
    } finally {
      setSending(false);
    }
  };

  const conversationPreview = useMemo(() => {
    const previews = new Map<string, ChatMessage>();

    for (const message of messages) {
      previews.set(message.conversationId, message);
    }

    return previews;
  }, [messages]);

  const realtimeBadgeClass =
    connectionState === "Connected"
      ? "status-badge status-badge--online"
      : connectionState === "Reconnecting"
        ? "status-badge status-badge--warning"
        : "status-badge";

  return (
    <main className="chat-shell">
      <section className={`sidebar ${showMobileChat ? "sidebar--hidden-mobile" : ""}`}>
        <div className="sidebar__top">
          <div>
            <p className="eyebrow">Distributed Chat</p>
            <h1>Web Chat</h1>
          </div>
          <span className={realtimeBadgeClass}>{connectionState}</span>
        </div>

        <div className="profile-card">
          <div className="profile-card__copy">
            <p className="profile-card__title">Login gateway</p>
            <p className="profile-card__text">
              Klik Google login atau paste JWT kalau kamu mau test manual.
            </p>
          </div>

          <textarea
            className="token-input"
            placeholder="Paste JWT gateway di sini"
            value={token}
            onChange={(event) => setToken(event.target.value)}
          />

          <div className="actions">
            <button className="button button--primary" onClick={handleLogin}>
              Login with Google
            </button>
            <button className="button button--soft" onClick={handleManualTokenSave}>
              Save JWT
            </button>
            <button className="button button--ghost" onClick={handleLogout}>
              Clear Session
            </button>
          </div>

          <div className="identity">
            <p className="identity__label">{loadingProfile ? "Loading profile..." : "Current profile"}</p>
            {profile ? (
              <>
                <strong>{profile.name}</strong>
                <span>{profile.email}</span>
                <code>{profile.id}</code>
              </>
            ) : (
              <span>Belum login.</span>
            )}
          </div>
        </div>

        <div className="contact-builder">
          <div>
            <p className="section-title">Add contact</p>
            <p className="section-subtitle">Sementara kontak dipilih manual seperti address book.</p>
          </div>

          <input
            className="text-input"
            placeholder="Contact name"
            value={newContactName}
            onChange={(event) => setNewContactName(event.target.value)}
          />
          <input
            className="text-input"
            placeholder="User id / UUID"
            value={newContactId}
            onChange={(event) => setNewContactId(event.target.value)}
          />
          <input
            className="text-input"
            placeholder="Email opsional"
            value={newContactEmail}
            onChange={(event) => setNewContactEmail(event.target.value)}
          />
          <button className="button button--primary" onClick={handleAddContact}>
            Save Contact
          </button>
        </div>

        <div className="contact-list">
          <div className="contact-list__header">
            <p className="section-title">Chats</p>
            <span>{contacts.length} kontak</span>
          </div>

          {contacts.length === 0 ? (
            <div className="empty-state">Belum ada kontak. Tambahkan user lain dulu.</div>
          ) : (
            contacts.map((contact) => {
              const preview = conversationPreview.get(
                profile ? buildConversationId(profile.id, contact.id) : "",
              );

              return (
                <button
                  key={contact.id}
                  className={`contact-row ${selectedContactId === contact.id ? "contact-row--active" : ""}`}
                  onClick={() => {
                    setSelectedContactId(contact.id);
                    setShowMobileChat(true);
                  }}
                >
                  <div className="avatar">{contact.name.slice(0, 1).toUpperCase()}</div>
                  <div className="contact-row__body">
                    <div className="contact-row__top">
                      <strong>{contact.name}</strong>
                      <span>{preview ? formatTime(preview.createdAt) : "--:--"}</span>
                    </div>
                    <div className="contact-row__bottom">
                      <span>{preview?.content ?? contact.email ?? contact.id}</span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </section>

      <section className={`chat-panel ${showMobileChat ? "" : "chat-panel--hidden-mobile"}`}>
        {selectedContact && profile ? (
          <>
            <header className="chat-header">
              <div className="chat-header__identity">
                <button
                  className="back-button"
                  onClick={() => setShowMobileChat(false)}
                  aria-label="Back to chats"
                >
                  ←
                </button>
                <div className="avatar avatar--large">
                  {selectedContact.name.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <strong>{selectedContact.name}</strong>
                  <p>
                    {presence?.isOnline
                      ? "online"
                      : formatLastSeen(presence?.lastSeenAt)}
                  </p>
                </div>
              </div>

              <div className="chat-header__meta">
                <code>{activeConversationId}</code>
              </div>
            </header>

            <div className="messages-area">
              {loadingMessages ? (
                <div className="empty-state">Loading conversation...</div>
              ) : messages.length === 0 ? (
                <div className="empty-state">
                  Belum ada pesan. Kirim pesan pertama untuk mulai percakapan.
                </div>
              ) : (
                messages.map((message) => {
                  const isOwn = profile.id === message.senderId;

                  return (
                    <article
                      key={message.id}
                      className={`message-bubble ${isOwn ? "message-bubble--own" : ""}`}
                    >
                      <p>{message.content}</p>
                      <div className="message-meta">
                        <span>{formatTime(message.createdAt)}</span>
                        {isOwn ? <span>{getStatusLabel(message.status)}</span> : null}
                      </div>
                    </article>
                  );
                })
              )}
            </div>

            <footer className="composer">
              <textarea
                className="composer__input"
                placeholder={`Kirim pesan ke ${selectedContact.name}`}
                value={messageInput}
                onChange={(event) => setMessageInput(event.target.value)}
              />
              <button className="button button--primary" onClick={handleSendMessage} disabled={sending}>
                {sending ? "Sending..." : "Send"}
              </button>
            </footer>
          </>
        ) : (
          <div className="hero-panel">
            <div className="hero-panel__card">
              <p className="eyebrow">WhatsApp-style flow</p>
              <h2>Pilih contact lalu mulai chat.</h2>
              <p>
                Frontend ini pakai alur backend asli: login via gateway, send ke Java service,
                RabbitMQ publish, realtime consume, lalu status sent/delivered/read ikut bergerak.
              </p>
            </div>

            <div className="hero-panel__guide">
              <div>
                <strong>1. Login</strong>
                <p>Masuk via Google supaya JWT gateway langsung tersimpan.</p>
              </div>
              <div>
                <strong>2. Add contact</strong>
                <p>Masukkan user id akun lawan chat supaya conversation bisa dibuka.</p>
              </div>
              <div>
                <strong>3. Open on 2 browsers</strong>
                <p>Desktop browser dan incognito cocok buat simulasi dua user sekaligus.</p>
              </div>
            </div>
          </div>
        )}
      </section>

      <aside className="inspector">
        <div className="inspector__card">
          <p className="section-title">Realtime state</p>
          <ul className="info-list">
            <li>
              <span>Gateway</span>
              <code>{gatewayBaseUrl}</code>
            </li>
            <li>
              <span>Realtime hub</span>
              <code>{realtimeBaseUrl}/hubs/chat</code>
            </li>
            <li>
              <span>SignalR</span>
              <strong>{connectionState}</strong>
            </li>
            <li>
              <span>Presence</span>
              <strong>{presence?.isOnline ? "Online" : "Offline"}</strong>
            </li>
          </ul>
        </div>

        <div className="inspector__card">
          <p className="section-title">Live log</p>
          <div className="log-list">
            {logs.length === 0 ? (
              <div className="empty-state">Belum ada log.</div>
            ) : (
              logs.map((log) => (
                <pre key={log} className="log-line">
                  {log}
                </pre>
              ))
            )}
          </div>
        </div>
      </aside>
    </main>
  );
}
