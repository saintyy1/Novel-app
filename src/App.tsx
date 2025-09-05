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
import AddChapters from "./pages/add-chapters"
import EditChapter from "./pages/EditChapter"
import RegisterPage from "./pages/RegisterPage"
import SubmitNovel from "./pages/SubmitNovel"
import TermsOfService from "./pages/TermsOfService"
import PrivacyPolicy from "./pages/PrivacyPolicy"
import About from "./pages/About"
import Contact from "./pages/Contact"
import ForgotPassword from "./pages/ForgotPassword"
import { AuthProvider } from "./context/AuthContext"
import { NotificationProvider } from "./context/NotificationContext"
import ToastContainer from "./components/ToastContainer"

function AppContent() {
  const location = useLocation()
  const { currentUser } = useAuth()
  const isNovelReadPage = /^\/novel\/[^/]+\/read$/.test(location.pathname)

    useEffect(() => {
    // Get session ID for anonymous users
    const sessionId = !currentUser ? getOrCreateSessionId() : null

    // Track page view on route change with enhanced data
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
  }, [location, currentUser])
  
  return (
    <AuthProvider>
      <NotificationProvider>
        <div className="min-h-screen bg-[#121212] flex flex-col">
          {!isNovelReadPage && <Navbar />}
          <main className={`flex-grow ${!isNovelReadPage ? "px-3 py-8" : "px-0 py-0"}`}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/promote" element={<Promote />} />
              <Route path="/PaymentCallback" element={<PaymentCallback />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/library" element={<LibraryPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/profile/:userId" element={<Profile />} />
              <Route path="/novels" element={<Novels />} />
              <Route path="/novels/:type" element={<Novels />} />
              <Route path="/novel/:id" element={<NovelOverview />} />
              <Route path="/novel/:id/read" element={<NovelRead />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
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
              <Route path="/novel/:id/edit-chapter/:chapterIndex" element={<EditChapter />} />
            </Routes>
          </main>
          {!isNovelReadPage && <Footer />}
        </div>
      </NotificationProvider>
    </AuthProvider>
  )
}

function App() {
  return (
    <Router>
      <ScrollToTop />
      <AppContent />
      <ToastContainer />
    </Router>
  )
}

export default App
