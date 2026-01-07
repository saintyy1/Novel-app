import { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { auth } from "../firebase/config"
import { 
  verifyPasswordResetCode, 
  confirmPasswordReset, 
  applyActionCode,
  checkActionCode
} from "firebase/auth"
import SEOHead from "../components/SEOHead"

const AuthAction = () => {
  const [searchParams] = useSearchParams()
  const [mode, setMode] = useState<string>("")
  const [status, setStatus] = useState<'processing' | 'success' | 'error' | 'reset-password'>('processing')
  const [error, setError] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const navigate = useNavigate()
  const actionCode = searchParams.get('oobCode')
  const actionMode = searchParams.get('mode')

  useEffect(() => {
    if (!actionCode || !actionMode) {
      setStatus('error')
      setError('Invalid action link. Please try again.')
      return
    }

    setMode(actionMode)
    handleAction(actionMode, actionCode)
  }, [actionCode, actionMode])

  const handleAction = async (mode: string, code: string) => {
    try {
      switch (mode) {
        case 'resetPassword':
          // Verify the password reset code is valid
          await verifyPasswordResetCode(auth, code)
          setStatus('reset-password')
          break

        case 'verifyEmail':
          await handleEmailVerification(code)
          break

        case 'verifyAndChangeEmail':
          await handleEmailChange(code)
          break

        case 'recoverEmail':
          await handleEmailRecovery(code)
          break

        default:
          setStatus('error')
          setError('Invalid action. Please try again.')
      }
    } catch (error: any) {
      console.error('Auth action error:', error)
      handleAuthError(error, mode)
    }
  }

  const handleEmailVerification = async (code: string) => {
    try {
      await checkActionCode(auth, code)
      await applyActionCode(auth, code)
      
      // Reload user to get updated email verification status
      const currentUser = auth.currentUser
      if (currentUser) {
        await currentUser.reload()
      }
      
      setStatus('success')
      setTimeout(() => {
        navigate('/novels')
      }, 3000)
    } catch (error: any) {
      if (error.code === 'auth/invalid-action-code') {
        const currentUser = auth.currentUser
        if (currentUser && currentUser.emailVerified) {
          setStatus('success')
          setTimeout(() => {
            navigate('/novels')
          }, 3000)
        } else {
          throw error
        }
      } else {
        throw error
      }
    }
  }

  const handleEmailChange = async (code: string) => {
    await checkActionCode(auth, code)
    await applyActionCode(auth, code)
    
    // Reload user to get updated email
    const currentUser = auth.currentUser
    if (currentUser) {
      await currentUser.reload()
    }
    
    setStatus('success')
    setTimeout(() => {
      navigate('/settings')
    }, 3000)
  }

  const handleEmailRecovery = async (code: string) => {
    await applyActionCode(auth, code)
    setStatus('success')
    setTimeout(() => {
      navigate('/login')
    }, 3000)
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError("")

    if (newPassword !== confirmNewPassword) {
      setPasswordError("Passwords don't match")
      return
    }

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters")
      return
    }

    if (!actionCode) {
      setPasswordError("Invalid reset code")
      return
    }

    try {
      await confirmPasswordReset(auth, actionCode, newPassword)
      setStatus('success')
      setTimeout(() => {
        navigate('/login')
      }, 3000)
    } catch (error: any) {
      console.error('Password reset error:', error)
      setPasswordError(error.message || 'Failed to reset password. Please try again.')
    }
  }

  const handleAuthError = (error: any, mode: string) => {
    if (error.code === 'auth/invalid-action-code') {
      if (mode === 'resetPassword') {
        setError('This password reset link has already been used or is invalid. Please request a new one.')
      } else if (mode === 'verifyEmail' || mode === 'verifyAndChangeEmail') {
        setError('This verification link has already been used or is invalid. Please request a new one.')
      } else {
        setError('This link has already been used or is invalid.')
      }
    } else if (error.code === 'auth/expired-action-code') {
      setError('This link has expired. Please request a new one.')
    } else if (error.code === 'auth/user-disabled') {
      setError('This account has been disabled. Please contact support.')
    } else {
      setError('An error occurred. Please try again or contact support.')
    }
    setStatus('error')
  }

  const getTitle = () => {
    switch (mode) {
      case 'resetPassword':
        return status === 'reset-password' ? 'Reset Your Password' : 'Password Reset'
      case 'verifyEmail':
        return 'Email Verification'
      case 'recoverEmail':
        return 'Email Recovery'
      default:
        return 'Authentication Action'
    }
  }

  const getSuccessMessage = () => {
    switch (mode) {
      case 'resetPassword':
        return 'Your password has been successfully reset. Redirecting to login...'
      case 'verifyAndChangeEmail':
        return 'Your new email has been successfully verified. Redirecting to settings...'
      case 'verifyEmail':
        return 'Your email has been successfully verified. Redirecting...'
      case 'recoverEmail':
        return 'Your email has been successfully recovered. Redirecting to login...'
      default:
        return 'Action completed successfully.'
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <SEOHead
        title={`${getTitle()} - NovlNest`}
        description="Complete your authentication action on NovlNest."
        keywords="authentication, verification, password reset, NovlNest"
        url="https://novlnest.com/auth-action"
        canonicalUrl="https://novlnest.com/auth-action"
      />
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="h-12 w-12 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-md">
            <svg
              className="h-8 w-8 text-white"
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
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white">{getTitle()}</h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {status === 'processing' && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
              <p className="mt-4 text-gray-700 dark:text-gray-300">Processing your request...</p>
            </div>
          )}

          {status === 'reset-password' && (
            <form onSubmit={handlePasswordReset} className="space-y-6">
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  New Password
                </label>
                <div className="mt-1">
                  <input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    required
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Confirm New Password
                </label>
                <div className="mt-1">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                    placeholder="Confirm new password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                  />
                </div>
              </div>

              {passwordError && (
                <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
                  {passwordError}
                </div>
              )}

              <div>
                <button
                  type="submit"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  Reset Password
                </button>
              </div>
            </form>
          )}

          {status === 'success' && (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30">
                <svg
                  className="h-6 w-6 text-green-600 dark:text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="mt-4 text-gray-700 dark:text-gray-300">{getSuccessMessage()}</p>
            </div>
          )}

          {status === 'error' && (
            <div>
              <div className="text-center mb-4">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30">
                  <svg
                    className="h-6 w-6 text-red-600 dark:text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
              <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded mb-4">
                {error}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => navigate('/login')}
                  className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  Go to Login
                </button>
                {mode === 'resetPassword' && (
                  <button
                    onClick={() => navigate('/forgot-password')}
                    className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                  >
                    Request New Link
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AuthAction
