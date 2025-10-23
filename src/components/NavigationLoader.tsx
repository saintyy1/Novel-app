import { useEffect, useState } from "react"
import { useLocation } from "react-router-dom"

const NavigationLoader = () => {
  const [loading, setLoading] = useState(false)
  const location = useLocation()

  useEffect(() => {
    // Show loader when location changes
    setLoading(true)

    // Hide loader after a short delay to allow page to start rendering
    const timer = setTimeout(() => {
      setLoading(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [location.pathname, location.search])

  if (!loading) return null

  return (
    <div className="fixed top-0 left-0 w-full h-1 z-[9999] bg-transparent">
      <div className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 animate-loading-bar shadow-lg"></div>
    </div>
  )
}

export default NavigationLoader

