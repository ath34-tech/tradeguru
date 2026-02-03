import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import AuthGuard from './components/AuthGuard';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import MentorsPage from './pages/MentorsPage';
import ChatPage from './pages/ChatPage';
import MentorDashboardPage from './pages/MentorDashboardPage';
import MentorProfilePage from './pages/MentorProfilePage';
import WalletPage from './pages/WalletPage';
import AIChatPage from './pages/AIChatPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import MyChatsPage from './pages/MyChatsPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Protected User Routes */}
      <Route element={<AuthGuard allowedRoles={['USER']} />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/mentors" element={<MentorsPage />} />
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/ai-chat" element={<AIChatPage />} />
          <Route path="/chats" element={<MyChatsPage />} />
          <Route path="/subscriptions" element={<SubscriptionsPage />} />
        </Route>
      </Route>

      {/* Chat Page (special route without sidebar) */}
      <Route element={<AuthGuard allowedRoles={['USER', 'MENTOR']} />}>
        <Route path="/chat/:sessionId" element={<ChatPage />} />
      </Route>

      {/* Protected Mentor Routes */}
      <Route element={<AuthGuard allowedRoles={['MENTOR']} />}>
        <Route element={<Layout />}>
          <Route path="/mentor" element={<MentorDashboardPage />} />
          <Route path="/mentor/profile" element={<MentorProfilePage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
