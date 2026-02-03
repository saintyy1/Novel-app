import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom"
import { useEffect, lazy, Suspense } from "react"
import { useAuth } from "./context/AuthContext"
import { getOrCreateSessionId } from "./utils/sessionUtils"
import ScrollToTop from "./components/ScrollToTop"
import Navbar from "./components/Navbar"
import Footer from "./components/Footer"
import AdminRoute from "./components/AdminRoute"
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"))
const LoginPage = lazy(() => import("./pages/LoginPage"))
const Home = lazy(() => import("./pages/Home"))
const Promote = lazy(() => import("./pages/Promote"))
const PaymentCallback = lazy(() => import("./pages/PaymentCallback"))
const Profile = lazy(() => import("./pages/Profile"))
const NotificationsPage = lazy(() => import("./pages/Notifications"))
const LibraryPage = lazy(() => import("./pages/Library"))
const Novels = lazy(() => import("./pages/Novels"))
const NovelOverview = lazy(() => import("./pages/NovelOverview"))
const NovelRead = lazy(() => import("./pages/NovelRead"))
const Poems = lazy(() => import("./pages/Poems"))
const PoemOverview = lazy(() => import("./pages/PoemOverview"))
const PoemRead = lazy(() => import("./pages/PoemRead"))
const AddChapters = lazy(() => import("./pages/add-chapters"))
const EditChapter = lazy(() => import("./pages/EditChapter"))
const RegisterPage = lazy(() => import("./pages/RegisterPage"))
const SubmitNovel = lazy(() => import("./pages/SubmitNovel"))
const SubmitPoem = lazy(() => import("./pages/SubmitPoem"))
const TermsOfService = lazy(() => import("./pages/TermsOfService"))
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"))
const About = lazy(() => import("./pages/About"))
const Contact = lazy(() => import("./pages/Contact"))
const Support = lazy(() => import("./pages/Support"))
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"))
const Settings = lazy(() => import("./pages/Settings"))
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"))
const AuthAction = lazy(() => import("./pages/AuthAction"))
const Messages = lazy(() => import("./pages/Messages"))
const MyTickets = lazy(() => import("./pages/MyTickets"))
const AdminSupport = lazy(() => import("./pages/AdminSupport"))
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
      // Dynamically import analytics to avoid pulling it into the initial bundle
      ;(async () => {
        try {
          const [{ logEvent }, { analytics }] = await Promise.all([
            import('firebase/analytics'),
            import('./firebase/config')
          ])

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
        } catch (e) {
          // fail silently if analytics can't be loaded
          console.debug('Analytics load failed', e)
        }
      })()
    }
  }, [location, currentUser])
  
  return (
    <div className="min-h-screen bg-[#121212] flex flex-col">
      <NavigationLoader />
      {!isNovelReadPage && !isPoemReadPage && <Navbar />}
      <main className={`flex-grow ${!isNovelReadPage && !isPoemReadPage ? "px-3 py-8" : "px-0 py-0"}`}>
        <Suspense
          fallback={
            <div
              className="w-full animate-pulse bg-[#0b0b0b]"
              style={{ minHeight: '60vh' }}
              aria-hidden
            />
          }
        >
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/promote" element={<Promote />} />
            <Route path="/PaymentCallback" element={<PaymentCallback />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/auth-action" element={<AuthAction />} />
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
            <Route path="/my-tickets" element={<MyTickets />} />
            <Route path="/admin-support" element={<AdminSupport />} />
          </Routes>
        </Suspense>
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
