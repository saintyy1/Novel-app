import type React from "react"
import { Link } from "react-router-dom"
import { FaTiktok, FaInstagram, FaXTwitter, FaTelegram, FaDiscord } from "react-icons/fa6"

const Footer: React.FC = () => {

  return (
    <footer className="border-t border-gray-200">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center">
              <div className="h-10 w-10 flex items-center justify-center">
                <img src="../images/logo.png" alt="NovlNest Logo" />
              </div>
              <span className="ml-2 text-xl font-bold text-white">NovlNest</span>
            </Link>
            <p className="mt-4 text-base text-gray-400">
              From new voices to hidden gems, explore novels created and shared by real storytellers.
            </p>
            <div className="mt-4 space-y-2">
              <Link to="/best-wattpad-alternative" className="block text-xs text-gray-500 hover:text-purple-400">Best Wattpad Alternative</Link>
              <Link to="/top-novel-websites" className="block text-xs text-gray-500 hover:text-purple-400">Top Novel Websites</Link>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Explore</h3>
            <ul className="mt-4 space-y-4">
              <li>
                <Link
                  to="/"
                  className="text-base text-gray-400 hover:text-purple-600 dark:hover:text-purple-400"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  to="/novels"
                  className="text-base text-gray-400 hover:text-purple-600 dark:hover:text-purple-400"
                >
                  Browse Novels
                </Link>
              </li>
              <li>
                <Link
                  to="/submit"
                  className="text-base text-gray-400 hover:text-purple-600 dark:hover:text-purple-400"
                >
                  Submit Novel
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Company</h3>
            <ul className="mt-4 space-y-4">
              <li>
                <Link
                  to="/about"
                  className="text-base text-gray-400 hover:text-purple-600 dark:hover:text-purple-400"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="text-base text-gray-400 hover:text-purple-600 dark:hover:text-purple-400"
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy"
                  className="text-base text-gray-400 hover:text-purple-600 dark:hover:text-purple-400"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/terms-of-service"
                  className="text-base text-gray-400 hover:text-purple-600 dark:hover:text-purple-400"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Mobile App</h3>
            <p className="mt-4 text-xs text-gray-400 mb-4">Get the best experience on our mobile app.</p>
            <div className="flex flex-col space-y-4">
              <a 
                href="https://apps.apple.com/us/app/novlnest/id6758026471" 
                target="_blank" 
                rel="noopener noreferrer"
                className="transition-opacity hover:opacity-80 inline-block"
              >
                <img 
                  src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg" 
                  alt="Download on the App Store" 
                  style={{ height: '40px', width: 'auto' }}
                />
              </a>
              <a 
                href="https://play.google.com/store/apps/details?id=com.novlnest" 
                target="_blank" 
                rel="noopener noreferrer"
                className="transition-opacity hover:opacity-80 inline-block"
              >
                <img 
                  src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" 
                  alt="Get it on Google Play" 
                  style={{ height: '40px', width: 'auto' }}
                />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-base text-gray-400">
              &copy; 2025 NovlNest. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link to="https://t.me/novlnest" className="text-gray-500 hover:text-purple-600 dark:hover:text-purple-400">
                <span className="sr-only">Telegram</span>
                <FaTelegram className="h-6 w-6" />
              </Link>
              <Link to="https://www.tiktok.com/@novlnest" className="text-gray-500 hover:text-purple-600 dark:hover:text-purple-400">
                <span className="sr-only">TikTok</span>
                <FaTiktok className="h-6 w-6" />
              </Link>
              <Link to="https://www.instagram.com/novlnest?igsh=MWV2N3A1dHMxeWtsNg%3D%3D&utm_source=qr" className="text-gray-500 hover:text-purple-600 dark:hover:text-purple-400">
                <span className="sr-only">Instagram</span>
                <FaInstagram className="h-6 w-6" />
              </Link>
              <Link to="https://x.com/novlnest" className="text-gray-500 hover:text-purple-600 dark:hover:text-purple-400">
                <span className="sr-only">Twitter</span>
                <FaXTwitter className="h-6 w-6" />
              </Link>
              <Link to="#" className="text-gray-500 hover:text-purple-600 dark:hover:text-purple-400">
                <span className="sr-only">Discord</span>
                <FaDiscord className="h-6 w-6" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
