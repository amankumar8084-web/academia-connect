import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import api from "@/lib/api";
import { connectSocket, disconnectSocket } from "@/lib/socket";
import { toast } from "sonner";
import {
  MessageSquare, Search, Send, Users, ArrowLeft, Circle, Plus, X, Check, UsersRound
} from "lucide-react";

/* ───── colour palette for group avatars ───── */
const GROUP_COLORS = [
  "bg-violet-600", "bg-blue-600", "bg-emerald-600", "bg-amber-600",
  "bg-rose-600", "bg-cyan-600", "bg-fuchsia-600", "bg-teal-600",
];

export default function Chat() {
  const { user } = useAuth();

  /* ───── shared state ───── */
  const [activeTab, setActiveTab] = useState("dm"); // "dm" | "group"
  const [showContacts, setShowContacts] = useState(true); // mobile toggle
  const [searchTerm, setSearchTerm] = useState("");

  /* ───── DM state ───── */
  const [contacts, setContacts] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [typing, setTyping] = useState(false);

  /* ───── Group state ───── */
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupMessages, setGroupMessages] = useState([]);
  const [newGroupMessage, setNewGroupMessage] = useState("");
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingGroupMessages, setLoadingGroupMessages] = useState(false);

  /* ───── Create-group modal state ───── */
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [cgName, setCgName] = useState("");
  const [cgDesc, setCgDesc] = useState("");
  const [cgSelected, setCgSelected] = useState([]);   // member ids
  const [cgSearch, setCgSearch] = useState("");
  const [cgSubmitting, setCgSubmitting] = useState(false);

  /* ───── refs ───── */
  const scrollRef = useRef(null);
  const groupScrollRef = useRef(null);
  const textareaRef = useRef(null);
  const groupTextareaRef = useRef(null);
  const socketRef = useRef(null);
  const typingTimeout = useRef(null);
  const selectedUserRef = useRef(null);

  /* ═══════════════════════════════════════════
     DM logic (unchanged from original)
     ═══════════════════════════════════════════ */

  const fetchContacts = useCallback(async () => {
    try {
      const { data } = await api.get("/chat/users");
      setContacts(data);
    } catch {
      toast.error("Failed to load contacts");
    } finally {
      setLoadingContacts(false);
    }
  }, []);

  useEffect(() => {
    if (!user?._id) return;
    fetchContacts();

    const socket = connectSocket(user._id);
    socketRef.current = socket;

    socket.on("online_users", (users) => setOnlineUsers(users));

    socket.on("new_message", (msg) => {
      setMessages((prev) => {
        if (prev.find((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      fetchContacts();
    });

    socket.on("user_typing", ({ senderId }) => {
      if (selectedUserRef.current?._id === senderId) setTyping(true);
    });
    socket.on("user_stop_typing", () => setTyping(false));

    // Group real-time
    socket.on("group_new_message", (msg) => {
      setGroupMessages((prev) => {
        if (prev.find((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      fetchGroups();
    });

    return () => {
      socket.off("online_users");
      socket.off("new_message");
      socket.off("user_typing");
      socket.off("user_stop_typing");
      socket.off("group_new_message");
      disconnectSocket();
    };
  }, [user, fetchContacts]);

  useEffect(() => { selectedUserRef.current = selectedUser; }, [selectedUser]);

  useEffect(() => {
    if (!selectedUser) return;
    setLoadingMessages(true);
    (async () => {
      try {
        const { data } = await api.get(`/chat/messages/${selectedUser._id}`);
        setMessages(data);
      } catch {
        toast.error("Failed to load messages");
      } finally {
        setLoadingMessages(false);
      }
    })();
    fetchContacts();
  }, [selectedUser, fetchContacts]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;
    try {
      const { data } = await api.post("/chat/messages", {
        receiverId: selectedUser._id,
        content: newMessage.trim(),
      });
      setMessages((prev) => [...prev, data]);
      socketRef.current?.emit("send_message", data);
      setNewMessage("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      fetchContacts();
    } catch {
      toast.error("Failed to send message");
    }
  };

  const handleTyping = () => {
    if (!selectedUser) return;
    socketRef.current?.emit("typing", { senderId: user._id, receiverId: selectedUser._id });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socketRef.current?.emit("stop_typing", { senderId: user._id, receiverId: selectedUser._id });
    }, 1500);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleTextareaInput = (e) => {
    setNewMessage(e.target.value);
    handleTyping();
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 100) + "px";
  };

  /* ═══════════════════════════════════════════
     Group logic
     ═══════════════════════════════════════════ */

  const fetchGroups = useCallback(async () => {
    try {
      const { data } = await api.get("/groups");
      setGroups(data);
    } catch {
      toast.error("Failed to load groups");
    } finally {
      setLoadingGroups(false);
    }
  }, []);

  // Fetch groups on mount
  useEffect(() => { if (user?._id) fetchGroups(); }, [user, fetchGroups]);

  // Join socket rooms for all groups
  useEffect(() => {
    if (!socketRef.current || groups.length === 0) return;
    groups.forEach((g) => socketRef.current.emit("join_group", g._id));
  }, [groups]);

  // Load group messages when selecting a group
  useEffect(() => {
    if (!selectedGroup) return;
    setLoadingGroupMessages(true);
    (async () => {
      try {
        const { data } = await api.get(`/groups/${selectedGroup._id}/messages`);
        setGroupMessages(data);
      } catch {
        toast.error("Failed to load group messages");
      } finally {
        setLoadingGroupMessages(false);
      }
    })();
  }, [selectedGroup]);

  useEffect(() => { groupScrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [groupMessages]);

  const handleGroupSend = async (e) => {
    e?.preventDefault();
    if (!newGroupMessage.trim() || !selectedGroup) return;
    try {
      const { data } = await api.post(`/groups/${selectedGroup._id}/messages`, {
        content: newGroupMessage.trim(),
      });
      setGroupMessages((prev) => [...prev, data]);
      socketRef.current?.emit("send_group_message", data);
      setNewGroupMessage("");
      if (groupTextareaRef.current) groupTextareaRef.current.style.height = "auto";
      fetchGroups();
    } catch {
      toast.error("Failed to send message");
    }
  };

  const handleGroupKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleGroupSend(); }
  };

  const handleGroupTextareaInput = (e) => {
    setNewGroupMessage(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 100) + "px";
  };

  /* ───── Create-group handlers ───── */
  const handleCreateGroup = async () => {
    if (!cgName.trim()) return toast.error("Group name is required");
    setCgSubmitting(true);
    try {
      const { data } = await api.post("/groups", {
        name: cgName.trim(),
        description: cgDesc.trim(),
        memberIds: cgSelected,
      });
      setGroups((prev) => [data, ...prev]);
      socketRef.current?.emit("join_group", data._id);
      toast.success("Group created!");
      setShowCreateGroup(false);
      setCgName(""); setCgDesc(""); setCgSelected([]); setCgSearch("");
      // auto-select the new group
      setSelectedGroup(data);
      setSelectedUser(null);
      setActiveTab("group");
      setShowContacts(false);
    } catch {
      toast.error("Failed to create group");
    } finally {
      setCgSubmitting(false);
    }
  };

  const toggleCgMember = (id) => {
    setCgSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  /* ───── helpers ───── */
  const isOnline = (userId) => onlineUsers.includes(userId);
  const roleLabel = (r) =>
    r === "super-admin" ? "Super Admin" : r === "admin" ? "Faculty" : r === "student" ? "Student" : r?.replace("_", " ") || "";
  const initials = (name, email) =>
    name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : email?.charAt(0).toUpperCase() || "U";
  const fmtTime = (d) => new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const filteredContacts = contacts.filter((c) =>
    (c.name || c.email || "").toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectContact = (contact) => {
    setSelectedUser(contact);
    setSelectedGroup(null);
    setShowContacts(false);
  };

  const selectGroup = (group) => {
    setSelectedGroup(group);
    setSelectedUser(null);
    setShowContacts(false);
  };

  /* contact list for the create-group modal (already loaded) */
  const cgContacts = contacts.filter((c) =>
    (c.name || c.email || "").toLowerCase().includes(cgSearch.toLowerCase())
  );

  /* ═══════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════ */

  return (
    <DashboardLayout title="Chat">
      <div className="flex h-[calc(100vh-7rem)] sm:h-[calc(100vh-8rem)] rounded-xl border border-border/50 bg-card overflow-hidden shadow-sm">

        {/* ── Sidebar ── */}
        <div className={`${showContacts ? "flex" : "hidden"} md:flex flex-col w-full md:w-80 lg:w-[340px] shrink-0 border-r border-border/50 bg-card`}>
          {/* Header */}
          <div className="p-4 border-b border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="h-5 w-5 text-primary" />
              <h2 className="font-bold text-base text-primary">Campus Connect</h2>
            </div>

            {/* Tabs: DMs / Groups */}
            <div className="flex rounded-lg bg-muted/40 p-1 mb-3">
              <button
                onClick={() => setActiveTab("dm")}
                className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${activeTab === "dm"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                DMs
              </button>
              <button
                onClick={() => setActiveTab("group")}
                className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${activeTab === "group"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                Groups
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={activeTab === "dm" ? "Search contacts..." : "Search groups..."}
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              />
            </div>
          </div>

          {/* List area */}
          <div className="flex-1 overflow-y-auto">

            {/* ── DM contacts tab ── */}
            {activeTab === "dm" && (
              <>
                {loadingContacts ? (
                  <p className="text-center py-10 text-sm text-muted-foreground">Loading contacts...</p>
                ) : filteredContacts.length === 0 ? (
                  <div className="text-center py-10 px-4">
                    <Users className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">No contacts found</p>
                  </div>
                ) : (
                  filteredContacts.map((c) => (
                    <button
                      key={c._id}
                      onClick={() => selectContact(c)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 border-l-[3px] ${selectedUser?._id === c._id
                          ? "bg-muted/50 border-primary"
                          : "border-transparent"
                        }`}
                    >
                      <div className="relative shrink-0">
                        {c.profilePicture ? (
                          <img src={c.profilePicture} alt="" className="h-11 w-11 rounded-full object-cover" />
                        ) : (
                          <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                            {initials(c.name, c.email)}
                          </div>
                        )}
                        <div className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card ${isOnline(c._id) ? "bg-green-500" : "bg-muted-foreground/40"
                          }`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                          {c.lastMessage && (
                            <span className="text-[10px] text-muted-foreground shrink-0 ml-1">
                              {fmtTime(c.lastMessage.time)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <p className="text-xs text-muted-foreground truncate">
                            {c.lastMessage
                              ? `${c.lastMessage.isMine ? "You: " : ""}${c.lastMessage.content}`
                              : roleLabel(c.role)}
                          </p>
                          {c.unreadCount > 0 && (
                            <span className="ml-2 shrink-0 h-5 min-w-[20px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1.5">
                              {c.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </>
            )}

            {/* ── Groups tab ── */}
            {activeTab === "group" && (
              <>
                {/* Create Group button */}
                <button
                  onClick={() => setShowCreateGroup(true)}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-primary hover:bg-primary/5 transition-colors border-b border-border/30"
                >
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <Plus className="h-4 w-4" />
                  </div>
                  Create New Group
                </button>

                {loadingGroups ? (
                  <p className="text-center py-10 text-sm text-muted-foreground">Loading groups...</p>
                ) : filteredGroups.length === 0 ? (
                  <div className="text-center py-10 px-4">
                    <UsersRound className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">No groups yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Create one to get started!</p>
                  </div>
                ) : (
                  filteredGroups.map((g) => (
                    <button
                      key={g._id}
                      onClick={() => selectGroup(g)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 border-l-[3px] ${selectedGroup?._id === g._id
                          ? "bg-muted/50 border-primary"
                          : "border-transparent"
                        }`}
                    >
                      <div className={`h-11 w-11 rounded-full ${GROUP_COLORS[g.colorIndex % GROUP_COLORS.length]} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                        {g.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-foreground truncate">{g.name}</p>
                          {g.lastMessage && (
                            <span className="text-[10px] text-muted-foreground shrink-0 ml-1">
                              {fmtTime(g.lastMessage.time)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <p className="text-xs text-muted-foreground truncate">
                            {g.lastMessage
                              ? `${g.lastMessage.senderName}: ${g.lastMessage.content}`
                              : `${g.members?.length || 0} members`}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Chat Area ── */}
        <div className={`${!showContacts ? "flex" : "hidden"} md:flex flex-col flex-1 min-w-0`}>

          {/* ─── DM chat area ─── */}
          {selectedUser ? (
            <>
              {/* Chat Header */}
              <div className="px-4 py-3 border-b border-border/50 flex items-center gap-3">
                <button onClick={() => setShowContacts(true)} className="md:hidden p-1 -ml-1 text-muted-foreground hover:text-foreground transition">
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="relative shrink-0">
                  {selectedUser.profilePicture ? (
                    <img src={selectedUser.profilePicture} alt="" className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-sm">
                      {initials(selectedUser.name, selectedUser.email)}
                    </div>
                  )}
                  <div className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-card ${isOnline(selectedUser._id) ? "bg-green-500" : "bg-muted-foreground/40"
                    }`} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground truncate">{selectedUser.name}</h3>
                  <p className="text-xs text-muted-foreground truncate">
                    {selectedUser.department ? `${selectedUser.department} • ` : ""}
                    {typing ? (
                      <span className="text-green-500 font-medium">typing...</span>
                    ) : isOnline(selectedUser._id) ? (
                      <span className="text-green-500">Online</span>
                    ) : "Offline"}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 bg-muted/20 space-y-3">
                {loadingMessages ? (
                  <p className="text-center text-sm text-muted-foreground py-10">Loading messages...</p>
                ) : messages.length === 0 ? (
                  <div className="text-center py-16">
                    <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground text-sm">No messages yet. Say hello!</p>
                  </div>
                ) : (
                  <>
                    {messages.map((msg, i) => {
                      const isMine = msg.sender === user?._id || msg.sender?._id === user?._id;
                      const msgDate = new Date(msg.createdAt).toLocaleDateString();
                      const prevDate = i > 0 ? new Date(messages[i - 1].createdAt).toLocaleDateString() : null;
                      const showDate = msgDate !== prevDate;
                      return (
                        <div key={msg._id || i}>
                          {showDate && (
                            <div className="text-center my-4">
                              <span className="bg-muted px-3 py-1 rounded-full text-[11px] text-muted-foreground">
                                {msgDate === new Date().toLocaleDateString() ? "Today" : msgDate}
                              </span>
                            </div>
                          )}
                          <div className={`flex gap-2.5 max-w-[75%] ${isMine ? "ml-auto flex-row-reverse" : ""}`}>
                            <div className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${isMine ? "bg-primary" : "bg-green-600"}`}>
                              {isMine ? initials(user?.name, user?.email) : initials(selectedUser.name, selectedUser.email)}
                            </div>
                            <div>
                              <div className={`px-4 py-2.5 rounded-2xl text-sm ${isMine
                                  ? "bg-primary text-primary-foreground rounded-br-md"
                                  : "bg-card border border-border/50 text-foreground rounded-bl-md shadow-sm"
                                }`}>
                                {msg.content}
                              </div>
                              <p className={`text-[10px] mt-1 ${isMine ? "text-right" : "text-left"} text-muted-foreground`}>
                                {fmtTime(msg.createdAt)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={scrollRef} />
                  </>
                )}
              </div>

              {/* Input */}
              <div className="p-3 sm:p-4 border-t border-border/50 bg-card">
                <div className="flex items-end gap-2 sm:gap-3">
                  <div className="flex-1 border border-border rounded-2xl px-4 py-2 flex items-end gap-2 bg-muted/20 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition">
                    <textarea
                      ref={textareaRef}
                      value={newMessage}
                      onChange={handleTextareaInput}
                      onKeyDown={handleKeyDown}
                      placeholder="Type your message..."
                      rows={1}
                      className="flex-1 bg-transparent border-none outline-none resize-none text-sm py-1 max-h-[100px] placeholder:text-muted-foreground"
                    />
                  </div>
                  <button
                    onClick={handleSend}
                    disabled={!newMessage.trim()}
                    className="shrink-0 h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-green-600 text-white flex items-center justify-center hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          ) : selectedGroup ? (
            /* ─── Group chat area ─── */
            <>
              {/* Group Header */}
              <div className="px-4 py-3 border-b border-border/50 flex items-center gap-3">
                <button onClick={() => setShowContacts(true)} className="md:hidden p-1 -ml-1 text-muted-foreground hover:text-foreground transition">
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className={`h-10 w-10 rounded-full ${GROUP_COLORS[selectedGroup.colorIndex % GROUP_COLORS.length]} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                  {selectedGroup.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground truncate">{selectedGroup.name}</h3>
                  <p className="text-xs text-muted-foreground truncate">
                    {selectedGroup.members?.length || 0} members
                    {selectedGroup.description ? ` • ${selectedGroup.description}` : ""}
                  </p>
                </div>
              </div>

              {/* Group Messages */}
              <div className="flex-1 overflow-y-auto p-4 bg-muted/20 space-y-3">
                {loadingGroupMessages ? (
                  <p className="text-center text-sm text-muted-foreground py-10">Loading messages...</p>
                ) : groupMessages.length === 0 ? (
                  <div className="text-center py-16">
                    <UsersRound className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground text-sm">No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  <>
                    {groupMessages.map((msg, i) => {
                      const senderId = msg.sender?._id || msg.sender;
                      const isMine = senderId === user?._id;
                      const senderName = msg.sender?.name || "Unknown";
                      const msgDate = new Date(msg.createdAt).toLocaleDateString();
                      const prevDate = i > 0 ? new Date(groupMessages[i - 1].createdAt).toLocaleDateString() : null;
                      const showDate = msgDate !== prevDate;
                      return (
                        <div key={msg._id || i}>
                          {showDate && (
                            <div className="text-center my-4">
                              <span className="bg-muted px-3 py-1 rounded-full text-[11px] text-muted-foreground">
                                {msgDate === new Date().toLocaleDateString() ? "Today" : msgDate}
                              </span>
                            </div>
                          )}
                          <div className={`flex gap-2.5 max-w-[75%] ${isMine ? "ml-auto flex-row-reverse" : ""}`}>
                            <div className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${isMine ? "bg-primary" : "bg-emerald-600"}`}>
                              {initials(isMine ? user?.name : senderName, "")}
                            </div>
                            <div>
                              {!isMine && (
                                <p className="text-[10px] text-muted-foreground mb-0.5 ml-1">{senderName}</p>
                              )}
                              <div className={`px-4 py-2.5 rounded-2xl text-sm ${isMine
                                  ? "bg-primary text-primary-foreground rounded-br-md"
                                  : "bg-card border border-border/50 text-foreground rounded-bl-md shadow-sm"
                                }`}>
                                {msg.content}
                              </div>
                              <p className={`text-[10px] mt-1 ${isMine ? "text-right" : "text-left"} text-muted-foreground`}>
                                {fmtTime(msg.createdAt)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={groupScrollRef} />
                  </>
                )}
              </div>

              {/* Group Input */}
              <div className="p-3 sm:p-4 border-t border-border/50 bg-card">
                <div className="flex items-end gap-2 sm:gap-3">
                  <div className="flex-1 border border-border rounded-2xl px-4 py-2 flex items-end gap-2 bg-muted/20 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition">
                    <textarea
                      ref={groupTextareaRef}
                      value={newGroupMessage}
                      onChange={handleGroupTextareaInput}
                      onKeyDown={handleGroupKeyDown}
                      placeholder="Type your message..."
                      rows={1}
                      className="flex-1 bg-transparent border-none outline-none resize-none text-sm py-1 max-h-[100px] placeholder:text-muted-foreground"
                    />
                  </div>
                  <button
                    onClick={handleGroupSend}
                    disabled={!newGroupMessage.trim()}
                    className="shrink-0 h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-green-600 text-white flex items-center justify-center hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* ─── Empty state ─── */
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <MessageSquare className="h-10 w-10 text-primary/50" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Campus Connect</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Select a contact or group to start messaging. Your conversations are private and secure.
              </p>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════
            Create Group Modal
            ═══════════════════════════════════════════ */}
        {showCreateGroup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-card rounded-2xl shadow-xl border border-border w-full max-w-md max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
              {/* Modal header */}
              <div className="flex items-center justify-between p-5 border-b border-border/50">
                <h3 className="font-bold text-lg text-foreground">Create Group</h3>
                <button onClick={() => setShowCreateGroup(false)} className="p-1 rounded-lg hover:bg-muted transition">
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>

              {/* Modal body */}
              <div className="p-5 flex-1 overflow-y-auto space-y-4">
                {/* Group name */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Group Name *</label>
                  <input
                    value={cgName}
                    onChange={(e) => setCgName(e.target.value)}
                    placeholder="e.g. AI Research Team"
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Description</label>
                  <input
                    value={cgDesc}
                    onChange={(e) => setCgDesc(e.target.value)}
                    placeholder="Optional description"
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  />
                </div>

                {/* Add members */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    Add Members ({cgSelected.length} selected)
                  </label>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      value={cgSearch}
                      onChange={(e) => setCgSearch(e.target.value)}
                      placeholder="Search people..."
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                    />
                  </div>

                  {/* Selected chips */}
                  {cgSelected.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {cgSelected.map((id) => {
                        const c = contacts.find((x) => x._id === id);
                        return (
                          <span key={id} className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                            {c?.name || "User"}
                            <button onClick={() => toggleCgMember(id)} className="hover:text-red-500">
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Contact list */}
                  <div className="max-h-48 overflow-y-auto border border-border/50 rounded-lg">
                    {cgContacts.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No users found</p>
                    ) : (
                      cgContacts.map((c) => {
                        const sel = cgSelected.includes(c._id);
                        return (
                          <button
                            key={c._id}
                            onClick={() => toggleCgMember(c._id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/50 ${sel ? "bg-primary/5" : ""}`}
                          >
                            <div className="relative shrink-0">
                              {c.profilePicture ? (
                                <img src={c.profilePicture} alt="" className="h-9 w-9 rounded-full object-cover" />
                              ) : (
                                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                  {initials(c.name, c.email)}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{roleLabel(c.role)}</p>
                            </div>
                            <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition ${sel ? "border-primary bg-primary" : "border-muted-foreground/30"
                              }`}>
                              {sel && <Check className="h-3 w-3 text-white" />}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Modal footer */}
              <div className="p-5 border-t border-border/50 flex gap-3">
                <button
                  onClick={() => setShowCreateGroup(false)}
                  className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateGroup}
                  disabled={!cgName.trim() || cgSubmitting}
                  className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
                >
                  {cgSubmitting ? "Creating..." : "Create Group"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}