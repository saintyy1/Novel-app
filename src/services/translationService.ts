"use server"

export type Language = "en" | "fr" | "es" | "pt"

interface TranslationResponse {
  data: {
    translations: Array<{
      translatedText: string
      detectedSourceLanguage: string
    }>
  }
}

class TranslationService {
  private apiKey: string
  private baseUrl = "https://translation.googleapis.com/language/translate/v2"

  constructor() {
    // You'll need to add your Google Translate API key here
    this.apiKey = import.meta.env.VITE_GOOGLE_TRANSLATE_API_KEY || ""
  }

  private getLanguageCode(lang: Language): string {
    const codes = {
      en: "en",
      fr: "fr", 
      es: "es",
      pt: "pt"
    }
    return codes[lang]
  }

  async translateText(text: string, targetLanguage: Language): Promise<string> {
    console.log("translateText called:", { text: text.substring(0, 50) + "...", targetLanguage, hasApiKey: !!this.apiKey })
    
    if (!this.apiKey) {
      console.warn("Google Translate API key not found. Using original text.")
      return text
    }

    if (!text || text.trim() === "") {
      return text
    }

    try {
      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: text,
          target: this.getLanguageCode(targetLanguage),
          format: "text"
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Translation API error ${response.status}:`, errorText)
        
        if (response.status === 403) {
          console.error("403 Forbidden - Check your API key and billing account")
          console.error("Make sure:")
          console.error("1. API key is correct")
          console.error("2. Cloud Translation API is enabled")
          console.error("3. Billing is enabled for your Google Cloud project")
          console.error("4. API key has proper permissions")
        }
        
        throw new Error(`Translation API error: ${response.status} - ${errorText}`)
      }

      const data: TranslationResponse = await response.json()
      console.log("Translation response:", data)
      
      if (data.data?.translations?.[0]?.translatedText) {
        const translated = data.data.translations[0].translatedText
        console.log("Translation successful:", text.substring(0, 30) + "... → " + translated.substring(0, 30) + "...")
        return translated
      }

      return text
    } catch (error) {
      console.error("Translation error:", error)
      return text
    }
  }

  async translateParagraphs(paragraphs: string[], targetLanguage: Language): Promise<string[]> {
    console.log("translateParagraphs called:", { paragraphsCount: paragraphs.length, targetLanguage, hasApiKey: !!this.apiKey })
    
    if (targetLanguage === "en") {
      console.log("Target language is English, returning original paragraphs")
      return paragraphs
    }

    try {
      console.log("Starting batch translation...")
      // Translate all paragraphs in a single batch request for efficiency
      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: paragraphs,
          target: this.getLanguageCode(targetLanguage),
          format: "text"
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Batch translation API error ${response.status}:`, errorText)
        throw new Error(`Translation API error: ${response.status} - ${errorText}`)
      }

      const data: TranslationResponse = await response.json()
      console.log("Batch translation response:", data)
      
      if (data.data?.translations) {
        const translated = data.data.translations.map(t => t.translatedText)
        console.log("Batch translation successful:", translated.length, "paragraphs translated")
        return translated
      }

      console.log("No translations in response, returning original paragraphs")
      return paragraphs
    } catch (error) {
      console.error("Batch translation error:", error)
      console.log("Falling back to individual translations...")
      // Fallback to individual translations
      return Promise.all(paragraphs.map(p => this.translateText(p, targetLanguage)))
    }
  }

  // Cache for translated content to avoid re-translating
  private translationCache = new Map<string, string>()

  getCacheKey(text: string, language: Language): string {
    return `${language}:${text.substring(0, 100)}`
  }

  async translateWithCache(text: string, targetLanguage: Language): Promise<string> {
    if (targetLanguage === "en") {
      return text
    }

    const cacheKey = this.getCacheKey(text, targetLanguage)
    
    if (this.translationCache.has(cacheKey)) {
      return this.translationCache.get(cacheKey)!
    }

    const translated = await this.translateText(text, targetLanguage)
    this.translationCache.set(cacheKey, translated)
    
    return translated
  }

  clearCache(): void {
    this.translationCache.clear()
  }

  // Test function to verify API connection
  async testConnection(): Promise<boolean> {
    if (!this.apiKey) {
      console.error("❌ No API key found")
      return false
    }

    try {
      const testText = "Hello world"
      const result = await this.translateText(testText, "fr")
      
      if (result && result !== testText) {
        console.log("✅ Translation API test successful:", testText, "→", result)
        return true
      } else {
        console.error("❌ Translation API test failed - no translation returned")
        return false
      }
    } catch (error) {
      console.error("❌ Translation API test failed:", error)
      return false
    }
  }
}

export const translationService = new TranslationService()
