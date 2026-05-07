"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

interface Conversation {
  id: number;
  type: string;
  member_names?: string;
  last_message_at?: string;
  last_sender_id?: number;
  last_sender_name?: string;
}

const NAV_ITEMS = [
  { label: "Dashboard", icon: "🏠", path: "/dashboard" },
  { label: "Schedule", icon: "📅", path: "/manager/schedule" },
  { label: "My Teams", icon: "👥", path: "/manager/teams" },
  { label: "Employees", icon: "👤", path: "/manager/employees" },
  { label: "Performance", icon: "📊", path: "/manager/performance" },
  { label: "Requests", icon: "🔄", path: "/manager/requests" },
  { label: "Payroll", icon: "💳", path: "/manager/payroll" },
  { label: "Live", icon: "🟢", path: "/manager/live" },
  { label: "Messages", icon: "💬", path: "/messages" },
  { label: "Settings", icon: "⚙️", path: "/settings" },
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

  // Notification state
  const [unreadContactIds, setUnreadContactIds] = useState<Set<number>>(new Set());
  const [chatNotif, setChatNotif] = useState<string | null>(null);
  const selectedContactRef = useRef<Contact | null>(null);
  const lastSeenRef = useRef<Map<number, string>>(new Map());
  const initializedRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch contacts
  useEffect(() => {
    if (!user) return;
    apiFetch("/messages/contacts/list")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setContacts(Array.isArray(data) ? data : []))
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

  // Keep selectedContactRef in sync; clear unread badge when conversation opens
  useEffect(() => {
    selectedContactRef.current = selectedContact;
    if (selectedContact) {
      setUnreadContactIds((prev) => {
        if (!prev.has(selectedContact.id)) return prev;
        const next = new Set(prev);
        next.delete(selectedContact.id);
        return next;
      });
    }
  }, [selectedContact]);

  // Auto-dismiss notification after 4s
  useEffect(() => {
    if (!chatNotif) return;
    const t = setTimeout(() => setChatNotif(null), 4000);
    return () => clearTimeout(t);
  }, [chatNotif]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Poll conversations every 15s to detect incoming messages
  useEffect(() => {
    if (!user) return;
    const poll = async () => {
      const res = await apiFetch("/messages/conversations").catch(() => null);
      if (!res || !res.ok) return;
      const convs: Conversation[] = await res.json().catch(() => null);
      if (!Array.isArray(convs)) return;

      if (!initializedRef.current) {
        convs.forEach((c) => lastSeenRef.current.set(c.id, c.last_message_at || ""));
        initializedRef.current = true;
        return;
      }

      for (const conv of convs) {
        if (conv.type !== "dm") continue;
        const prevAt = lastSeenRef.current.get(conv.id);
        const newAt = conv.last_message_at;

        if (prevAt === undefined) {
          lastSeenRef.current.set(conv.id, newAt || "");
          continue;
        }
        if (!newAt || conv.last_sender_id === user.id) {
          if (newAt) lastSeenRef.current.set(conv.id, newAt);
          continue;
        }
        if (prevAt === "" || new Date(newAt) > new Date(prevAt)) {
          lastSeenRef.current.set(conv.id, newAt);
          const contact = contacts.find((c) =>
            conv.member_names?.includes(`${c.first_name} ${c.last_name}`)
          );
          if (contact && selectedContactRef.current?.id !== contact.id) {
            setUnreadContactIds((prev) => new Set([...prev, contact.id]));
            setChatNotif(`New message from ${conv.last_sender_name || contact.first_name}`);
          }
        }
      }
    };

    poll();
    const interval = setInterval(poll, 15000);
    return () => clearInterval(interval);
  }, [user, contacts]);

  // Live-poll active conversation every 5s for real-time updates
  useEffect(() => {
    if (!activeConvId || !user) return;
    const poll = async () => {
      const res = await apiFetch(`/messages/conversations/${activeConvId}/messages`).catch(() => null);
      if (!res || !res.ok) return;
      const data = await res.json().catch(() => null);
      if (Array.isArray(data)) setMessages(data);
    };
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [activeConvId, user]);

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
        <button
          className={styles.logoutBtn}
          onClick={() => {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            router.push("/");
          }}
        >
          <span className={styles.navIcon}>🚪</span>
          <span className={styles.navLabel}>Log Out</span>
        </button>
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

          {chatNotif && (
            <div key={chatNotif} className={styles.chatNotification}>
              <span>📨 {chatNotif}</span>
              <button onClick={() => setChatNotif(null)}>✕</button>
            </div>
          )}

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
                    className={`${styles.chatContactItem}${unreadContactIds.has(c.id) ? ` ${styles.chatContactUnread}` : ""}`}
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
                    {unreadContactIds.has(c.id) && (
                      <span className={styles.unreadDot} />
                    )}
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
                <div ref={messagesEndRef} />
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
          {unreadContactIds.size > 0 && <span className={styles.unreadBadge} />}
        </button>
      )}
    </div>
  );
}
