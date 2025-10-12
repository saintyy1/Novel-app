import { useEffect } from 'react'

interface SEOHeadProps {
  title?: string
  description?: string
  keywords?: string
  image?: string
  url?: string
  type?: string
  structuredData?: object
}

const SEOHead = ({ 
  title = "NovlNest - Discover Extraordinary Stories",
  description = "From new voices to hidden gems, explore novels created and shared by real storytellers. Read free novels online, discover trending stories, and share your own writing.",
  keywords = "novels, free novels, online novels, stories, fiction, reading, books, wattpad alternative, novel platform, digital books, ebooks, creative writing, storytelling",
  image = "https://novlnest.com/images/logo.jpg",
  url = "https://novlnest.com",
  type = "website",
  structuredData
}: SEOHeadProps) => {
  useEffect(() => {
    // Update document title
    document.title = title
    
    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]')
    if (metaDescription) {
      metaDescription.setAttribute('content', description)
    } else {
      const meta = document.createElement('meta')
      meta.name = 'description'
      meta.content = description
      document.head.appendChild(meta)
    }

    // Update meta keywords
    const metaKeywords = document.querySelector('meta[name="keywords"]')
    if (metaKeywords) {
      metaKeywords.setAttribute('content', keywords)
    } else {
      const meta = document.createElement('meta')
      meta.name = 'keywords'
      meta.content = keywords
      document.head.appendChild(meta)
    }

    // Update Open Graph tags
    const updateMetaTag = (property: string, content: string) => {
      const existingTag = document.querySelector(`meta[property="${property}"]`)
      if (existingTag) {
        existingTag.setAttribute('content', content)
      } else {
        const meta = document.createElement('meta')
        meta.setAttribute('property', property)
        meta.content = content
        document.head.appendChild(meta)
      }
    }

    // Update Twitter tags
    const updateTwitterTag = (name: string, content: string) => {
      const existingTag = document.querySelector(`meta[name="${name}"]`)
      if (existingTag) {
        existingTag.setAttribute('content', content)
      } else {
        const meta = document.createElement('meta')
        meta.setAttribute('name', name)
        meta.content = content
        document.head.appendChild(meta)
      }
    }

    // Open Graph tags
    updateMetaTag('og:type', type)
    updateMetaTag('og:url', url)
    updateMetaTag('og:title', title)
    updateMetaTag('og:description', description)
    updateMetaTag('og:image', image)
    updateMetaTag('og:site_name', 'NovlNest')

    // Twitter tags
    updateTwitterTag('twitter:card', 'summary_large_image')
    updateTwitterTag('twitter:url', url)
    updateTwitterTag('twitter:title', title)
    updateTwitterTag('twitter:description', description)
    updateTwitterTag('twitter:image', image)

    // Canonical URL
    const canonicalLink = document.querySelector('link[rel="canonical"]')
    if (canonicalLink) {
      canonicalLink.setAttribute('href', url)
    } else {
      const link = document.createElement('link')
      link.rel = 'canonical'
      link.href = url
      document.head.appendChild(link)
    }

    // Structured Data
    if (structuredData) {
      // Remove existing structured data
      const existingScript = document.querySelector('script[type="application/ld+json"]')
      if (existingScript) {
        existingScript.remove()
      }
      
      const script = document.createElement('script')
      script.type = 'application/ld+json'
      script.textContent = JSON.stringify(structuredData)
      document.head.appendChild(script)
    }
  }, [title, description, keywords, image, url, type, structuredData])

  return null
}

export default SEOHead
