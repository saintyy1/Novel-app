import { Helmet } from 'react-helmet-async'

interface SEOHeadProps {
  title?: string
  description?: string
  keywords?: string
  image?: string
  url?: string
  type?: string
  structuredData?: object
  canonicalUrl?: string
}

const SEOHead = ({
  title = "NovlNest - Discover Extraordinary Stories",
  description = "From new voices to hidden gems, explore novels created and shared by real storytellers. Read free novels online, discover trending stories, and share your own writing.",
  keywords = "novels, free novels, online novels, stories, fiction, reading, books, wattpad alternative, novel platform, digital books, ebooks, creative writing, storytelling",
  image = "https://novlnest.com/images/logo.jpg",
  url = "https://novlnest.com",
  type = "website",
  structuredData,
  canonicalUrl
}: SEOHeadProps) => {
  return (
    <Helmet>
      {/* Title */}
      <title>{title}</title>

      {/* Meta tags */}
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content="NovlNest" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Canonical URL */}
      <link rel="canonical" href={canonicalUrl || url} />

      {/* Structured Data */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  )
}

export default SEOHead
