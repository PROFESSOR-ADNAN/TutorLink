import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import useAuthStore from './context/authStore';

// Layout
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';

// Pages
import HomePage from './pages/HomePage';
import TutorsPage from './pages/TutorsPage';
import TutorProfilePage from './pages/TutorProfilePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import BookingPage from './pages/BookingPage';
import ChatPage from './pages/ChatPage';
import ProfilePage from './pages/ProfilePage';
import BecomeTutorPage from './pages/BecomeTutorPage';
import NotFoundPage from './pages/NotFoundPage';

// Guard for protected routes
const PrivateRoute = ({ children, roles }) => {
  const { isAuthenticated, user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user?.role)) return <Navigate to="/dashboard" replace />;
  return children;
};

export default function App() {
  const checkAuth = useAuthStore((s) => s.checkAuth);

  // Check if user is already logged in when the app loads
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <SocketProvider>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />
        <main className="flex-1">
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/tutors" element={<TutorsPage />} />
            <Route path="/tutors/:id" element={<TutorProfilePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected routes */}
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <DashboardPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/book/:tutorId"
              element={
                <PrivateRoute roles={['student']}>
                  <BookingPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/chat"
              element={
                <PrivateRoute>
                  <ChatPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/chat/:userId"
              element={
                <PrivateRoute>
                  <ChatPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <PrivateRoute>
                  <ProfilePage />
                </PrivateRoute>
              }
            />
            <Route
              path="/become-tutor"
              element={
                <PrivateRoute>
                  <BecomeTutorPage />
                </PrivateRoute>
              }
            />

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </SocketProvider>
  );
}
