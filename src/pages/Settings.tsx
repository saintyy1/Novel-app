"use client"
import type React from "react"
import { useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  updatePassword,
  deleteUser,
} from "firebase/auth"
import { auth, db, googleProvider } from "../firebase/config"
import { doc, deleteDoc, collection, query, where, getDocs, writeBatch } from "firebase/firestore"
import { useAuth } from "../context/AuthContext"
import { showErrorToast, showSuccessToast } from "../utils/toast-utils"
import SEOHead from "../components/SEOHead"

const Settings: React.FC = () => {
  const { currentUser, logout, updateUserEmail } = useAuth()
  const navigate = useNavigate()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")
  const [deletionPassword, setDeletionPassword] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [confirmNewEmail, setConfirmNewEmail] = useState("")
  const [emailChangePassword, setEmailChangePassword] = useState("")
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

  const isGoogleUser = useMemo(() => {
    return (auth.currentUser?.providerData || []).some((p) => p.providerId.includes("google"))
  }, [auth.currentUser])

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Please log in to manage your settings</h2>
          <Link
            to="/login"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
          >
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  const reauthenticate = async (password?: string) => {
    if (!auth.currentUser) throw new Error("No authenticated user")
    if (isGoogleUser && !password) {
      await reauthenticateWithPopup(auth.currentUser, googleProvider)
      return
    }
    if (!auth.currentUser.email) throw new Error("Missing email on user")
    if (!password) throw new Error("Password is required")
    const credential = EmailAuthProvider.credential(auth.currentUser.email, password)
    await reauthenticateWithCredential(auth.currentUser, credential)
  }

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!auth.currentUser) return
    if (!newEmail || !newEmail.includes("@")) {
      showErrorToast("Please enter a valid email address")
      return
    }
    if (newEmail !== confirmNewEmail) {
      showErrorToast("New email and confirmation do not match")
      return
    }
    try {
      setLoadingAction("email")
      await updateUserEmail(newEmail, confirmNewEmail, isGoogleUser ? undefined : emailChangePassword)
      showSuccessToast(
        "Verification email sent! Check your new email and click the verification link to complete the change.",
      )
      setNewEmail("")
      setConfirmNewEmail("")
      setEmailChangePassword("")
    } catch (error: any) {
      console.error(error)
      showErrorToast(error?.message || "Failed to send verification email")
    } finally {
      setLoadingAction(null)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!auth.currentUser) return
    if (!newPassword || newPassword.length < 6) {
      showErrorToast("Password must be at least 6 characters")
      return
    }
    if (newPassword !== confirmNewPassword) {
      showErrorToast("Passwords do not match")
      return
    }
    try {
      setLoadingAction("password")
      await reauthenticate(isGoogleUser ? undefined : currentPassword)
      await updatePassword(auth.currentUser, newPassword)
      showSuccessToast("Password updated")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmNewPassword("")
    } catch (error: any) {
      console.error(error)
      showErrorToast(error?.message || "Failed to update password")
    } finally {
      setLoadingAction(null)
    }
  }

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!auth.currentUser) return
    const confirmed = window.confirm("This will permanently delete your account and data. Continue?")
    if (!confirmed) return
    try {
      setLoadingAction("delete")
      await reauthenticate(isGoogleUser ? undefined : deletionPassword)
      // Delete all novels authored by this user (in batches)
      const novelsRef = collection(db, "novels")
      const novelsQuery = query(novelsRef, where("authorId", "==", auth.currentUser.uid))
      const novelsSnapshot = await getDocs(novelsQuery)
      if (!novelsSnapshot.empty) {
        let batch = writeBatch(db)
        let ops = 0
        for (const novelDoc of novelsSnapshot.docs) {
          batch.delete(novelDoc.ref)
          ops++
          if (ops === 450) {
            await batch.commit()
            batch = writeBatch(db)
            ops = 0
          }
        }
        if (ops > 0) {
          await batch.commit()
        }
      }
      // Remove Firestore user doc after novels
      await deleteDoc(doc(db, "users", auth.currentUser.uid))
      // Delete auth user
      await deleteUser(auth.currentUser)
      showSuccessToast("Account deleted")
      await logout()
      navigate("/")
    } catch (error: any) {
      console.error(error)
      showErrorToast(error?.message || "Failed to delete account")
    } finally {
      setLoadingAction(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <SEOHead
        title="Account Settings - NovlNest"
        description="Manage your NovlNest account settings. Update your profile, change password, manage privacy settings, and customize your reading experience."
        keywords="account settings, profile settings, NovlNest settings, user preferences, account management"
        url="https://novlnest.com/settings"
        canonicalUrl="https://novlnest.com/settings"
      />
      
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-white text-center my-2">Settings</h1>
        <p className="text-sm text-gray-400 text-center mb-2">@{currentUser.displayName}</p>

        <div className="space-y-8">
          <section className="bg-gray-800 rounded-xl p-6 shadow-md">
            <h2 className="text-xl font-semibold text-white mb-4">Change Email</h2>
            <form onSubmit={handleChangeEmail} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Current Email</label>
                <input
                  type="email"
                  className="w-full bg-gray-700 text-gray-400 border border-gray-600 rounded-md px-3 py-2 cursor-not-allowed"
                  value={currentUser.email || ""}
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">New Email</label>
                <input
                  type="email"
                  className="w-full bg-gray-900 text-white border border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-600"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Enter new email address"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Confirm New Email</label>
                <input
                  type="email"
                  className="w-full bg-gray-900 text-white border border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-600"
                  value={confirmNewEmail}
                  onChange={(e) => setConfirmNewEmail(e.target.value)}
                  placeholder="Confirm new email address"
                  required
                />
              </div>
              {!isGoogleUser && (
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Current Password</label>
                  <input
                    type="password"
                    className="w-full bg-gray-900 text-white border border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-600"
                    value={emailChangePassword}
                    onChange={(e) => setEmailChangePassword(e.target.value)}
                    placeholder="Enter your current password"
                    required
                  />
                </div>
              )}
              <p className="text-xs text-gray-400">
                {isGoogleUser
                  ? "You may be asked to reauthenticate via Google popup. Choose your current email to verify your identity."
                  : "Enter your current password to verify your identity. A verification email will be sent to your new email address."}{" "}
                Click the verification link to complete the email change.
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 rounded-md bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
                  disabled={loadingAction === "email"}
                >
                  {loadingAction === "email" ? "Sending..." : "Send Verification Email"}
                </button>
              </div>
            </form>
          </section>

          <section className="bg-gray-800 rounded-xl p-6 shadow-md">
            <h2 className="text-xl font-semibold text-white mb-4">Change Password</h2>
            <form onSubmit={handleChangePassword} className="space-y-4">
              {!isGoogleUser && (
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Current Password</label>
                  <input
                    type="password"
                    className="w-full bg-gray-900 text-white border border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-600"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
              )}
              <div>
                <label className="block text-sm text-gray-300 mb-1">New Password</label>
                <input
                  type="password"
                  className="w-full bg-gray-900 text-white border border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-600"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  className="w-full bg-gray-900 text-white border border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-600"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>
              {isGoogleUser && (
                <p className="text-xs text-gray-400">
                  Using Google sign-in. You may be asked to reauthenticate via Google popup. Choose your current email to verify your identity.
                </p>
              )}
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 rounded-md bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
                disabled={loadingAction === "password"}
              >
                {loadingAction === "password" ? "Updating..." : "Update Password"}
              </button>
            </form>
          </section>

          <section className="bg-gray-800 rounded-xl p-6 shadow-md border border-red-900/40">
            <h2 className="text-xl font-semibold text-red-400 mb-4">Delete Account</h2>
            <form onSubmit={handleDeleteAccount} className="space-y-4">
              {!isGoogleUser && (
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Confirm Password</label>
                  <input
                    type="password"
                    className="w-full bg-gray-900 text-white border border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-600"
                    value={deletionPassword}
                    onChange={(e) => setDeletionPassword(e.target.value)}
                    placeholder="Required to delete your account"
                  />
                </div>
              )}
              {isGoogleUser && (
                <p className="text-xs text-gray-400">
                  Using Google sign-in. You will be asked to reauthenticate via Google popup. Choose your current email to verify your identity.
                </p>
              )}
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                disabled={loadingAction === "delete"}
              >
                {loadingAction === "delete" ? "Deleting..." : "Delete Account"}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  )
}

export default Settings
