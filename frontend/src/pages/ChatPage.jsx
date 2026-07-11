import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation, Link } from "react-router-dom";
import { format } from "date-fns";
import toast from "react-hot-toast";
import api from "../services/api";
import useAuthStore from "../context/authStore";
import { useSocket } from "../context/SocketContext";
import { useNotifications } from "../context/NotificationContext";
import Avatar from "../components/ui/Avatar";
import ErrorState from "../components/ui/ErrorState";

function ConversationItem({ conv, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-canvas-100 transition-colors text-left ${
        isActive ? "bg-forest-50 border-r-2 border-forest-800" : ""
      }`}
    >
      <div className="relative flex-shrink-0">
        <Avatar
          src={conv.otherUser?.avatar}
          name={conv.otherUser?.name}
          size="md"
        />
        {conv.unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1 bg-forest-800 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {conv.unreadCount}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-sans font-medium text-sm text-ink-900 truncate">
            {conv.otherUser?.name}
          </span>
          <span className="text-xs text-ink-400 flex-shrink-0">
            {format(new Date(conv.lastMessage.createdAt), "h:mm a")}
          </span>
        </div>
        <p className="text-xs text-ink-400 truncate">
          {conv.lastMessage.content}
        </p>
      </div>
    </button>
  );
}

function Message({ msg, isOwn }) {
  return (
    <div
      className={`flex items-end gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}
    >
      {!isOwn && (
        <Avatar
          src={msg.sender?.avatar}
          name={msg.sender?.name}
          size="sm"
          className="mb-1"
        />
      )}
      <div
        className={`max-w-xs lg:max-w-md flex flex-col gap-1 ${isOwn ? "items-end" : "items-start"}`}
      >
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${
            isOwn
              ? "bg-forest-800 text-white rounded-br-sm"
              : "bg-surface text-ink-800 border border-canvas-300 shadow-xs rounded-bl-sm"
          }`}
        >
          {msg.content}
        </div>
        <span className="text-xs text-ink-400 px-1">
          {format(new Date(msg.createdAt), "h:mm a")}
        </span>
      </div>
    </div>
  );
}

// Every message needs a stable, unique key. Messages loaded from the DB
// already have a Mongo _id, but a message that just arrived over the socket
// is a plain payload with no _id — so we give it one locally.
let localIdCounter = 0;
const withLocalId = (msg) =>
  msg._id ? msg : { ...msg, _id: `local-${Date.now()}-${localIdCounter++}` };

export default function ChatPage() {
  const { userId: paramUserId } = useParams();
  const location = useLocation();
  const { user } = useAuthStore();
  const socket = useSocket();
  const { setActiveRoom, markConversationRead } = useNotifications();

  // When arriving from a "Message" button on a profile page, the other
  // user's basic info is passed via router state so we can render the chat
  // immediately, even before any message has ever been exchanged.
  const linkedUser = location.state?.otherUser || null;

  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeUserId, setActiveUserId] = useState(paramUserId || null);
  const [activeUser, setActiveUser] = useState(linkedUser);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(!!paramUserId);
  const [conversationsError, setConversationsError] = useState(null);
  const [messagesError, setMessagesError] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const loadConversations = useCallback(() => {
    setConversationsError(null);
    return api
      .get("/chat/conversations")
      .then((data) => setConversations(data.conversations || []))
      .catch((err) =>
        setConversationsError(
          err.message || "Could not load your conversations",
        ),
      );
  }, []);

  // Load the conversation list once on mount
  useEffect(() => {
    loadConversations().finally(() => setLoadingConversations(false));
  }, [loadConversations]);

  // Keep state in sync if the URL param changes (e.g. navigating chat -> chat/:id)
  useEffect(() => {
    if (paramUserId && paramUserId !== activeUserId) {
      setActiveUserId(paramUserId);
      setActiveUser(linkedUser);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramUserId]);

  // Load message history for the active conversation. Works whether or not
  // a conversation already exists — a brand-new thread just returns [].
  const loadMessages = useCallback((userId) => {
    setLoadingMessages(true);
    setMessagesError(null);
    return api
      .get(`/chat/${userId}`)
      .then((data) => {
        setMessages((data.messages || []).map(withLocalId));
      })
      .catch((err) =>
        setMessagesError(err.message || "Could not load this conversation"),
      )
      .finally(() => setLoadingMessages(false));
  }, []);

  useEffect(() => {
    if (!activeUserId) return;
    loadMessages(activeUserId).then(() => {
      const conv = conversations.find((c) => c.otherUser?._id === activeUserId);
      if (conv) setActiveUser(conv.otherUser);
      markConversationRead(activeUserId);
      setConversations((prev) =>
        prev.map((c) => (c.otherUser?._id === activeUserId ? { ...c, unreadCount: 0 } : c))
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUserId]);

  // If the conversation list finishes loading after we've already picked an
  // active user (e.g. a deep link), backfill their name/avatar from it.
  useEffect(() => {
    if (!activeUserId || activeUser) return;
    const conv = conversations.find((c) => c.otherUser?._id === activeUserId);
    if (conv) setActiveUser(conv.otherUser);
  }, [conversations, activeUserId, activeUser]);

  // Socket.IO listeners for the active room
  useEffect(() => {
    if (!socket || !activeUserId || !user?._id) return;

    const roomId = [user._id, activeUserId].sort().join("_");
    socket.emit("join_room", roomId);
    setActiveRoom(roomId);

    const handleReceive = (msg) =>
      setMessages((prev) => [...prev, withLocalId(msg)]);
    const handleTyping = () => setIsTyping(true);
    const handleStopTyping = () => setIsTyping(false);

    socket.on("receive_message", handleReceive);
    socket.on("user_typing", handleTyping);
    socket.on("user_stop_typing", handleStopTyping);

    return () => {
      socket.off("receive_message", handleReceive);
      socket.off("user_typing", handleTyping);
      socket.off("user_stop_typing", handleStopTyping);
      setIsTyping(false);
      setActiveRoom(null);
    };
  }, [socket, activeUserId, user?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = async (e) => {
    e.preventDefault();
    const content = input.trim();
    if (!content || !activeUserId) return;

    // Defensive guard: if auth state hasn't fully hydrated yet (e.g. a stale
    // user object right after registering/logging in), don't let this throw
    // silently — bail out loudly instead of crashing the handler.
    if (!user?._id) {
      toast.error("Still setting up your session — please try again in a moment.");
      return;
    }

    setInput("");

    const roomId = [user._id, activeUserId].sort().join("_");
    const optimisticMsg = withLocalId({
      content,
      sender: { _id: user._id, name: user.name, avatar: user.avatar },
      createdAt: new Date().toISOString(),
    });
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      await api.post("/chat", { receiverId: activeUserId, content });
      socket?.emit("send_message", { roomId, content, receiverId: activeUserId });
      // First message in a brand-new thread — refresh the sidebar so it appears there too
      if (!conversations.some((c) => c.otherUser?._id === activeUserId)) {
        loadConversations();
      }
    } catch (err) {
      // Never let a failed send just vanish — restore it to the input and
      // remove the optimistic bubble so the UI matches reality.
      setMessages((prev) => prev.filter((m) => m._id !== optimisticMsg._id));
      setInput(content);
      toast.error(err.message || "Message failed to send");
    }
  };

  const handleTyping = () => {
    if (!activeUserId || !user?._id) return;
    const roomId = [user._id, activeUserId].sort().join("_");
    socket?.emit("typing", roomId);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(
      () => socket?.emit("stop_typing", roomId),
      1500,
    );
  };

  const selectConversation = (conv) => {
    setActiveUserId(conv.otherUser._id);
    setActiveUser(conv.otherUser);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div
        className="card overflow-hidden"
        style={{ height: "calc(100vh - 8rem)" }}
      >
        <div className="flex h-full">
          {/* ── Sidebar: conversations list ──────────────── */}
          <div
            className={`w-full sm:w-72 flex-shrink-0 border-r border-canvas-300 flex-col ${activeUserId ? "hidden sm:flex" : "flex"}`}
          >
            <div className="px-4 py-4 border-b border-canvas-300">
              <h2 className="font-serif text-lg text-ink-900">Messages</h2>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingConversations ? (
                <div className="p-4 space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex gap-3 animate-pulse">
                      <div className="w-10 h-10 bg-canvas-300 rounded-full" />
                      <div className="flex-1 space-y-2 py-1">
                        <div className="h-3 bg-canvas-300 rounded w-3/4" />
                        <div className="h-2 bg-canvas-300 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : conversationsError ? (
                <ErrorState
                  message={conversationsError}
                  onRetry={() => {
                    setLoadingConversations(true);
                    loadConversations().finally(() =>
                      setLoadingConversations(false),
                    );
                  }}
                />
              ) : conversations.length === 0 && !activeUser ? (
                <div className="p-6 text-center text-sm text-ink-400">
                  <p className="mb-2">No conversations yet</p>
                  <Link
                    to="/tutors"
                    className="text-accent font-medium hover:underline"
                  >
                    Find a tutor to chat with
                  </Link>
                </div>
              ) : (
                <>
                  {/* A brand-new thread (from a "Message" link) that hasn't sent its first message yet */}
                  {activeUser &&
                    !conversations.some(
                      (c) => c.otherUser?._id === activeUserId,
                    ) && (
                      <ConversationItem
                        conv={{
                          _id: "new",
                          otherUser: activeUser,
                          unreadCount: 0,
                          lastMessage: {
                            content: "New conversation",
                            createdAt: new Date(),
                          },
                        }}
                        isActive
                        onClick={() => {}}
                      />
                    )}
                  {conversations.map((conv) => (
                    <ConversationItem
                      key={conv._id}
                      conv={conv}
                      isActive={activeUserId === conv.otherUser?._id}
                      onClick={() => selectConversation(conv)}
                    />
                  ))}
                </>
              )}
            </div>
          </div>

          {/* ── Main chat area ───────────────────────────── */}
          <div
            className={`flex-1 flex-col min-w-0 ${activeUserId ? "flex" : "hidden sm:flex"}`}
          >
            {activeUserId && activeUser ? (
              <>
                {/* Chat header */}
                <div className="px-5 py-4 border-b border-canvas-300 flex items-center gap-3">
                  <button
                    className="sm:hidden p-1 -ml-1 text-ink-400 hover:text-ink-700"
                    onClick={() => setActiveUserId(null)}
                    aria-label="Back to conversations"
                  >
                    ←
                  </button>
                  <Avatar
                    src={activeUser.avatar}
                    name={activeUser.name}
                    size="sm"
                  />
                  <div>
                    <h3 className="font-sans font-semibold text-sm text-ink-900">
                      {activeUser.name}
                    </h3>
                    {activeUser.role && (
                      <p className="text-xs text-ink-400 capitalize">
                        {activeUser.role}
                      </p>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-canvas-100">
                  {loadingMessages ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className={`h-10 rounded-2xl bg-canvas-300 animate-pulse ${i % 2 ? "ml-auto w-1/3" : "w-1/2"}`}
                        />
                      ))}
                    </div>
                  ) : messagesError ? (
                    <ErrorState
                      message={messagesError}
                      onRetry={() => loadMessages(activeUserId)}
                    />
                  ) : messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                      <p className="text-sm text-ink-400">
                        Say hello to {activeUser.name.split(" ")[0]} — this is
                        the start of your conversation.
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <Message
                        key={msg._id}
                        msg={msg}
                        isOwn={
                          msg.sender?._id === user._id ||
                          msg.sender === user._id
                        }
                      />
                    ))
                  )}
                  {isTyping && (
                    <div className="flex items-center gap-2 text-xs text-ink-400">
                      <div className="flex gap-1">
                        <span
                          className="w-1.5 h-1.5 bg-ink-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        />
                        <span
                          className="w-1.5 h-1.5 bg-ink-400 rounded-full animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        />
                        <span
                          className="w-1.5 h-1.5 bg-ink-400 rounded-full animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        />
                      </div>
                      {activeUser.name} is typing…
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form
                  onSubmit={handleSend}
                  className="px-5 py-4 border-t border-canvas-300 bg-surface flex gap-3"
                >
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      handleTyping();
                    }}
                    placeholder={`Message ${activeUser.name}…`}
                    className="input flex-1"
                    autoComplete="off"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className="btn-primary px-4 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-10 bg-canvas-100">
                <div className="text-5xl mb-4">💬</div>
                <h3 className="font-serif text-ink-900 text-xl mb-2">
                  Your Messages
                </h3>
                <p className="text-ink-400 text-sm">
                  Select a conversation, or visit a tutor's profile to start a
                  new one.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
