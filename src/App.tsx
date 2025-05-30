import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import GenerateNovel from "./pages/GenerateNovel";
import LoginPage from "./pages/LoginPage";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import Novels from "./pages/Novels";
import NovelOverview from "./pages/NovelOverview";
import NovelRead from "./pages/NovelRead";
import AddChapters from "./pages/add-chapters";
import RegisterPage from "./pages/RegisterPage";
import SubmitNovel from "./pages/SubmitNovel";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import About from "./pages/About";
import Contact from "./pages/Contact";
import ForgotPassword from "./pages/ForgotPassword";
import { AuthProvider } from "./context/AuthContext";

function AppContent() {
  const location = useLocation();
   const isNovelReadPage = /^\/novel\/[^/]+\/read$/.test(location.pathname);
  
  return (
    <AuthProvider>
      <div className="min-h-screen bg-[#121212] flex flex-col">
        {!isNovelReadPage && <Navbar />}
        <main className={`flex-grow px-3 py-6 ${!isNovelReadPage ? "py-8" : "py-0"}`}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/novels" element={<Novels />} />
            <Route path="/novel/:id" element={<NovelOverview />} />
            <Route path="/novel/:id/read" element={<NovelRead />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route
              path="/novel/:id/add-chapters"
              element={
                <AddChapters />
              } />
            <Route
              path="/submit"
              element={
                <SubmitNovel />
              } />
            <Route
              path="/generate"
              element={
                <GenerateNovel />
              }
            /> 
          </Routes>
        </main>
        {!isNovelReadPage && <Footer />}
      </div>
    </AuthProvider>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;