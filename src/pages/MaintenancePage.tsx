import React from 'react'
import { Smartphone, HardDrive, ShieldAlert } from 'lucide-react'

const MaintenancePage: React.FC = () => {
  // Official "Download on the App Store" Badge
  const AppStoreBadge = () => (
    <a
      href="https://apps.apple.com/us/app/novlnest/id6758026471"
      target="_blank"
      rel="noopener noreferrer"
      className="transition-all hover:scale-105 active:scale-95 inline-block"
    >
      <img
        src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg"
        alt="Download on the App Store"
        className="h-12 md:h-14 w-auto"
      />
    </a>
  )

  // Official "Get it on Google Play" Badge
  const GooglePlayBadge = () => (
    <a
      href="https://play.google.com/store/apps/details?id=com.novlnest"
      target="_blank"
      rel="noopener noreferrer"
      className="transition-all hover:scale-105 active:scale-95 inline-block"
    >
      <img
        src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg"
        alt="Get it on Google Play"
        className="h-12 md:h-14 w-auto"
      />
    </a>
  )

  return (
    <div className="fixed inset-0 z-[1000] bg-[#0A0A0B] text-white flex flex-col items-center overflow-y-auto font-sans selection:bg-purple-500/30">
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_rgba(99,102,241,0.03)_0%,_transparent_70%)]" />
      </div>

      <div className="relative z-10 w-full max-w-4xl px-6 py-20 flex flex-col items-center text-center">
        {/* Logo/Icon */}
        <div className="mb-8 relative">
          <div
            onClick={() => {
              const clicks = (parseInt(sessionStorage.getItem('m_clicks') || '0') + 1);
              if (clicks >= 5) {
                sessionStorage.setItem('maintenance_bypass', 'true');
                sessionStorage.removeItem('m_clicks');
                window.location.reload();
              } else {
                sessionStorage.setItem('m_clicks', clicks.toString());
              }
            }}
            className="w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-3xl p-5 shadow-[0_0_50px_rgba(147,51,234,0.3)] animate-bounce-slow cursor-default active:scale-95 transition-transform"
          >
            <HardDrive className="w-full h-full text-white" />
          </div>
          <div className="absolute -top-2 -right-2 bg-amber-500 text-black p-2 rounded-full border-4 border-[#0A0A0B]">
            <ShieldAlert className="w-5 h-5 md:w-6 md:h-6" />
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-4 bg-gradient-to-r from-white via-gray-200 to-gray-500 bg-clip-text text-transparent">
          Website Migration in Progress
        </h1>

        <p className="text-lg md:text-xl text-gray-400 max-w-2xl mb-12 leading-relaxed">
          We're currently performing a massive upgrade to our systems, including chapter subcollections and improved commenting.
          <span className="block mt-4 text-purple-400 font-semibold">
            The website will be back shortly with a much better experience!
          </span>
        </p>

        {/* Mobile App Section */}
        <div className="w-full max-w-2xl bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 md:p-12 mb-8 shadow-2xl">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-3 mb-6 px-4 py-2 bg-purple-500/10 rounded-full border border-purple-500/20">
              <Smartphone className="w-5 h-5 text-purple-400" />
              <span className="text-sm font-bold uppercase tracking-widest text-purple-200">Continue Reading & Writing</span>
            </div>

            <h2 className="text-2xl md:text-3xl font-bold mb-8">
              Download the NovlNest App
            </h2>

            <p className="text-gray-400 mb-10 text-center text-base md:text-lg">
              Don't stop your journey. Our mobile app is fully functional and ready for you to continue reading and sharing your stories.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-6">
              <AppStoreBadge />
              <GooglePlayBadge />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-8 left-0 w-full text-center">
        <p className="text-gray-600 text-xs font-bold uppercase tracking-[0.3em]">
          NovlNest Migration &middot; 2026
        </p>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(-5%); }
          50% { transform: translateY(5%); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 4s ease-in-out infinite;
        }
      `}} />
    </div>
  )
}

export default MaintenancePage
