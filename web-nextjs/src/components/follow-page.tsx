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

export function FollowPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<StoredContact[]>([]);
  const [name, setName] = useState("");
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!loadToken()) {
      router.replace("/login");
      return;
    }

    setContacts(loadContacts());
  }, [router]);

  useEffect(() => {
    saveContacts(contacts);
  }, [contacts]);

  const followedContacts = useMemo(
    () => contacts.filter((contact) => contact.followed),
    [contacts],
  );

  const handleAdd = () => {
    if (!name.trim() || !userId.trim()) {
      return;
    }

    setContacts((current) =>
      upsertContact(current, {
        id: userId.trim(),
        name: name.trim(),
        email: email.trim() || undefined,
        followed: true,
      }),
    );

    setName("");
    setUserId("");
    setEmail("");
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
              Untuk saat ini contact ditambahkan manual karena backend belum punya user
              directory global.
            </p>
          </div>

          <Link href="/" className="wa-primary-link">
            Back to chats
          </Link>
        </header>

        <div className="follow-form">
          <input
            className="wa-input"
            placeholder="Display name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <input
            className="wa-input"
            placeholder="User id / UUID"
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
          />
          <input
            className="wa-input"
            placeholder="Email optional"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <button className="wa-primary-button" onClick={handleAdd}>
            Follow contact
          </button>
        </div>

        <div className="follow-list">
          {followedContacts.length === 0 ? (
            <div className="wa-empty">Belum ada contact yang kamu follow.</div>
          ) : (
            followedContacts.map((contact) => (
              <article key={contact.id} className="follow-row">
                <div className="wa-avatar wa-avatar--list">
                  <span>{contact.name.slice(0, 1).toUpperCase()}</span>
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
        </div>
      </section>
    </main>
  );
}
