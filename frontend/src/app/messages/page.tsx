"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import styles from "./page.module.css";

interface User {
  id: number;
  first_name: string;
  last_name: string;
  role: "manager" | "employee";
}

interface Conversation {
  id: number;
  type: string;
  name: string | null;
  created_by: number | null;
  team_id: number | null;
  last_message: string | null;
  last_message_at: string | null;
  last_sender_name: string | null;
  member_names: string | null;
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

interface Contact {
  id: number;
  first_name: string;
  last_name: string;
  role: string;
}

export default function MessagesPage() {
  const router = useRouter();
  const chatBoxRef = useRef<HTMLDivElement>(null);

  const user = useMemo<User | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("user");
    return stored && stored !== "undefined" && stored !== "null"
      ? JSON.parse(stored)
      : null;
  }, []);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);

  // Modal state
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showDmModal, setShowDmModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupMembers, setGroupMembers] = useState<number[]>([]);
  const [modalError, setModalError] = useState("");

  useEffect(() => {
    if (!user) {
      router.push("/login");
    }
  }, [user, router]);

  function loadConversations() {
    apiFetch("/messages/conversations")
      .then((r) => r.json())
      .then(setConversations)
      .catch(() => setConversations([]));
  }

  function loadContacts() {
    apiFetch("/messages/contacts/list")
      .then((r) => r.json())
      .then(setContacts)
      .catch(() => setContacts([]));
  }

  useEffect(() => {
    if (!user) return;
    loadConversations();
    loadContacts();
  }, [user]);

  function loadMessages(convId: number) {
    apiFetch(`/messages/conversations/${convId}/messages`)
      .then((r) => r.json())
      .then(setMessages)
      .catch(() => setMessages([]));
  }

  useEffect(() => {
    if (!selectedConv) return;
    loadMessages(selectedConv.id);
  }, [selectedConv]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);

  // Polling for new messages
  useEffect(() => {
    if (!selectedConv) return;
    const interval = setInterval(() => {
      loadMessages(selectedConv.id);
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedConv]);

  async function sendMsg() {
    if (!newMessage.trim() || !selectedConv || !user) return;
    try {
      const res = await apiFetch(
        `/messages/conversations/${selectedConv.id}/messages`,
        {
          method: "POST",
          body: JSON.stringify({ content: newMessage }),
        }
      );
      if (res.ok) {
        const sent = await res.json();
        setMessages((prev) => [...prev, sent]);
        setNewMessage("");
        loadConversations();
      }
    } catch {
      // silently fail
    }
  }

  async function startDm(contact: Contact) {
    try {
      const res = await apiFetch("/messages/conversations/dm", {
        method: "POST",
        body: JSON.stringify({ other_user_id: contact.id }),
      });
      const data = await res.json();
      setShowDmModal(false);
      loadConversations();
      // Select the new/existing conversation
      const convRes = await apiFetch("/messages/conversations");
      const convs: Conversation[] = await convRes.json();
      setConversations(convs);
      const found = convs.find((c) => c.id === data.conversation_id);
      if (found) setSelectedConv(found);
    } catch {
      // silently fail
    }
  }

  async function createGroup() {
    setModalError("");
    if (!groupName.trim()) {
      setModalError("Group name is required.");
      return;
    }
    if (groupMembers.length < 1) {
      setModalError("Select at least one member.");
      return;
    }
    try {
      const res = await apiFetch("/messages/conversations/group", {
        method: "POST",
        body: JSON.stringify({
          name: groupName.trim(),
          member_ids: groupMembers,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setModalError(data.error || "Failed to create group.");
        return;
      }
      setShowGroupModal(false);
      setGroupName("");
      setGroupMembers([]);
      loadConversations();
    } catch {
      setModalError("Failed to create group.");
    }
  }

  function toggleGroupMember(id: number) {
    setGroupMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  }

  function convDisplayName(conv: Conversation): string {
    if (conv.type === "group" && conv.name) return conv.name;
    return conv.member_names || "Conversation";
  }

  function formatConvTime(dateStr: string | null): string {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  if (!user) return null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button
          className={styles.back}
          onClick={() => router.push("/dashboard")}
        >
          ← Back
        </button>
        <h1>Messages</h1>
      </div>

      <div className={styles.chatLayout}>
        {/* ── Sidebar: conversations ── */}
        <div className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <span className={styles.sidebarTitle}>Chats</span>
            <div>
              <button
                className={styles.newDmBtn}
                onClick={() => setShowDmModal(true)}
              >
                + DM
              </button>
              {user.role === "manager" && (
                <button
                  className={styles.newGroupBtn}
                  onClick={() => {
                    setModalError("");
                    setGroupName("");
                    setGroupMembers([]);
                    setShowGroupModal(true);
                  }}
                >
                  + Group
                </button>
              )}
            </div>
          </div>

          <div className={styles.conversationList}>
            {conversations.length === 0 ? (
              <div className={styles.emptyConvs}>
                No conversations yet. Start a new chat!
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`${styles.convItem} ${
                    selectedConv?.id === conv.id ? styles.convItemActive : ""
                  }`}
                  onClick={() => setSelectedConv(conv)}
                >
                  <div className={styles.convName}>
                    {conv.type === "group" && (
                      <span className={styles.groupIcon}>👥</span>
                    )}
                    {convDisplayName(conv)}
                    {conv.last_message_at && (
                      <span className={styles.convTime}>
                        {formatConvTime(conv.last_message_at)}
                      </span>
                    )}
                  </div>
                  {conv.last_message && (
                    <div className={styles.convPreview}>
                      {conv.last_sender_name?.split(" ")[0]}:{" "}
                      {conv.last_message}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Chat window ── */}
        <div className={styles.chatWindow}>
          {!selectedConv ? (
            <div className={styles.noChat}>
              Select a conversation or start a new one
            </div>
          ) : (
            <>
              <div className={styles.chatHeader}>
                <div className={styles.chatHeaderInfo}>
                  <span className={styles.chatHeaderName}>
                    {selectedConv.type === "group" && "👥 "}
                    {convDisplayName(selectedConv)}
                  </span>
                  {selectedConv.type === "group" &&
                    selectedConv.member_names && (
                      <span className={styles.chatHeaderMembers}>
                        {selectedConv.member_names}
                      </span>
                    )}
                </div>
              </div>

              <div className={styles.chatBox} ref={chatBoxRef}>
                {messages.length === 0 ? (
                  <div className={styles.chatEmpty}>
                    No messages yet. Say hello!
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.sender_id === user.id;
                    const showSender =
                      !isMine && selectedConv.type === "group";
                    return (
                      <div
                        key={msg.id}
                        className={`${styles.messageGroup} ${
                          isMine ? styles.myMessage : styles.otherMessage
                        }`}
                      >
                        {showSender && (
                          <span className={styles.senderLabel}>
                            {msg.first_name}
                          </span>
                        )}
                        <div className={styles.bubble}>{msg.content}</div>
                        <span className={styles.msgTime}>
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              <div className={styles.inputArea}>
                <input
                  className={styles.input}
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMsg()}
                  placeholder="Type a message..."
                />
                <button className={styles.sendButton} onClick={sendMsg}>
                  ↑
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── DM picker modal ── */}
      {showDmModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowDmModal(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>New Message</h2>
            <p className={styles.modalSub}>Select a teammate to message.</p>
            <div className={styles.contactPickList}>
              {contacts.length === 0 ? (
                <div className={styles.emptyConvs}>
                  No teammates found. Join a team first!
                </div>
              ) : (
                contacts.map((c) => (
                  <div
                    key={c.id}
                    className={styles.contactPickItem}
                    onClick={() => startDm(c)}
                  >
                    <div className={styles.contactPickName}>
                      {c.first_name} {c.last_name}
                    </div>
                    <div className={styles.contactPickRole}>{c.role}</div>
                  </div>
                ))
              )}
            </div>
            <div className={styles.modalActions}>
              <button
                className={styles.cancelBtn}
                onClick={() => setShowDmModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Group creation modal ── */}
      {showGroupModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowGroupModal(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Create Group Chat</h2>
            <p className={styles.modalSub}>
              Name your group and select members.
            </p>

            <div className={styles.modalField}>
              <label>Group Name</label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g., Morning Crew"
              />
            </div>

            <div className={styles.modalField}>
              <label>Members</label>
              <div className={styles.memberCheckList}>
                {contacts.map((c) => (
                  <label key={c.id} className={styles.checkLabel}>
                    <input
                      type="checkbox"
                      checked={groupMembers.includes(c.id)}
                      onChange={() => toggleGroupMember(c.id)}
                    />
                    {c.first_name} {c.last_name}{" "}
                    <span style={{ color: "#888", fontSize: "0.8rem" }}>
                      ({c.role})
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {modalError && <p className={styles.modalError}>{modalError}</p>}

            <div className={styles.modalActions}>
              <button
                className={styles.cancelBtn}
                onClick={() => setShowGroupModal(false)}
              >
                Cancel
              </button>
              <button
                className={styles.createBtn}
                onClick={createGroup}
                disabled={!groupName.trim() || groupMembers.length === 0}
              >
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
