"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { useAuth, type ExtendedUser } from "../context/AuthContext"
import { showSuccessToast, showErrorToast } from "../utils/toast-utils"
import { FaTimes, FaInstagram, FaTwitter } from "react-icons/fa"

interface EditProfileModalProps {
  isOpen: boolean
  onClose: () => void
  profileUser: ExtendedUser | null
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose, profileUser }) => {
  const { updateUserProfile, refreshUser } = useAuth()
  const [displayName, setDisplayName] = useState(profileUser?.displayName || "")
  const [bio, setBio] = useState(profileUser?.bio || "")
  const [instagramUrl, setInstagramUrl] = useState(profileUser?.instagramUrl || "")
  const [twitterUrl, settwitterUrl] = useState(profileUser?.twitterUrl || "")
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState("")

  useEffect(() => {
    if (isOpen && profileUser) {
      setDisplayName(profileUser.displayName || "")
      setBio(profileUser.bio || "")
      setInstagramUrl(profileUser.instagramUrl || "")
      settwitterUrl(profileUser.twitterUrl || "")
      setSaveError("") // Clear error on open
    }
  }, [isOpen, profileUser])

  const handleSave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profileUser) return

    if (displayName.trim() === "") {
      setSaveError("Display name cannot be empty.")
      return
    }
    if (bio.length > 500) {
      setSaveError("Bio cannot exceed 500 characters.")
      return
    }

    // Basic URL validation (can be enhanced)
    const urlRegex = /^(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|[a-zA-Z0-9]+\.[^\s]{2,})$/i;

    if (instagramUrl && !urlRegex.test(instagramUrl)) {
      setSaveError("Invalid Instagram URL.")
      return;
    }
    if (twitterUrl && !urlRegex.test(twitterUrl)) {
      setSaveError("Invalid TikTok URL.")
      return;
    }


    setIsSaving(true)
    setSaveError("")
    try {
      await updateUserProfile(displayName, bio, instagramUrl, twitterUrl)
      showSuccessToast("Profile updated successfully!")
      onClose()
      await refreshUser() // Ensure the main profile page data is refreshed
    } catch (err) {
      console.error("Error saving profile:", err)
      showErrorToast("Failed to update profile. Please try again.")
      setSaveError("Failed to update profile. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }, [displayName, bio, instagramUrl, twitterUrl, profileUser, updateUserProfile, refreshUser, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl shadow-lg p-6 max-w-lg w-full relative border border-gray-700">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          title="Close"
        >
          <FaTimes className="h-6 w-6" />
        </button>
        <h2 className="text-2xl font-bold text-white mb-6 text-center">Edit Profile</h2>

        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-300 mb-1">
              Display Name
            </label>
            <input
              type="text"
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              required
              maxLength={50}
            />
          </div>

          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-300 mb-1">
              Bio (max 500 characters)
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-y"
              rows={4}
              maxLength={500}
            />
          </div>

          {/* Social Media Links */}
          <div>
            <label htmlFor="instagramUrl" className="block text-sm font-medium text-gray-300 mb-1">
              Instagram URL
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaInstagram className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="url"
                id="instagramUrl"
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                placeholder="https://instagram.com/yourprofile"
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="twitterUrl" className="block text-sm font-medium text-gray-300 mb-1">
              TikTok URL
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaTwitter className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="url"
                id="twitterUrl"
                value={twitterUrl}
                onChange={(e) => settwitterUrl(e.target.value)}
                placeholder="https://x.com/@yourprofile"
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          {saveError && (
            <div className="text-red-400 text-sm text-center">{saveError}</div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-sm font-medium rounded-lg text-gray-300 border border-gray-600 hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-sm font-medium rounded-lg text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? (
                <span className="flex items-center">
                  <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </span>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditProfileModal
