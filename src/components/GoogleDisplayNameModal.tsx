import { useState, useCallback } from "react"
import { doc, setDoc, getDocs, collection } from "firebase/firestore"
import { db } from "../firebase/config"
import { useAuth } from "../context/AuthContext"
import { useNavigate } from "react-router-dom"
import { showSuccessToast, showErrorToast } from "../utils/toast-utils"

interface GoogleDisplayNameModalProps {
  isOpen: boolean
  userId: string
  userEmail: string
}

const GoogleDisplayNameModal: React.FC<GoogleDisplayNameModalProps> = ({
  isOpen,
  userId,
  userEmail,
}) => {
  const [displayName, setDisplayName] = useState("")
  const [displayNameError, setDisplayNameError] = useState("")
  const [isValidating, setIsValidating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const { refreshUser } = useAuth()
  const navigate = useNavigate()

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

    const validNamePattern = /^[a-zA-Z0-9\s\-']+$/
    if (!validNamePattern.test(name.trim())) {
      setDisplayNameError("Display name can only contain letters, numbers, spaces, hyphens, and apostrophes")
      return false
    }

    setIsValidating(true)
    try {
      const normalizedNewName = name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim()

      const allUsersSnapshot = await getDocs(collection(db, "users"))

      const displayNameExists = allUsersSnapshot.docs.some(doc => {
        const existingName = doc.data().displayName
        if (!existingName) return false

        if (doc.id === userId) return false

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
    } finally {
      setIsValidating(false)
    }
  }, [userId])

  const handleSave = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (displayNameError) {
        showErrorToast("Please fix the display name error")
        return
      }

      if (displayName.trim() === "") {
        showErrorToast("Display name cannot be empty")
        return
      }

      const isValid = await validateDisplayName(displayName)
      if (!isValid) return

      setIsSaving(true)
      try {
        const trimmedDisplayName = displayName.trim()
        const normalizedDisplayName = trimmedDisplayName
          .toLowerCase()
          .replace(/\s+/g, ' ')
          .trim()

        // Update user document with new display name
        await setDoc(
          doc(db, "users", userId),
          {
            displayName: trimmedDisplayName,
            displayNameLower: normalizedDisplayName,
          },
          { merge: true }
        )

        showSuccessToast("Display name set successfully!")
        await refreshUser()
        navigate("/novels")
      } catch (error) {
        console.error("Error saving display name:", error)
        showErrorToast("Failed to save display name. Please try again.")
      } finally {
        setIsSaving(false)
      }
    },
    [displayName, displayNameError, validateDisplayName, userId, refreshUser, navigate]
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl shadow-lg p-6 max-w-md w-full border border-gray-700">
        <h2 className="text-2xl font-bold text-white mb-2">Set Your Display Name</h2>
        <p className="text-gray-400 text-sm mb-6">
          Your Google name is already taken on NovlNest. Please choose a unique display name.
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-300 mb-2">
              Choose Display Name
            </label>
            <input
              type="text"
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onBlur={() => validateDisplayName(displayName)}
              placeholder="Enter your unique display name"
              className={`w-full px-4 py-2 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:border-transparent outline-none transition-colors ${
                displayNameError
                  ? "border-red-500 focus:ring-red-500"
                  : "border-gray-600 focus:ring-purple-500"
              }`}
              required
              maxLength={50}
              disabled={isSaving}
            />
            {displayNameError && (
              <p className="text-red-400 text-xs mt-1">{displayNameError}</p>
            )}
            <p className="text-gray-400 text-xs mt-1">
              {displayName.length}/50 characters
            </p>
          </div>

          <div className="text-xs text-gray-400 bg-gray-700/50 p-3 rounded">
            <p className="font-medium mb-1">Tips for a good display name:</p>
            <ul className="space-y-1 ml-2">
              <li>• Use letters, numbers, spaces, hyphens, or apostrophes</li>
              <li>• Minimum 2 characters</li>
              <li>• Must be unique on NovlNest</li>
            </ul>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="submit"
              disabled={isSaving || isValidating || displayNameError !== ""}
              className="px-6 py-2 text-sm font-medium rounded-lg text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? (
                <span className="flex items-center">
                  <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
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
                  Saving...
                </span>
              ) : (
                "Continue"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default GoogleDisplayNameModal