import { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

const VerifyEmail = () => {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [error, setError] = useState("")
  const { verifyEmail } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const verifyEmailFromLink = async () => {
      const actionCode = searchParams.get('oobCode')
      
      if (!actionCode) {
        setStatus('error')
        setError('Invalid verification link. Please try again.')
        return
      }

      try {
        await verifyEmail(actionCode)
        setStatus('success')
        
        // Redirect to novels page after 3 seconds
        setTimeout(() => {
          navigate('/novels')
        }, 3000)
      } catch (error: any) {
        console.error('Email verification error:', error)
        setStatus('error')
        
        // Handle specific error cases
        if (error.code === 'auth/invalid-action-code') {
          setError('This verification link is invalid or has expired. Please request a new one.')
        } else if (error.code === 'auth/user-disabled') {
          setError('This account has been disabled. Please contact support.')
        } else if (error.code === 'auth/expired-action-code') {
          setError('This verification link has expired. Please request a new one.')
        } else {
          setError('Failed to verify email. Please try again or contact support.')
        }
      }
    }

    verifyEmailFromLink()
  }, [searchParams, verifyEmail, navigate])

  const handleRetry = () => {
    setStatus('verifying')
    setError('')
    // Retry verification
    const actionCode = searchParams.get('oobCode')
    if (actionCode) {
      verifyEmail(actionCode)
        .then(() => {
          setStatus('success')
          setTimeout(() => navigate('/novels'), 3000)
        })
        .catch(() => {
          setStatus('error')
          setError('Failed to verify email. Please try again or contact support.')
        })
    }
  }

  const handleGoToLogin = () => {
    navigate('/login')
  }

  const handleGoToHome = () => {
    navigate('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-purple-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl shadow-lg flex items-center justify-center">
            <svg
              className="w-12 h-12 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            Email Verification
          </h2>
        </div>

        <div className="mt-8 bg-gray-800 py-8 px-4 shadow-xl sm:rounded-xl sm:px-10 border border-gray-700">
          {status === 'verifying' && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-white animate-spin"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Verifying Your Email</h3>
              <p className="text-gray-300">
                Please wait while we verify your email address...
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-green-600 to-emerald-600 rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Email Verified Successfully!</h3>
              <p className="text-gray-300 mb-6">
                Your email has been verified. You can now access all features of NovlNest.
              </p>
              <div className="space-y-3">
                <p className="text-sm text-gray-400">
                  Redirecting you to the novels page in a few seconds...
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={handleGoToHome}
                    className="flex-1 py-2 px-4 border border-gray-600 rounded-md shadow-sm bg-gray-700 text-sm font-medium text-gray-200 hover:bg-gray-600 transition-colors duration-200"
                  >
                    Go to Home
                  </button>
                  <button
                    onClick={() => navigate('/novels')}
                    className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                  >
                    Browse Novels
                  </button>
                </div>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-red-600 to-pink-600 rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Verification Failed</h3>
              <p className="text-gray-300 mb-6">
                {error}
              </p>
              <div className="space-y-3">
                <button
                  onClick={handleRetry}
                  className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  Try Again
                </button>
                <div className="flex space-x-3">
                  <button
                    onClick={handleGoToLogin}
                    className="flex-1 py-2 px-4 border border-gray-600 rounded-md shadow-sm bg-gray-700 text-sm font-medium text-gray-200 hover:bg-gray-600 transition-colors duration-200"
                  >
                    Go to Login
                  </button>
                  <button
                    onClick={handleGoToHome}
                    className="flex-1 py-2 px-4 border border-gray-600 rounded-md shadow-sm bg-gray-700 text-sm font-medium text-gray-200 hover:bg-gray-600 transition-colors duration-200"
                  >
                    Go to Home
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default VerifyEmail
