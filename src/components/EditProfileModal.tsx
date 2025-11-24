"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { useAuth, type ExtendedUser } from "../context/AuthContext"
import { showSuccessToast, showErrorToast } from "../utils/toast-utils"
import { FaTimes, FaInstagram } from "react-icons/fa"
import { FaXTwitter } from "react-icons/fa6"
import { collection, getDocs } from "firebase/firestore"
import { db } from "../firebase/config"

interface EditProfileModalProps {
  isOpen: boolean
  onClose: () => void
  profileUser: ExtendedUser | null
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose, profileUser }) => {
  const { updateUserProfile, refreshUser, currentUser } = useAuth()
  const [displayName, setDisplayName] = useState(profileUser?.displayName || "")
  const [displayNameError, setDisplayNameError] = useState("")
  const [bio, setBio] = useState(profileUser?.bio || "")
  const [instagramUrl, setInstagramUrl] = useState(profileUser?.instagramUrl || "")
  const [twitterUrl, settwitterUrl] = useState(profileUser?.twitterUrl || "")
  const [supportLink, setSupportLink] = useState((profileUser as any)?.supportLink || "")
  const [location, setLocation] = useState((profileUser as any)?.location || "")
  const [bankName, setBankName] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [accountName, setAccountName] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState("")

  // Parse support link for Nigerian users
  const parseNigerianSupportLink = (link: string) => {
    if (!link) return { bankName: "", accountNumber: "", accountName: "" }
    
    // Try to parse format: "BankName: AccountNumber, AccountName"
    const match = link.match(/^(.+?):\s*(\d+),\s*(.+)$/)
    if (match) {
      return {
        bankName: match[1].trim(),
        accountNumber: match[2].trim(),
        accountName: match[3].trim()
      }
    }
    
    return { bankName: "", accountNumber: "", accountName: "" }
  }

  // Validate display name uniqueness
  const validateDisplayName = useCallback(async (name: string) => {
    if (!name || name.trim().length === 0) {
      setDisplayNameError("Display name cannot be empty")
      return false
    }

    if (name.trim().length < 2) {
      setDisplayNameError("Display name must be at least 2 characters long")
      return false
    }

    if (name.trim().length > 50) {
      setDisplayNameError("Display name must not exceed 50 characters")
      return false
    }

    // Validate that display name contains only allowed characters (letters, numbers, spaces, hyphens, apostrophes)
    const validNamePattern = /^[a-zA-Z0-9\s\-']+$/
    if (!validNamePattern.test(name.trim())) {
      setDisplayNameError("Display name can only contain letters, numbers, spaces, hyphens, and apostrophes")
      return false
    }

    // If display name hasn't changed, no need to check uniqueness
    if (name.trim() === profileUser?.displayName) {
      setDisplayNameError("")
      return true
    }

    // Check if displayName already exists (case-insensitive and whitespace-insensitive)
    const normalizedNewName = name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()

    try {
      const allUsersSnapshot = await getDocs(collection(db, "users"))
      
      const displayNameExists = allUsersSnapshot.docs.some(doc => {
        const existingName = doc.data().displayName
        if (!existingName) return false
        
        // Don't check against current user's own display name
        if (doc.id === currentUser?.uid) return false
        
        const normalizedExistingName = existingName
          .toLowerCase()
          .replace(/\s+/g, ' ')
          .trim()
        
        return normalizedExistingName === normalizedNewName
      })

      if (displayNameExists) {
        setDisplayNameError("This display name is already taken. Try another one.")
        return false
      }

      setDisplayNameError("")
      return true
    } catch (error) {
      console.error("Error validating display name:", error)
      setDisplayNameError("Error checking display name availability")
      return false
    }
  }, [profileUser?.displayName, currentUser?.uid])

  // Debounce display name validation
  useEffect(() => {
    const timer = setTimeout(() => {
      if (displayName !== profileUser?.displayName) {
        validateDisplayName(displayName)
      } else {
        setDisplayNameError("")
      }
    }, 500) // Wait 500ms after user stops typing

    return () => clearTimeout(timer)
  }, [displayName, profileUser?.displayName, validateDisplayName])

  useEffect(() => {
    if (isOpen && profileUser) {
      setDisplayName(profileUser.displayName || "")
      setBio(profileUser.bio || "")
      setInstagramUrl(profileUser.instagramUrl || "")
      settwitterUrl(profileUser.twitterUrl || "")
      setSupportLink((profileUser as any).supportLink || "")
      setLocation((profileUser as any).location || "")
      
      // Parse Nigerian support link if location is Nigerian
      if ((profileUser as any).location === "Nigerian") {
        const parsed = parseNigerianSupportLink((profileUser as any).supportLink || "")
        setBankName(parsed.bankName)
        setAccountNumber(parsed.accountNumber)
        setAccountName(parsed.accountName)
      }
      
      setSaveError("")
      setDisplayNameError("")
    }
  }, [isOpen, profileUser])

  const handleSave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profileUser) return

    // Check for display name errors before saving
    if (displayNameError) {
      setSaveError("Please fix the display name error before saving.")
      return
    }

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
      setSaveError("Invalid Twitter URL.")
      return;
    }
    if (supportLink && !urlRegex.test(supportLink)) {
      setSaveError("Invalid support link URL.")
      return;
    }

    setIsSaving(true)
    setSaveError("")
    try {
      // Format support link based on location
      let formattedSupportLink = supportLink
      if (location === "Nigerian" && bankName && accountNumber && accountName) {
        formattedSupportLink = `${bankName}: ${accountNumber}, ${accountName}`
      }
      
      await updateUserProfile(displayName, bio, instagramUrl, twitterUrl, formattedSupportLink, location)
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
  }, [displayName, bio, instagramUrl, twitterUrl, supportLink, location, bankName, accountNumber, accountName, profileUser, updateUserProfile, refreshUser, onClose, displayNameError])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl shadow-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto relative border border-gray-700">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          title="Close"
        >
          <FaTimes className="h-6 w-6" />
        </button>
        <h2 className="text-2xl font-bold text-white mb-4 text-center">Edit Profile</h2>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-300 mb-1">
              Display Name
            </label>
            <input
              type="text"
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={`w-full px-4 py-2 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:border-transparent outline-none transition-colors ${
                displayNameError 
                  ? "border-red-500 focus:ring-red-500" 
                  : "border-gray-600 focus:ring-purple-500"
              }`}
              required
              maxLength={50}
            />
            {displayNameError && (
              <p className="text-red-400 text-xs mt-1">{displayNameError}</p>
            )}
            <p className="text-gray-400 text-xs mt-1">{displayName.length}/50</p>
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
              rows={3}
              maxLength={500}
            />
            <p className="text-gray-400 text-xs mt-1">{bio.length}/500</p>
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
              Twitter URL
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaXTwitter className="h-5 w-5 text-gray-400" />
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

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-300 mb-1">
              Location
            </label>
            <select
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
            >
              <option value="">Select your location</option>
              <option value="Nigerian">Nigerian</option>
              <option value="International">International</option>
            </select>
          </div>

          {location === "Nigerian" ? (
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-white">Bank Details — optional</h3>
              
              <div>
                <label htmlFor="bankName" className="block text-sm font-medium text-gray-300 mb-1">
                  Bank Name
                </label>
                <select
                  id="bankName"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                >
                  <option value="">Select your bank</option>
                  <option value="Access Bank">Access Bank</option>
                  <option value="Citibank Nigeria">Citibank Nigeria</option>
                  <option value="Ecobank Nigeria">Ecobank Nigeria</option>
                  <option value="Fidelity Bank">Fidelity Bank</option>
                  <option value="First Bank of Nigeria">First Bank of Nigeria</option>
                  <option value="First City Monument Bank">First City Monument Bank</option>
                  <option value="Guaranty Trust Bank">Guaranty Trust Bank</option>
                  <option value="Heritage Bank">Heritage Bank</option>
                  <option value="Keystone Bank">Keystone Bank</option>
                  <option value="Kuda Bank">Kuda Bank</option>
                  <option value="Opay">Opay</option>
                  <option value="PalmPay">PalmPay</option>
                  <option value="Polaris Bank">Polaris Bank</option>
                  <option value="Providus Bank">Providus Bank</option>
                  <option value="Stanbic IBTC Bank">Stanbic IBTC Bank</option>
                  <option value="Standard Chartered Bank">Standard Chartered Bank</option>
                  <option value="Sterling Bank">Sterling Bank</option>
                  <option value="Union Bank of Nigeria">Union Bank of Nigeria</option>
                  <option value="United Bank for Africa">United Bank for Africa</option>
                  <option value="Unity Bank">Unity Bank</option>
                  <option value="VBank">VBank</option>
                  <option value="Wema Bank">Wema Bank</option>
                  <option value="Zenith Bank">Zenith Bank</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-300 mb-1">
                  Account Number
                </label>
                <input
                  type="text"
                  id="accountNumber"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Enter your account number"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label htmlFor="accountName" className="block text-sm font-medium text-gray-300 mb-1">
                  Account Name
                </label>
                <input
                  type="text"
                  id="accountName"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="Enter the account holder's name"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                />
              </div>
            </div>
          ) : (
            <div>
              <label htmlFor="supportLink" className="block text-sm font-medium text-gray-300 mb-1">
                Support link (PayPal, Ko-fi, BuyMeACoffee, etc.) — optional
              </label>
              <input
                type="url"
                id="supportLink"
                value={supportLink}
                onChange={(e) => setSupportLink(e.target.value)}
                placeholder="https://paypal.me/yourname or https://ko-fi.com/yourname"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              />
              <div className="mt-1 text-xs text-gray-400">
                <p className="font-medium mb-1">Popular international options:</p>
                <ul className="space-y-0.5 ml-2">
                  <li>• <strong>PayPal:</strong> https://paypal.me/yourname</li>
                  <li>• <strong>Ko-fi:</strong> https://ko-fi.com/yourname</li>
                  <li>• <strong>Buy Me a Coffee:</strong> https://buymeacoffee.com/yourname</li>
                  <li>• <strong>Patreon:</strong> https://patreon.com/yourname</li>
                </ul>
              </div>
            </div>
          )}

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
              disabled={isSaving || displayNameError !== ""}
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
