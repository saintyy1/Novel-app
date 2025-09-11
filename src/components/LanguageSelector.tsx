"use client"
import React, { useState, useRef, useEffect } from "react"
import { useTranslation } from "../context/TranslationContext"
import { Globe } from "lucide-react"

const LanguageSelector: React.FC = () => {
  const { language, setLanguage } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const languages = [
    { code: "en" as const, name: "English", flag: "🇺🇸" },
    { code: "fr" as const, name: "Français", flag: "🇫🇷" },
    { code: "es" as const, name: "Español", flag: "🇪🇸" },
    { code: "pt" as const, name: "Português", flag: "🇵🇹" },
  ]

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const handleLanguageSelect = (langCode: typeof language) => {
    setLanguage(langCode)
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white transition-colors"
      >
        <Globe className="h-4 w-4" />
        <span className="text-sm font-medium">
          {languages.find(lang => lang.code === language)?.flag} {languages.find(lang => lang.code === language)?.name}
        </span>
      </button>
      
      <div className={`absolute left-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg transition-all duration-200 z-50 ${
        isOpen ? "opacity-100 visible" : "opacity-0 invisible"
      }`}>
        <div className="py-2">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageSelect(lang.code)}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-700 transition-colors flex items-center space-x-3 ${
                language === lang.code ? "text-purple-400 bg-gray-700" : "text-white"
              }`}
            >
              <span className="text-lg">{lang.flag}</span>
              <span>{lang.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default LanguageSelector
