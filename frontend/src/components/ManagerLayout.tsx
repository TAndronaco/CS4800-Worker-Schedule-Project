"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { apiFetch } from "@/lib/api";
import Avatar from "./Avatar";
import styles from "./EmployeeLayout.module.css";

interface User {
  id: number;
  first_name: string;
  last_name: string;
  role: "manager" | "employee";
  avatar_url?: string | null;
}

interface Contact {
  id: number;
  first_name: string;
  last_name: string;
  role: string;
}

interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  content: string;
  created_at: string;
  first_name: string;
  last_name: string;
}

const NAV_ITEMS = [
  { label: "Dashboard", icon: "🏠", path: "/dashboard" },
  { label: "Schedule", icon: "📅", path: "/manager/schedule" },
  { label: "My Teams", icon: "👥", path: "/manager/teams" },
  { label: "Requests", icon: "🔄", path: "/manager/requests" },
  { label: "Messages", icon: "💬", path: "/messages" },
];

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const user = useMemo<User | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("user");
    return stored && stored !== "undefined" && stored !== "null" ? JSON.parse(stored) : null;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- re-read localStorage on route change
  }, [pathname]);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");

  const [activeConvId, setActiveConvId] = useState<number | null>(null);

  // Fetch contacts
  useEffect(() => {
    if (!user) return;
    apiFetch("/messages/contacts/list")
      .then((res) => res.json())
      .then((data) => setContacts(data))
      .catch(() => setContacts([]));
  }, [user]);

  // Fetch messages for selected contact via DM conversation
  useEffect(() => {
    if (!selectedContact || !user) return;
    apiFetch("/messages/conversations/dm", {
      method: "POST",
      body: JSON.stringify({ other_user_id: selectedContact.id }),
    })
      .then((res) => res.json())
      .then((data) => {
        setActiveConvId(data.conversation_id);
        return apiFetch(`/messages/conversations/${data.conversation_id}/messages`);
      })
      .then((res) => res.json())
      .then((data) => setMessages(Array.isArray(data) ? data : []))
      .catch(() => setMessages([]));
  }, [selectedContact, user]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConvId || !user) return;
    const res = await apiFetch(`/messages/conversations/${activeConvId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content: newMessage }),
    });
    if (res.ok) {
      const sent = await res.json();
      setMessages((prev) => [...prev, sent]);
      setNewMessage("");
    }
  };

  if (!user || user.role !== "manager") return <>{children}</>;

  const handleAvatarUpload = async (base64: string) => {
    await apiFetch(`/users/${user.id}/avatar`, {
      method: "PUT",
      body: JSON.stringify({ avatar_url: base64 }),
    });
    // Update localStorage so it persists
    const stored = localStorage.getItem("user");
    if (stored && stored !== "undefined" && stored !== "null") {
      const updated = { ...JSON.parse(stored), avatar_url: base64 };
      localStorage.setItem("user", JSON.stringify(updated));
    }
    window.location.reload();
  };

  return (
    <div className={styles.wrapper}>
      {/* ── Left Sidebar ── */}
      <aside
        className={`${styles.sidebar} ${sidebarCollapsed ? styles.collapsed : ""}`}
      >
        <button
          className={styles.collapseBtn}
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          title={sidebarCollapsed ? "Expand" : "Collapse"}
        >
          {sidebarCollapsed ? "▶" : "◀"}
        </button>

        <ul className={styles.navList}>
          {NAV_ITEMS.map((item) => (
            <li key={item.path}>
              <a
                className={`${styles.navItem} ${
                  pathname === item.path ? styles.active : ""
                }`}
                onClick={() => router.push(item.path)}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                <span className={styles.navLabel}>{item.label}</span>
              </a>
            </li>
          ))}
        </ul>

        <div className={styles.userCard}>
          <Avatar
            firstName={user.first_name}
            lastName={user.last_name}
            avatarUrl={user.avatar_url}
            size="md"
            uploadable
            onUpload={handleAvatarUpload}
          />
          <div>
            <div className={styles.userName}>
              {user.first_name} {user.last_name}
            </div>
            <div className={styles.userRole}>{user.role}</div>
          </div>
        </div>
      </aside>

      {/* ── Center Content ── */}
      <div className={styles.center}>{children}</div>

      {/* ── Right Chat Panel ── */}
      {chatOpen ? (
        <aside className={styles.chatPanel}>
          <div className={styles.chatHeader}>
            <span className={styles.chatHeaderTitle}>💬 Messages</span>
            <button
              className={styles.chatToggleBtn}
              onClick={() => setChatOpen(false)}
              title="Close chat"
            >
              ✕
            </button>
          </div>

          {!selectedContact ? (
            /* Contact list */
            <div className={styles.chatContacts}>
              {contacts.length === 0 ? (
                <div className={styles.chatEmpty}>
                  No team members yet. Create a team first!
                </div>
              ) : (
                contacts.map((c) => (
                  <div
                    key={c.id}
                    className={styles.chatContactItem}
                    onClick={() => setSelectedContact(c)}
                  >
                    <Avatar
                      firstName={c.first_name}
                      lastName={c.last_name}
                      size="md"
                    />
                    <div>
                      <div className={styles.chatContactName}>
                        {c.first_name} {c.last_name}
                      </div>
                      <div className={styles.chatContactRole}>{c.role}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* Conversation */
            <div className={styles.chatConversation}>
              <div className={styles.chatConvoHeader}>
                <button
                  className={styles.chatBackBtn}
                  onClick={() => {
                    setSelectedContact(null);
                    setMessages([]);
                  }}
                >
                  ←
                </button>
                <span className={styles.chatConvoName}>
                  {selectedContact.first_name} {selectedContact.last_name}
                </span>
              </div>

              <div className={styles.chatMessages}>
                {messages.length === 0 ? (
                  <div className={styles.chatEmpty}>
                    No messages yet. Say hello!
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`${styles.chatBubble} ${
                        msg.sender_id === user.id ? styles.mine : styles.theirs
                      }`}
                    >
                      <div>{msg.content}</div>
                      <div className={styles.chatTime}>
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className={styles.chatInputArea}>
                <input
                  className={styles.chatInput}
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder={`Message ${selectedContact.first_name}...`}
                />
                <button className={styles.chatSendBtn} onClick={sendMessage}>
                  ↑
                </button>
              </div>
            </div>
          )}
        </aside>
      ) : (
        <button
          className={styles.chatFloatBtn}
          onClick={() => setChatOpen(true)}
          title="Open messages"
        >
          💬
        </button>
      )}
    </div>
  );
}
