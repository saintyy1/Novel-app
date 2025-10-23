import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom"
import { useEffect } from "react"
import { logEvent } from "firebase/analytics"
import { useAuth } from "./context/AuthContext"
import { getOrCreateSessionId } from "./utils/sessionUtils"
import { analytics } from "./firebase/config"
import ScrollToTop from "./components/ScrollToTop"
import Navbar from "./components/Navbar"
import Footer from "./components/Footer"
import AdminRoute from "./components/AdminRoute"
import AdminDashboard from "./pages/AdminDashboard"
import LoginPage from "./pages/LoginPage"
import Home from "./pages/Home"
import Promote from "./pages/Promote"
import PaymentCallback from "./pages/PaymentCallback"
import Profile from "./pages/Profile"
import NotificationsPage from "./pages/Notifications"
import LibraryPage from "./pages/Library"
import Novels from "./pages/Novels"
import NovelOverview from "./pages/NovelOverview"
import NovelRead from "./pages/NovelRead"
import Poems from "./pages/Poems"
import PoemOverview from "./pages/PoemOverview"
import PoemRead from "./pages/PoemRead"
import AddChapters from "./pages/add-chapters"
import EditChapter from "./pages/EditChapter"
import RegisterPage from "./pages/RegisterPage"
import SubmitNovel from "./pages/SubmitNovel"
import SubmitPoem from "./pages/SubmitPoem"
import TermsOfService from "./pages/TermsOfService"
import PrivacyPolicy from "./pages/PrivacyPolicy"
import About from "./pages/About"
import Contact from "./pages/Contact"
import Support from "./pages/Support"
import ForgotPassword from "./pages/ForgotPassword"
import Settings from "./pages/Settings"
import VerifyEmail from "./pages/VerifyEmail"
import Messages from "./pages/Messages"
import { AuthProvider } from "./context/AuthContext"
import { NotificationProvider } from "./context/NotificationContext"
import { TranslationProvider } from "./context/TranslationContext"
import { ChatProvider, useChat } from "./context/ChatContext"
import ToastContainer from "./components/ToastContainer"
import MobileChatButton from "./components/MobileChatButton"
import NavigationLoader from "./components/NavigationLoader"

function AppContent() {
  const location = useLocation()
  const { currentUser } = useAuth()
  const isNovelReadPage = /^\/novel\/[^/]+\/read$/.test(location.pathname)
  const isPoemReadPage = /^\/poem\/[^/]+\/read$/.test(location.pathname)
  
  // Wrapper component to access chat context
  function MobileChatButtonWrapper() {
    const { state: chatState } = useChat()
    const totalUnreadCount = Array.isArray(chatState?.conversations) 
      ? chatState.conversations.reduce((total, conv) => total + (conv.unreadCount || 0), 0)
      : 0
    
    // Hide mobile chat button on NovelRead page to prevent interference with page navigation
    if (isNovelReadPage || isPoemReadPage) {
      return null
    }
  
    return <MobileChatButton unreadCount={totalUnreadCount} />
  }

  useEffect(() => {
    // Get session ID for anonymous users
    const sessionId = !currentUser ? getOrCreateSessionId() : null

    // Only track basic page views for pages that don't have their own detailed tracking
    // Skip novel and poem pages as they have their own detailed tracking
    const isNovelPage = /^\/novel\/[^/]+(\/read)?$/.test(location.pathname)
    const isPoemPage = /^\/poem\/[^/]+(\/read)?$/.test(location.pathname)
    
    if (!isNovelPage && !isPoemPage) {
      logEvent(analytics, 'page_view', {
        page_path: location.pathname,
        page_location: window.location.href,
        page_title: document.title,
        user_type: currentUser ? 'registered' : 'anonymous',
        user_id: currentUser?.uid || sessionId,
        timestamp: new Date().toISOString(),
        referrer: document.referrer,
        screen_resolution: `${window.screen.width}x${window.screen.height}`,
        viewport_size: `${window.innerWidth}x${window.innerHeight}`,
        device_type: /Mobi|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
      })
    }
  }, [location, currentUser])
  
  return (
    <div className="min-h-screen bg-[#121212] flex flex-col">
      <NavigationLoader />
      {!isNovelReadPage && !isPoemReadPage && <Navbar />}
      <main className={`flex-grow ${!isNovelReadPage && !isPoemReadPage ? "px-3 py-8" : "px-0 py-0"}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/promote" element={<Promote />} />
          <Route path="/PaymentCallback" element={<PaymentCallback />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/profile/:userId" element={<Profile />} />
          <Route path="/novels" element={<Novels />} />
          <Route path="/novels/:type" element={<Novels />} />
          <Route path="/novel/:id" element={<NovelOverview />} />
          <Route path="/novel/:id/read" element={<NovelRead />} />
          <Route path="/poems" element={<Poems />} />
          <Route path="/poem/:id" element={<PoemOverview />} />
          <Route path="/poem/:id/read" element={<PoemRead />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/support" element={<Support />} />
          <Route path="/messages" element={<Messages />} />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />
          <Route path="/novel/:id/add-chapters" element={<AddChapters />} />
          <Route path="/submit" element={<SubmitNovel />} />
          <Route path="/submit-poem" element={<SubmitPoem />} />
          <Route path="/novel/:id/edit-chapter/:chapterIndex" element={<EditChapter />} />
        </Routes>
      </main>
      {!isNovelReadPage && !isPoemReadPage && <Footer />}
      {/* Mobile Chat Button - Always visible on mobile */}
      <MobileChatButtonWrapper />
    </div>
  )
}

function App() {
  return (
    <Router>
      <ScrollToTop />
      <AuthProvider>
        <NotificationProvider>
          <TranslationProvider>
            <ChatProvider>
              <AppContent />
            </ChatProvider>
          </TranslationProvider>
        </NotificationProvider>
      </AuthProvider>
      <ToastContainer />
    </Router>
  )
}

export default App
