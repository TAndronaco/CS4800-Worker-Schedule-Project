"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import styles from "./page.module.css";

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: "manager" | "employee";
}

interface Contact {
  id: number;
  first_name: string;
  last_name: string;
  role: string;
}

interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  created_at: string;
  first_name: string;
  last_name: string;
}

export default function MessagesPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");

  const user = useMemo<User | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("user");
    return stored && stored !== "undefined" && stored !== "null" ? JSON.parse(stored) : null;
  }, []);

  const token = useMemo<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }, []);

  useEffect(() => {
    if (!user || !token) {
      router.push("/login");
    }
  }, [user, token, router]);

  useEffect(() => {
    if (!token || !user) return;
    apiFetch(`/messages/contacts/list?userId=${user.id}`)
      .then((res) => res.json())
      .then((data) => setContacts(data))
      .catch(() => setContacts([]));
    }, [token, user]);

  useEffect(() => {
    if (!selectedContact || !token || !user) return;
    apiFetch(`/messages/${selectedContact.id}?currentUserId=${user.id}`)
      .then((res) => res.json())
      .then((data) => setMessages(data))
      .catch(() => setMessages([]));
  }, [selectedContact, token, user]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedContact || !token || !user) return;
    const res = await apiFetch("/messages", {
      method: "POST",
      body: JSON.stringify({
        receiver_id: selectedContact.id,
        sender_id: user.id,
        content: newMessage,
      }),
    });
    if (res.ok) {
      const sent = await res.json();
      setMessages((prev) => [...prev, {
        ...sent,
        first_name: user.first_name,
        last_name: user.last_name,
      }]);
      setNewMessage("");
    }
  };
  if (!user) return null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={() => router.push("/dashboard")}>← Back</button>
        <h1>Team Messages</h1>
      </div>
      <div className={styles.chatLayout}>
        {/* Contacts List */}
        <div className={styles.contactsList}>
          <h3>Teammates</h3>
          {contacts.length === 0 && (
            <p className={styles.empty}>No teammates yet. Join a team first!</p>
          )}
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className={`${styles.contactItem} ${
                selectedContact?.id === contact.id ? styles.activeContact : ""
              }`}
              onClick={() => setSelectedContact(contact)}
            >
              <span className={styles.contactName}>
                {contact.first_name} {contact.last_name}
              </span>
              <span className={styles.contactRole}>{contact.role}</span>
            </div>
          ))}
        </div>

        {/* Chat Window */}
        <div className={styles.chatWindow}>
          {!selectedContact ? (
            <div className={styles.noChat}>
              <p>Select a teammate to start chatting!</p>
            </div>
          ) : (
            <>
              <div className={styles.chatHeader}>
                <h3>
                  {selectedContact.first_name} {selectedContact.last_name}
                </h3>
              </div>
              <div className={styles.chatBox}>
                {messages.length === 0 && (
                  <p className={styles.empty}>No messages yet. Say hello!</p>
                )}
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={
                      msg.sender_id === user.id
                        ? styles.myMessage
                        : styles.otherMessage
                    }
                  >
                    <span className={styles.sender}>
                      {msg.first_name} {msg.last_name}
                    </span>
                    <p>{msg.content}</p>
                    <span className={styles.time}>
                      {new Date(msg.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
              <div className={styles.inputArea}>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder={`Message ${selectedContact.first_name}...`}
                  className={styles.input}
                />
                <button onClick={sendMessage} className={styles.sendButton}>
                  Send
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}