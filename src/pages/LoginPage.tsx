import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { auth } from "../firebase/config"
import { useAuth } from "../context/AuthContext"
import GoogleDisplayNameModal from "../components/GoogleDisplayNameModal"
import SEOHead from "../components/SEOHead"

const LoginPage = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [showDisplayNameModal, setShowDisplayNameModal] = useState(false)
  const [googleUserId, setGoogleUserId] = useState("")
  const [googleUserEmail, setGoogleUserEmail] = useState("")
  const { login, signInWithGoogle, sendEmailVerificationLink } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setError("")
      setLoading(true)
      await login(email, password)
      navigate("/")
    } catch (err: any) {
      if (err.message === "ACCOUNT_DISABLED") {
        setError("Your account has been disabled by an administrator. Please contact info@novlnest.com if you believe this is an error.")
      } else if (err.message === "ACCOUNT_UNVERIFIED") {
        setError("ACCOUNT_UNVERIFIED")
      } else {
        setError("Failed to log in. Please check your credentials.")
      }
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      setError("")
      setLoading(true)
      await signInWithGoogle()
      navigate("/novels")
    } catch (err: any) {
      if (err.message === "DISPLAY_NAME_TAKEN") {
        const firebaseUser = auth.currentUser
        if (firebaseUser) {
          setGoogleUserId(firebaseUser.uid)
          setGoogleUserEmail(firebaseUser.email || "")
          setShowDisplayNameModal(true)
          setError("")
          setLoading(false)
          return
        }
      } else if (err.message === "ACCOUNT_DISABLED") {
        setError("Your account has been disabled by an administrator. Please contact info@novlnest.com if you believe this is an error.")
      } else if (err.message === "ACCOUNT_UNVERIFIED") {
        setError("ACCOUNT_UNVERIFIED")
      } else {
        setError(err.message || "Failed to sign in with Google")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResendVerification = async () => {
    try {
      setResendLoading(true)
      setResendSuccess(false)
      await sendEmailVerificationLink(email, password)
      setResendSuccess(true)
    } catch (err: any) {
      console.error("Error resending verification:", err)
      alert("Failed to resend verification email. Please try again later.")
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-purple-950 py-12 px-2 sm:px-6 lg:px-8">
        <SEOHead
          title="Login - NovlNest"
          description="Sign in to your NovlNest account to access your library, write novels, and connect with the community of readers and writers."
          keywords="login, sign in, account, NovlNest, novel platform, reading community"
          url="https://novlnest.com/login"
          canonicalUrl="https://novlnest.com/login"
        />

        <div className="max-w-md w-full space-y-8">
          <div>
            <div className="w-20 h-20 mx-auto flex items-center justify-center">
              <img src="../images/logo.png" alt="NovlNest Logo" />
            </div>
            <h2 className="text-center text-3xl font-extrabold text-white">
              Welcome back to NovlNest
            </h2>
            <p className="mt-2 text-center text-sm text-gray-400">
              Sign in to continue your literary journey
            </p>
          </div>

          {error && (
            <div className={`rounded-md p-4 border ${error === "ACCOUNT_UNVERIFIED" ? "bg-amber-900/30 border-amber-800" : "bg-red-900/30 border-red-800"}`}>
              <div className="flex">
                <div className="flex-shrink-0">
                  {error === "ACCOUNT_UNVERIFIED" ? (
                    <svg className="h-5 w-5 text-amber-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg
                      className="h-5 w-5 text-red-500"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
                <div className="ml-3 flex-1">
                  <h3 className={`text-sm font-medium ${error === "ACCOUNT_UNVERIFIED" ? "text-amber-200" : "text-red-200"}`}>
                    {error === "ACCOUNT_UNVERIFIED" ? "Email Not Verified" : "Authentication Error"}
                  </h3>
                  <div className={`mt-2 text-sm ${error === "ACCOUNT_UNVERIFIED" ? "text-amber-300" : "text-red-300"}`}>
                    {error === "ACCOUNT_UNVERIFIED" ? (
                      <div className="space-y-4">
                        <p>You need to verify your email address before you can log in. Please check your inbox for the verification link.</p>
                        {resendSuccess ? (
                          <p className="text-green-400 font-medium">Verification email resent successfully! Check your inbox.</p>
                        ) : (
                          <button
                            type="button"
                            onClick={handleResendVerification}
                            disabled={resendLoading}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-amber-900 bg-amber-100 hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors"
                          >
                            {resendLoading ? (
                              <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-amber-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Resending...
                              </>
                            ) : "Resend Verification Email"}
                          </button>
                        )}
                      </div>
                    ) : error}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 bg-gray-800 py-8 px-2 shadow-xl sm:rounded-xl sm:px-10 border border-gray-700">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                  Email address
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg
                      className="h-5 w-5 text-gray-400"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 text-sm bg-gray-700 text-gray-100"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                  Password
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg
                      className="h-5 w-5 text-gray-400"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 text-sm bg-gray-700 text-gray-100"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-300">
                    Remember me
                  </label>
                </div>

                <div className="text-sm">
                  <Link to="/forgot-password" className="font-medium text-purple-600 hover:text-purple-500">
                    Forgot your password?
                  </Link>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 shadow-md transform transition duration-200 hover:translate-y-[-2px]"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Signing in...
                    </div>
                  ) : (
                    <span>Sign in</span>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-gray-800 text-gray-400">
                    Or continue with
                  </span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1">
                <div>
                  <button
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="w-full inline-flex justify-center py-2 px-4 border border-gray-600 rounded-md shadow-sm bg-gray-700 text-sm font-medium text-gray-200 hover:bg-gray-600 transition-colors duration-200"
                  >
                    <svg className="h-5 w-5 text-[#4285F4]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-400">
                Don't have an account?{" "}
                <Link to="/register" className="font-medium text-purple-600 hover:text-purple-500">
                  Sign up for free
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
      <GoogleDisplayNameModal
        isOpen={showDisplayNameModal}
        userId={googleUserId}
        userEmail={googleUserEmail}
      />
    </>
  )
}

export default LoginPage
