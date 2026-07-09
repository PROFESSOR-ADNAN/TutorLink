import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import useAuthStore from './authStore';
import { useSocket } from './SocketContext';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { isAuthenticated } = useAuthStore();
  const socket = useSocket();
  // Conversations with at least one unread message — enough info to render
  // a "you have new messages from X" list, not just a bare count.
  const [unreadConversations, setUnreadConversations] = useState([]);
  // The chat room currently open on screen, if any. A message that arrives
  // for this room is already visible to the user, so it shouldn't bump the
  // notification badge — only messages for *other* conversations should.
  const activeRoomIdRef = useRef(null);

  const refreshUnread = useCallback(() => {
    if (!isAuthenticated) return Promise.resolve();
    return api
      .get('/chat/conversations')
      .then((data) => {
        setUnreadConversations((data.conversations || []).filter((c) => c.unreadCount > 0));
      })
      .catch(() => {}); // notifications are a nice-to-have, never block the app on this failing
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) refreshUnread();
    else setUnreadConversations([]);
  }, [isAuthenticated, refreshUnread]);

  useEffect(() => {
    if (!socket) return;
    const handleNewMessage = (msg) => {
      if (msg.roomId && msg.roomId === activeRoomIdRef.current) return; // already visible on screen
      refreshUnread();
    };
    socket.on('new_message_notification', handleNewMessage);
    return () => socket.off('new_message_notification', handleNewMessage);
  }, [socket, refreshUnread]);

  const setActiveRoom = useCallback((roomId) => {
    activeRoomIdRef.current = roomId;
  }, []);

  // Called the moment a conversation is opened — decrements the badge
  // immediately (optimistic, Telegram-style) rather than waiting on a
  // network round trip, then reconciles with the server shortly after.
  const markConversationRead = useCallback((otherUserId) => {
    setUnreadConversations((prev) => prev.filter((c) => c.otherUser?._id !== otherUserId));
    setTimeout(refreshUnread, 300);
  }, [refreshUnread]);

  const totalUnread = unreadConversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <NotificationContext.Provider
      value={{ unreadConversations, totalUnread, refreshUnread, setActiveRoom, markConversationRead }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
