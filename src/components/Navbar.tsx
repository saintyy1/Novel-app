"use client"
import { useState, useRef, useEffect } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

const Navbar = () => {
  const { currentUser, isAdmin, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false)
  const desktopDropdownRef = useRef<HTMLDivElement>(null)
  const mobileDropdownRef = useRef<HTMLDivElement>(null)

  const handleLogout = async () => {
    try {
      await logout()
      setIsUserDropdownOpen(false)
      navigate("/login")
    } catch (error) {
      console.error("Failed to log out", error)
    }
  }

  const closeDropdown = () => {
    setIsUserDropdownOpen(false)
  }

  const isActive = (path: string) => {
    return location.pathname === path
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        desktopDropdownRef.current &&
        !desktopDropdownRef.current.contains(event.target as Node) &&
        mobileDropdownRef.current &&
        !mobileDropdownRef.current.contains(event.target as Node)
      ) {
        setIsUserDropdownOpen(false)
      }
    }

    if (isUserDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isUserDropdownOpen])

  // Get user initials for avatar fallback
  const getUserInitials = (name: string | null | undefined) => {
    if (!name) return "U"
    return name.charAt(0).toUpperCase()
  }

  // User Avatar Component
  const UserAvatar = ({ size = "h-8 w-8", textSize = "text-xs" }: { size?: string; textSize?: string }) => {
    return (
      <div
        className={`${size} bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center text-white ${textSize} font-bold overflow-hidden`}
      >
        {currentUser?.photoURL ? (
          <img
            src={currentUser.photoURL}
            alt={currentUser.displayName || "User"}
            className="h-full w-full object-cover"
            onError={(e) => {
              // Fallback to initials if image fails to load
              const target = e.target as HTMLImageElement
              target.style.display = "none"
              const fallback = target.nextElementSibling as HTMLElement
              if (fallback) {
                fallback.classList.remove("hidden")
              }
            }}
          />
        ) : null}
        <span className={currentUser?.photoURL ? "hidden" : ""}>
          {getUserInitials(currentUser?.displayName)}
        </span>
      </div>
    )
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 transition-all bg-gray-900/90 backdrop-blur-md shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center">
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
              <span className="ml-2 text-xl font-bold text-white">NovelNest</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            <Link
              to="/"
              className={`px-3 py-2 text-sm text-[#E0E0E0] font-medium relative hover:text-white transition-colors ${
                isActive("/")
                  ? "after:absolute after:content-[''] after:bg-[#E0E0E0] after:h-[2px] after:w-1/2 after:left-3 after:-bottom-0"
                  : "text-[#E0E0E0]"
              }`}
            >
              Home
            </Link>

            <Link
              to="/novels"
              className={`px-3 py-2 text-sm text-[#E0E0E0] font-medium relative hover:text-white transition-colors ${
                isActive("/novels")
                  ? "after:absolute after:content-[''] after:bg-[#E0E0E0] after:h-[2px] after:w-1/2 after:left-3 after:-bottom-0"
                  : "text-[#E0E0E0]"
              }`}
            >
              Browse
            </Link>

            {currentUser ? (
              <>
                <Link
                  to="/submit"
                  className={`px-3 py-2 text-sm text-[#E0E0E0] font-medium relative hover:text-white transition-colors ${
                    isActive("/submit")
                      ? "after:absolute after:content-[''] after:bg-[#E0E0E0] after:h-[2px] after:w-1/2 after:left-3 after:-bottom-0"
                      : "text-[#E0E0E0]"
                  }`}
                >
                  Submit Novel
                </Link>

                {isAdmin && (
                  <>
                    <Link
                      to="/admin"
                      className={`px-3 py-2 text-sm text-[#E0E0E0] font-medium relative hover:text-white transition-colors ${
                        isActive("/admin")
                          ? "after:absolute after:content-[''] after:bg-[#E0E0E0] after:h-[2px] after:w-1/2 after:left-3 after:-bottom-0"
                          : "text-[#E0E0E0]"
                      }`}
                    >
                      Admin
                    </Link>
                    <Link
                      to="/generate"
                      className={`px-3 py-2 text-sm text-[#E0E0E0] font-medium relative hover:text-white transition-colors ${
                        isActive("/generate")
                          ? "after:absolute after:content-[''] after:bg-[#E0E0E0] after:h-[2px] after:w-1/2 after:left-3 after:-bottom-0"
                          : "text-[#E0E0E0]"
                      }`}
                    >
                      Generate Novel
                    </Link>
                  </>
                )}

                {/* Desktop User Dropdown */}
                <div className="relative ml-4" ref={desktopDropdownRef}>
                  <button
                    onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                    className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-[#E0E0E0] hover:text-white hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <UserAvatar />
                    <span className="hidden lg:block">{currentUser.displayName || "User"}</span>
                    <svg
                      className={`h-4 w-4 transition-transform ${isUserDropdownOpen ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Desktop Dropdown Menu */}
                  {isUserDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-60 bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                      <div className="py-1">
                        <div className="px-4 py-2 text-sm text-gray-300 border-b border-gray-700">
                          <div className="flex items-center space-x-2">
                            <UserAvatar size="h-8 w-8" textSize="text-xs" />
                            <div>
                              <p className="font-medium">{currentUser.displayName || "User"}</p>
                              <p className="text-xs text-gray-400">{currentUser.email}</p>
                            </div>
                          </div>
                        </div>
                        <Link
                          to="/profile"
                          onClick={closeDropdown}
                          className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <div className="flex items-center">
                            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                              />
                            </svg>
                            Profile
                          </div>
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-900/30 transition-colors"
                        >
                          <div className="flex items-center">
                            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                              />
                            </svg>
                            Logout
                          </div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-200 hover:text-purple-400 hover:bg-gray-800 transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="ml-2 px-4 py-2 rounded-md text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-sm transform transition duration-200 hover:translate-y-[-1px]"
                >
                  Register
                </Link>
              </>
            )}
          </div>

          {/* Mobile User Avatar/Menu */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
              className="flex items-center justify-center p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {currentUser ? (
                <UserAvatar size="h-10 w-10" textSize="text-sm" />
              ) : (
                <div className="h-10 w-10 bg-gray-600 rounded-full flex items-center justify-center text-white">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
              )}
            </button>

            {/* Mobile Dropdown Menu */}
            {isUserDropdownOpen && (
              <div
                className="absolute right-4 top-16 w-64 bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50"
                ref={mobileDropdownRef}
              >
                <div className="py-1">
                  {currentUser ? (
                    <>
                      {/* User Info Section */}
                      <div className="px-4 py-3 border-b border-gray-700">
                        <div className="flex items-center">
                          <UserAvatar size="h-10 w-10" textSize="text-sm" />
                          <div className="ml-3">
                            <p className="text-sm font-medium text-white">
                              {currentUser.displayName || "User"}
                            </p>
                            <p className="text-xs text-gray-400">{currentUser.email}</p>
                          </div>
                        </div>
                      </div>

                      {/* Navigation Links */}
                      <Link
                        to="/"
                        onClick={closeDropdown}
                        className={`block px-4 py-2 text-sm hover:bg-gray-700 transition-colors ${
                          isActive("/")
                            ? "text-purple-400 bg-purple-900/20"
                            : "text-gray-300"
                        }`}
                      >
                        <div className="flex items-center">
                          <svg className="h-4 w-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                            />
                          </svg>
                          Home
                        </div>
                      </Link>

                      <Link
                        to="/novels"
                        onClick={closeDropdown}
                        className={`block px-4 py-2 text-sm hover:bg-gray-700 transition-colors ${
                          isActive("/novels")
                            ? "text-purple-400 bg-purple-900/20"
                            : "text-gray-300"
                        }`}
                      >
                        <div className="flex items-center">
                          <svg className="h-4 w-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                            />
                          </svg>
                          Browse
                        </div>
                      </Link>

                      <Link
                        to="/submit"
                        onClick={closeDropdown}
                        className={`block px-4 py-2 text-sm hover:bg-gray-700 transition-colors ${
                          isActive("/submit")
                            ? "text-purple-400 bg-purple-900/20"
                            : "text-gray-300"
                        }`}
                      >
                        <div className="flex items-center">
                          <svg className="h-4 w-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                            />
                          </svg>
                          Submit Novel
                        </div>
                      </Link>

                      {isAdmin && (
                        <>
                          <Link
                            to="/admin"
                            onClick={closeDropdown}
                            className={`block px-4 py-2 text-sm hover:bg-gray-700 transition-colors ${
                              isActive("/admin")
                                ? "text-purple-400 bg-purple-900/20"
                                : "text-gray-300"
                            }`}
                          >
                            <div className="flex items-center">
                              <svg className="h-4 w-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                              </svg>
                              Admin
                            </div>
                          </Link>

                          <Link
                            to="/generate"
                            onClick={closeDropdown}
                            className={`block px-4 py-2 text-sm bg-gray-700 transition-colors ${
                              isActive("/generate")
                                ? "text-purple-400 bg-purple-900/20"
                                : "text-gray-300"
                            }`}
                          >
                            <div className="flex items-center">
                              <svg className="h-4 w-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                                />
                              </svg>
                              Generate Novel
                            </div>
                          </Link>
                        </>
                      )}

                      <div className="border-t border-gray-700 mt-1 pt-1">
                        <Link
                          to="/profile"
                          onClick={closeDropdown}
                          className={`block px-4 py-2 text-sm hover:bg-gray-700 transition-colors ${
                            isActive("/profile")
                              ? "text-purple-400 bg-purple-900/20"
                              : "text-gray-300"
                          }`}
                        >
                          <div className="flex items-center">
                            <svg className="h-4 w-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                              />
                            </svg>
                            Profile
                          </div>
                        </Link>

                        <button
                          onClick={handleLogout}
                          className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-900/30 transition-colors"
                        >
                          <div className="flex items-center">
                            <svg className="h-4 w-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                              />
                            </svg>
                            Logout
                          </div>
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Guest Navigation */}
                      <Link
                        to="/"
                        onClick={closeDropdown}
                        className={`block px-4 py-2 text-sm hover:bg-gray-700 transition-colors ${
                          isActive("/")
                            ? "text-purple-400 bg-purple-900/20"
                            : "text-gray-300"
                        }`}
                      >
                        <div className="flex items-center">
                          <svg className="h-4 w-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                            />
                          </svg>
                          Home
                        </div>
                      </Link>

                      <Link
                        to="/novels"
                        onClick={closeDropdown}
                        className={`block px-4 py-2 text-sm hover:bg-gray-700 transition-colors ${
                          isActive("/novels")
                            ? "text-purple-400 bg-purple-900/20"
                            : "text-gray-300"
                        }`}
                      >
                        <div className="flex items-center">
                          <svg className="h-4 w-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                            />
                          </svg>
                          Browse
                        </div>
                      </Link>

                      <div className="border-t border-gray-700 mt-1 pt-1">
                        <Link
                          to="/login"
                          onClick={closeDropdown}
                          className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                        >
                          <div className="flex items-center">
                            <svg className="h-4 w-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                              />
                            </svg>
                            Login
                          </div>
                        </Link>

                        <Link
                          to="/register"
                          onClick={closeDropdown}
                          className="block px-4 py-2 text-sm text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 transition-colors mx-2 my-1 rounded-md"
                        >
                          <div className="flex items-center justify-center">
                            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                              />
                            </svg>
                            Register
                          </div>
                        </Link>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
