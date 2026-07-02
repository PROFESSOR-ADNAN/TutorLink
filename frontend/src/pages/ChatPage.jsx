import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import api from '../services/api';
import useAuthStore from '../context/authStore';
import { useSocket } from '../context/SocketContext';

function ConversationItem({ conv, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition text-left ${
        isActive ? 'bg-primary-50 border-r-2 border-primary-600' : ''
      }`}
    >
      <div className="relative flex-shrink-0">
        <img
          src={conv.otherUser?.avatar}
          alt={conv.otherUser?.name}
          className="w-10 h-10 rounded-full object-cover"
        />
        {conv.unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary-600 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {conv.unreadCount}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm text-gray-900 truncate">{conv.otherUser?.name}</span>
          <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
            {format(new Date(conv.lastMessage.createdAt), 'h:mm a')}
          </span>
        </div>
        <p className="text-xs text-gray-500 truncate">{conv.lastMessage.content}</p>
      </div>
    </button>
  );
}

function Message({ msg, isOwn }) {
  return (
    <div className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isOwn && (
        <img src={msg.sender?.avatar} alt={msg.sender?.name}
          className="w-7 h-7 rounded-full object-cover flex-shrink-0 mb-1" />
      )}
      <div className={`max-w-xs lg:max-w-md ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isOwn
            ? 'bg-primary-600 text-white rounded-br-sm'
            : 'bg-white text-gray-800 border border-gray-100 shadow-sm rounded-bl-sm'
        }`}>
          {msg.content}
        </div>
        <span className="text-xs text-gray-400 px-1">
          {format(new Date(msg.createdAt), 'h:mm a')}
        </span>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { userId: paramUserId } = useParams();
  const { user } = useAuthStore();
  const socket = useSocket();

  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeUserId, setActiveUserId] = useState(paramUserId || null);
  const [activeUser, setActiveUser] = useState(null);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Load conversations
  useEffect(() => {
    api.get('/chat/conversations')
      .then((data) => setConversations(data.conversations))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Load messages when active user changes
  useEffect(() => {
    if (!activeUserId) return;
    api.get(`/chat/${activeUserId}`)
      .then((data) => {
        setMessages(data.messages);
        // find other user's info from conversations
        const conv = conversations.find(c => c.otherUser?._id === activeUserId);
        if (conv) setActiveUser(conv.otherUser);
      })
      .catch(console.error);
  }, [activeUserId, conversations]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Socket.IO listeners
  useEffect(() => {
    if (!socket || !activeUserId) return;

    const roomId = [user._id, activeUserId].sort().join('_');
    socket.emit('join_room', roomId);

    socket.on('receive_message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('user_typing', ({ name }) => {
      setIsTyping(true);
    });

    socket.on('user_stop_typing', () => {
      setIsTyping(false);
    });

    return () => {
      socket.off('receive_message');
      socket.off('user_typing');
      socket.off('user_stop_typing');
    };
  }, [socket, activeUserId, user._id]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !activeUserId) return;

    const content = input.trim();
    setInput('');

    const roomId = [user._id, activeUserId].sort().join('_');

    // Optimistic update — show message instantly before server confirms
    const optimisticMsg = {
      _id: Date.now().toString(),
      content,
      sender: { _id: user._id, name: user.name, avatar: user.avatar },
      createdAt: new Date(),
      isOptimistic: true,
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    // Emit via socket for real-time delivery to the other user
    socket?.emit('send_message', { roomId, content, receiverId: activeUserId });

    // Also persist to DB via REST
    try {
      await api.post('/chat', { receiverId: activeUserId, content });
    } catch (err) {
      console.error('Failed to save message:', err);
    }
  };

  const handleTyping = () => {
    const roomId = [user._id, activeUserId].sort().join('_');
    socket?.emit('typing', roomId);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket?.emit('stop_typing', roomId);
    }, 1500);
  };

  const selectConversation = (conv) => {
    setActiveUserId(conv.otherUser._id);
    setActiveUser(conv.otherUser);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="card overflow-hidden" style={{ height: 'calc(100vh - 8rem)' }}>
        <div className="flex h-full">

          {/* ── Sidebar: conversations list ──────────────── */}
          <div className={`w-72 flex-shrink-0 border-r border-gray-100 flex flex-col ${activeUserId ? 'hidden sm:flex' : 'flex'}`}>
            <div className="px-4 py-4 border-b border-gray-100">
              <h2 className="font-display font-bold text-gray-900">Messages</h2>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex gap-3 animate-pulse">
                      <div className="w-10 h-10 bg-gray-200 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-gray-200 rounded w-3/4" />
                        <div className="h-2 bg-gray-200 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-400">
                  <p className="mb-2">No conversations yet</p>
                  <Link to="/tutors" className="text-primary-600 hover:underline">Find a tutor to chat with</Link>
                </div>
              ) : (
                conversations.map((conv) => (
                  <ConversationItem
                    key={conv._id}
                    conv={conv}
                    isActive={activeUserId === conv.otherUser?._id}
                    onClick={() => selectConversation(conv)}
                  />
                ))
              )}
            </div>
          </div>

          {/* ── Main chat area ───────────────────────────── */}
          <div className="flex-1 flex flex-col min-w-0">
            {activeUserId && activeUser ? (
              <>
                {/* Chat header */}
                <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
                  <button
                    className="sm:hidden p-1 -ml-1 text-gray-400 hover:text-gray-600"
                    onClick={() => setActiveUserId(null)}
                  >
                    ←
                  </button>
                  <img src={activeUser.avatar} alt={activeUser.name}
                    className="w-9 h-9 rounded-full object-cover" />
                  <div>
                    <h3 className="font-semibold text-sm text-gray-900">{activeUser.name}</h3>
                    <p className="text-xs text-gray-400 capitalize">{activeUser.role}</p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-gray-50">
                  {messages.map((msg) => (
                    <Message
                      key={msg._id}
                      msg={msg}
                      isOwn={msg.sender?._id === user._id || msg.sender === user._id}
                    />
                  ))}
                  {isTyping && (
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      {activeUser.name} is typing…
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form onSubmit={handleSend} className="px-5 py-4 border-t border-gray-100 bg-white flex gap-3">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => { setInput(e.target.value); handleTyping(); }}
                    placeholder={`Message ${activeUser.name}…`}
                    className="input flex-1"
                    autoComplete="off"
                  />
                  <button type="submit" disabled={!input.trim()} className="btn-primary px-4 disabled:opacity-40">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-10 bg-gray-50">
                <div className="text-5xl mb-4">💬</div>
                <h3 className="font-display font-bold text-gray-900 text-xl mb-2">Your Messages</h3>
                <p className="text-gray-400 text-sm">Select a conversation or start a new one by booking a session.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
