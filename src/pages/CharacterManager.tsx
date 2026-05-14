"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { db, storage } from "../firebase/config"
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"
import { useAuth } from "../context/AuthContext"
import type { Novel, Character } from "../types/novel"
import { showSuccessToast, showErrorToast } from "../utils/toast-utils"
import { invalidateNovelCache } from "../utils/cache"
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  User,
  Upload,
  ImageIcon,
} from "lucide-react"

const EMPTY_FORM: Omit<Character, "id"> = {
  name: "",
  description: "",
  imageUrl: null,
}

const CharacterManager = () => {
  const { id: novelId } = useParams<{ id: string }>()
  const { currentUser } = useAuth()
  const navigate = useNavigate()

  const [novel, setNovel] = useState<Novel | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null)
  const [formData, setFormData] = useState<Omit<Character, "id">>(EMPTY_FORM)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // ─── Fetch Novel ──────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchNovel = async () => {
      if (!novelId) return
      try {
        setLoading(true)
        const novelDoc = await getDoc(doc(db, "novels", novelId))
        if (novelDoc.exists()) {
          const data = { id: novelDoc.id, ...novelDoc.data() } as Novel
          // Auth guard – only the author can access this page
          if (currentUser && data.authorId !== currentUser.uid) {
            navigate(`/novel/${novelId}`)
            return
          }
          setNovel(data)
        } else {
          setError("Novel not found")
        }
      } catch (err) {
        console.error(err)
        setError("Failed to load novel")
      } finally {
        setLoading(false)
      }
    }
    fetchNovel()
  }, [novelId, currentUser, navigate])

  // ─── Modal helpers ────────────────────────────────────────────────────────
  const openAddModal = () => {
    setEditingCharacter(null)
    setFormData(EMPTY_FORM)
    setImagePreview(null)
    setImageFile(null)
    setShowModal(true)
  }

  const openEditModal = (char: Character) => {
    setEditingCharacter(char)
    setFormData({ name: char.name, description: char.description, imageUrl: char.imageUrl ?? null })
    setImagePreview(char.imageUrl ?? null)
    setImageFile(null)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingCharacter(null)
    setFormData(EMPTY_FORM)
    setImagePreview(null)
    setImageFile(null)
  }

  // ─── Image upload helpers ─────────────────────────────────────────────────
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.match("image/(jpeg|jpg|png|webp)")) {
      showErrorToast("Image must be JPEG, PNG, or WebP")
      return
    }
    if (file.size > 1 * 1024 * 1024) {
      showErrorToast("Image must be under 1 MB")
      return
    }
    setImageFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const uploadCharacterImage = async (charId: string): Promise<string | null> => {
    if (!imageFile || !novelId) return null
    setUploadingImage(true)
    try {
      const storageRef = ref(storage, `character-images/${novelId}/${charId}.jpg`)
      await uploadBytes(storageRef, imageFile, { contentType: imageFile.type || "image/jpeg" })
      const url = await getDownloadURL(storageRef)
      return url
    } catch (err) {
      console.error("Image upload failed:", err)
      showErrorToast("Failed to upload character image")
      return null
    } finally {
      setUploadingImage(false)
    }
  }

  const deleteCharacterImage = async (charId: string) => {
    if (!novelId) return
    try {
      const storageRef = ref(storage, `character-images/${novelId}/${charId}.jpg`)
      await deleteObject(storageRef)
    } catch {
      // Image may not exist – ignore
    }
  }

  // ─── Generate a simple unique id ─────────────────────────────────────────
  const generateId = () => `char_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

  // ─── Save character (add or update) ──────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!formData.name.trim()) {
      showErrorToast("Character name is required")
      return
    }
    if (!novel || !novelId) return

    setSaving(true)
    try {
      const charId = editingCharacter?.id ?? generateId()

      // Upload image if a new file was chosen
      let finalImageUrl: string | null = formData.imageUrl ?? null
      if (imageFile) {
        const uploaded = await uploadCharacterImage(charId)
        if (uploaded) finalImageUrl = uploaded
      }

      const updatedChar: Character = {
        id: charId,
        name: formData.name.trim(),
        description: formData.description.trim(),
        imageUrl: finalImageUrl,
      }

      const existing: Character[] = novel.characters ?? []
      let updated: Character[]

      if (editingCharacter) {
        updated = existing.map((c) => (c.id === charId ? updatedChar : c))
      } else {
        updated = [...existing, updatedChar]
      }

      await updateDoc(doc(db, "novels", novelId), { characters: updated })
      await invalidateNovelCache(novelId)
      setNovel((prev) => (prev ? { ...prev, characters: updated } : prev))
      showSuccessToast(editingCharacter ? "Character updated!" : "Character added!")
      closeModal()
    } catch (err) {
      console.error(err)
      showErrorToast("Failed to save character")
    } finally {
      setSaving(false)
    }
  }, [formData, editingCharacter, novel, novelId, imageFile])

  // ─── Delete character ─────────────────────────────────────────────────────
  const handleDelete = async (char: Character) => {
    if (!novel || !novelId) return
    setDeletingId(char.id)
    try {
      if (char.imageUrl) await deleteCharacterImage(char.id)
      const updated = (novel.characters ?? []).filter((c) => c.id !== char.id)
      await updateDoc(doc(db, "novels", novelId), { characters: updated })
      await invalidateNovelCache(novelId)
      setNovel((prev) => (prev ? { ...prev, characters: updated } : prev))
      showSuccessToast("Character deleted")
    } catch (err) {
      console.error(err)
      showErrorToast("Failed to delete character")
    } finally {
      setDeletingId(null)
    }
  }

  // ─── Loading / error states ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500" />
      </div>
    )
  }

  if (error || !novel) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-4">{error || "Novel not found"}</p>
          <Link to="/novels" className="text-purple-400 hover:underline">← Back to Novels</Link>
        </div>
      </div>
    )
  }

  const characters: Character[] = novel.characters ?? []

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen py-6 sm:py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Back link + heading */}
        <div className="py-8">
          <Link
            to={`/novel/${novelId}`}
            className="inline-flex items-center text-purple-400 hover:text-purple-300 transition-colors text-sm mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Novel
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Character Manager</h1>
              <p className="text-gray-400 mt-1 text-sm">
                {novel.title} &mdash; {characters.length} character{characters.length !== 1 ? "s" : ""}
              </p>
            </div>
            <button
              onClick={openAddModal}
              className="inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg self-start sm:self-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Character
            </button>
          </div>
        </div>

        {/* Character grid */}
        {characters.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-16 text-center">
            <div className="mx-auto h-16 w-16 bg-purple-500/20 rounded-full flex items-center justify-center mb-4">
              <User className="h-8 w-8 text-purple-400" />
            </div>
            <h3 className="text-white text-lg font-semibold mb-2">No characters yet</h3>
            <p className="text-gray-400 text-sm mb-6">Bring your story to life by introducing your cast.</p>
            <button
              onClick={openAddModal}
              className="inline-flex items-center px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Character
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {characters.map((char) => (
              <div
                key={char.id}
                className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 border border-white/10 rounded-2xl overflow-hidden shadow-xl hover:border-purple-500/40 transition-all duration-300 hover:shadow-purple-500/10 flex flex-col"
              >
                {/* Character image */}
                <div className={`relative bg-gradient-to-br from-purple-900/40 to-indigo-900/40 flex items-center justify-center overflow-hidden ${char.imageUrl ? "" : "h-44"}`}>
                  {char.imageUrl ? (
                    <img
                      src={char.imageUrl}
                      alt={char.name}
                      className="w-full h-auto max-h-64 object-contain"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-full bg-gradient-to-br from-purple-500/30 to-indigo-500/30 border border-white/10 flex items-center justify-center">
                      <User className="h-10 w-10 text-purple-300/60" />
                    </div>
                  )}
                  {/* Overlay actions */}
                  <div className="absolute top-2 right-2 flex gap-2">
                    <button
                      onClick={() => openEditModal(char)}
                      className="p-2 bg-gray-900/80 hover:bg-purple-600 text-white rounded-lg transition-colors backdrop-blur-sm"
                      title="Edit character"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(char)}
                      disabled={deletingId === char.id}
                      className="p-2 bg-gray-900/80 hover:bg-red-600 text-white rounded-lg transition-colors backdrop-blur-sm disabled:opacity-50"
                      title="Delete character"
                    >
                      {deletingId === char.id ? (
                        <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="text-white font-bold text-base mb-2 truncate">{char.name}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed line-clamp-4 flex-1">
                    {char.description || <span className="italic text-gray-600">No description yet.</span>}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Add / Edit Modal ──────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h2 className="text-lg font-bold text-white">
                {editingCharacter ? "Edit Character" : "New Character"}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">

              {/* Image upload */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Character Image <span className="text-gray-500 font-normal">(optional)</span>
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative rounded-xl border-2 border-dashed transition-colors cursor-pointer overflow-hidden flex items-center justify-center bg-white/5 ${imagePreview
                      ? "border-purple-500/40 hover:border-purple-500/70"
                      : "h-36 border-white/20 hover:border-purple-500/60"
                    }`}
                >
                  {imagePreview ? (
                    <>
                      <img
                        src={imagePreview}
                        alt="preview"
                        className="w-full h-auto max-h-72 object-contain"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Upload className="h-6 w-6 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="text-center">
                      <ImageIcon className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                      <p className="text-gray-500 text-xs">Click to upload image</p>
                      <p className="text-gray-600 text-xs mt-1">JPEG, PNG, WebP · max 1 MB</p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleImageChange}
                  className="hidden"
                />
                {imagePreview && (
                  <button
                    onClick={() => { setImagePreview(null); setImageFile(null); setFormData((p) => ({ ...p, imageUrl: null })) }}
                    className="mt-2 text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
                  >
                    <X className="h-3 w-3" /> Remove image
                  </button>
                )}
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Adaeze Okonkwo"
                  className="w-full bg-white/5 border border-white/15 text-white placeholder-gray-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  maxLength={80}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Personality, backstory, role in the story…"
                  rows={5}
                  className="w-full bg-white/5 border border-white/15 text-white placeholder-gray-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition resize-none"
                  maxLength={1000}
                />
                <p className="text-right text-xs text-gray-600 mt-1">{formData.description.length}/1000</p>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || uploadingImage || !formData.name.trim()}
                className="inline-flex items-center px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-all duration-200"
              >
                {saving || uploadingImage ? (
                  <>
                    <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Saving…
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {editingCharacter ? "Update" : "Add Character"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CharacterManager
