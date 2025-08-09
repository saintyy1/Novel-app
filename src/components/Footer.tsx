import type React from "react"
import { Link } from "react-router-dom"
import { FaFacebook, FaTiktok, FaInstagram, FaXTwitter } from "react-icons/fa6"

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-gray-200">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center">
              <div className="h-10 w-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-md">
                <svg
                  className="h-6 w-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <span className="ml-2 text-xl font-bold text-white">NovlNest</span>
            </Link>
            <p className="mt-4 text-base text-gray-400">
              Discover and create amazing stories with our community of writers and AI-generated content.
            </p>
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
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-base text-gray-400">
              &copy; {currentYear} NovlNest. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link to="#" className="text-gray-500 hover:text-purple-600 dark:hover:text-purple-400">
                <span className="sr-only">Facebook</span>
                <FaFacebook className="h-6 w-6" />
              </Link>
              <Link to="https://www.tiktok.com/@novlnest" className="text-gray-500 hover:text-purple-600 dark:hover:text-purple-400">
                <span className="sr-only">TikTok</span>
                <FaTiktok className="h-6 w-6" />
              </Link>
              <Link to="https://www.instagram.com/novlnest?igsh=MWV2N3A1dHMxeWtsNg%3D%3D&utm_source=qr" className="text-gray-500 hover:text-purple-600 dark:hover:text-purple-400">
                <span className="sr-only">Instagram</span>
                <FaInstagram className="h-6 w-6" />
              </Link>
              <Link to="#" className="text-gray-500 hover:text-purple-600 dark:hover:text-purple-400">
                <span className="sr-only">Twitter</span>
                <FaXTwitter className="h-6 w-6" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
