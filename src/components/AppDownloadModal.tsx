import React, { useState, useEffect } from 'react'
import { X, Smartphone, CheckCircle2 } from 'lucide-react'

interface AppDownloadModalProps {
  onClose?: () => void
}

const AppDownloadModal: React.FC<AppDownloadModalProps> = ({ onClose }) => {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    // Check if the user has already downloaded the app
    const hasDownloaded = localStorage.getItem('app_downloaded')

    if (hasDownloaded !== 'true') {
      // Show immediately
      setIsOpen(true)
    }

    // Add event listener for manual trigger
    const handleOpenModal = () => setIsOpen(true)
    window.addEventListener('open-app-download-modal', handleOpenModal)

    return () => {
      window.removeEventListener('open-app-download-modal', handleOpenModal)
    }
  }, [])

  // Lock background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const handleClose = () => {
    setIsOpen(false)
    if (onClose) onClose()
  }

  const handleAlreadyDownloaded = () => {
    setIsOpen(false)
    localStorage.setItem('app_downloaded', 'true')
    if (onClose) onClose()
  }

  if (!isOpen) return null

  // Official "Download on the App Store" Badge
  const AppStoreBadge = () => (
    <a
      href="https://apps.apple.com/us/app/novlnest/id6758026471"
      target="_blank"
      rel="noopener noreferrer"
      className="transition-opacity hover:opacity-80 inline-block"
    >
      <img
        src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg"
        alt="Download on the App Store"
        style={{ height: '44px', width: 'auto' }}
      />
    </a>
  )

  // Official "Get it on Google Play" Badge
  const GooglePlayBadge = () => (
    <a
      href="https://play.google.com/store/apps/details?id=com.novlnest"
      target="_blank"
      rel="noopener noreferrer"
      className="transition-opacity hover:opacity-80 inline-block"
    >
      <img
        src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg"
        alt="Get it on Google Play"
        style={{ height: '44px', width: 'auto' }}
      />
    </a>
  )

  return (
    <div className="fixed inset-0 z-[101] flex flex-col items-center bg-[#0f0f10] animate-in fade-in duration-500 overflow-y-auto overflow-x-hidden">
      {/* Immersive Header Overlay */}
      <div className="w-full min-h-[60vh] bg-gradient-to-br from-purple-600 via-indigo-800 to-black relative flex items-center justify-center px-6 py-12">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[120px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_70%)] from-indigo-500/5" />
          <Smartphone className="absolute bottom-[-5%] right-[-5%] h-96 w-96 text-white/5 -rotate-12" />
        </div>

        <div className="relative text-center max-w-3xl z-10">
          <div className="mx-auto w-28 h-28 p-6 bg-white/10 backdrop-blur-2xl rounded-[2.5rem] border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] mb-5 flex items-center justify-center transform hover:scale-105 transition-transform duration-500">
            <img src="/images/logo.png" alt="NovlNest" className="h-full w-full object-contain" />
          </div>
          <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-6 drop-shadow-2xl">
            NovlNest
          </h2>
          <div className="inline-flex items-center px-6 py-2 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 backdrop-blur-xl rounded-full border border-white/10 text-white/90 text-sm font-semibold tracking-widest uppercase">
            Designed for the ultimate reader
          </div>
        </div>

        <button
          onClick={handleClose}
          className="absolute top-8 right-8 p-3 bg-white/5 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-all transform hover:rotate-90 z-50 border border-white/10"
        >
          <X className="h-7 w-7" />
        </button>
      </div>

      {/* Content Section */}
      <div className="flex-1 w-full max-w-4xl px-8 py-10 flex flex-col items-center text-center justify-center">
        <div className="max-w-2xl">
          <h3 className="text-3xl md:text-5xl font-bold text-white mb-8 leading-tight">
            Download the NovlNest App
          </h3>
          <p className="text-gray-400 text-xl leading-relaxed mb-12">
            Experience a smoother interface, instant push notifications, and exclusive features. It's time to trade the browser for the true NovlNest experience.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 mb-16">
            <AppStoreBadge />
            <GooglePlayBadge />
          </div>

          <div className="flex flex-col items-center justify-center w-full">
            <button
              onClick={handleAlreadyDownloaded}
              className="group relative flex items-center space-x-6 px-10 py-6 rounded-3xl border-2 border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/20 hover:border-purple-500/60 transition-all duration-300 shadow-[0_0_30px_rgba(168,85,247,0.15)] hover:shadow-[0_0_40px_rgba(168,85,247,0.25)] cursor-pointer"
            >
              <div className="flex-shrink-0 w-12 h-12 bg-purple-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:bg-purple-400 transition-all duration-300">
                <CheckCircle2 className="h-7 w-7 text-white" />
              </div>
              <div className="text-left">
                <p className="text-xl font-black text-white tracking-wide">
                  I've already downloaded it
                </p>
                {/* <p className="text-sm text-purple-200/60 font-medium tracking-tight">
                  Hide this screen and return to the website
                </p> */}
              </div>
            </button>
            <div className="mt-10 flex items-center space-x-3 px-6 py-2 bg-white/5 rounded-full border border-white/5">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
              <p className="text-[12px] font-black text-gray-200 uppercase tracking-[0.2em]">Recommended for the best experience</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="w-full py-12 text-center border-t border-white/5">
        <p className="text-gray-200 text-[11px] font-bold uppercase tracking-[0.4em]">
          Empowering Creators · Inspiring Readers · NovlNest &copy; 2025
        </p>
      </div>
    </div>
  )
}

export default AppDownloadModal
