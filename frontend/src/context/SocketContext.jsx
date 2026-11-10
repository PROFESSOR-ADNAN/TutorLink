import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import useAuthStore from '../context/authStore';

const SocketContext = createContext(null);

// Derive the Socket.IO server URL from the API URL or fallback to the Render backend
const getSocketUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (!apiUrl) {
    // In local development, use same origin (vite proxy). In production, connect directly to Render.
    return window.location.hostname.includes('localhost')
      ? window.location.origin
      : 'https://tutorlink-backend-7uqu.onrender.com';
  }
  try {
    return new URL(apiUrl, window.location.origin).origin;
  } catch {
    return window.location.origin;
  }
};

export const SocketProvider = ({ children }) => {
  // IMPORTANT: this must be React state, not a ref. Updating a ref never
  // triggers a re-render, so the <SocketContext.Provider value={...}> below
  // would keep handing out `null` to every consumer forever, even after the
  // socket connects — silently breaking every real-time feature (chat,
  // typing indicators, etc). State is what makes the new value propagate.
  const [socket, setSocket] = useState(null);
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      setSocket((current) => {
        current?.disconnect();
        return null;
      });
      return;
    }

    // No token to hand over — `withCredentials: true` makes the browser
    // send our httpOnly auth cookie along with the handshake, same as any
    // other request. The backend reads it in config/socket.js.
    const instance = io(getSocketUrl(), {
      withCredentials: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    instance.on('connect_error', (err) => {
      if (import.meta.env.DEV) console.error('Socket connection error:', err.message);
    });

    setSocket(instance);

    return () => {
      instance.disconnect();
    };
  }, [isAuthenticated]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
};

export const useSocket = () => useContext(SocketContext);
