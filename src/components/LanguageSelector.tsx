"use client"
import React from "react"
import { useTranslation } from "../context/TranslationContext"
import { Globe } from "lucide-react"

const LanguageSelector: React.FC = () => {
  const { language, setLanguage } = useTranslation()

  const languages = [
    { code: "en" as const, name: "English", flag: "🇺🇸" },
    { code: "fr" as const, name: "Français", flag: "🇫🇷" },
    { code: "es" as const, name: "Español", flag: "🇪🇸" },
    { code: "pt" as const, name: "Português", flag: "🇵🇹" },
  ]

  return (
    <div className="relative group">
      <button className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white transition-colors">
        <Globe className="h-4 w-4" />
        <span className="text-sm font-medium">
          {languages.find(lang => lang.code === language)?.flag} {languages.find(lang => lang.code === language)?.name}
        </span>
      </button>
      
      <div className="absolute left-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
        <div className="py-2">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
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
