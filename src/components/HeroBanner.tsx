import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface BannerSlide {
  id: string
  image: string
  novelId?: string
  externalLink?: string
  title?: string
  alt?: string
}

interface HeroBannerProps {
  slides: BannerSlide[]
  autoSlideInterval?: number
}

const HeroBanner = ({ slides, autoSlideInterval = 4000 }: HeroBannerProps) => {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const navigate = useNavigate()

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % slides.length)
  }, [slides.length])

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
  }, [slides.length])

  const goToSlide = (index: number) => {
    setCurrentSlide(index)
  }

  const handleBannerClick = () => {
    const slide = slides[currentSlide]
    if (slide?.externalLink) {
      window.open(slide.externalLink, '_blank', 'noopener,noreferrer')
    } else if (slide?.novelId) {
      navigate(`/novel/${slide.novelId}`)
    }
  }

  useEffect(() => {
    if (!isHovered && slides.length > 1) {
      const timer = setInterval(nextSlide, autoSlideInterval)
      return () => clearInterval(timer)
    }
  }, [currentSlide, isHovered, autoSlideInterval, nextSlide, slides.length])

  if (!slides || slides.length === 0) {
    return null
  }

  return (
    <div
      className="relative w-full max-w-[95%] sm:max-w-[90%] md:max-w-[1200px] mx-auto h-[180px] xs:h-[200px] sm:h-[250px] md:h-[300px] lg:h-[350px] xl:h-[400px] group mt-12 px-2 sm:px-0"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Banner Images */}
      <div className="relative w-full h-full overflow-hidden rounded-lg">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0"
            }`}
          >
            <div
              onClick={handleBannerClick}
              className="relative w-full h-full cursor-pointer"
            >
              <img
                src={slide.image}
                alt={slide.alt || slide.title || `Banner ${index + 1}`}
                className="w-full h-full object-cover object-center"
              />
              {/* Optional overlay gradient for better text visibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            </div>
          </div>
        ))}

        {/* Navigation Arrows */}
      {slides.length > 1 && (
        <>
          {/* Left Arrow */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              prevSlide()
            }}
            className="hidden md:flex absolute -left-0 top-1/2 -translate-y-1/2 z-20 bg-white cursor-pointer text-black md:p-1 rounded-full transition-all duration-300 items-center justify-center"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-6 h-6 lg:w-7 lg:h-7" />
          </button>

          {/* Right Arrow */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              nextSlide()
            }}
            className="hidden md:flex absolute -right-0 top-1/2 -translate-y-1/2 z-20 bg-white cursor-pointer text-black md:p-1 rounded-full transition-all duration-300 items-center justify-center"
            aria-label="Next slide"
          >
            <ChevronRight className="w-6 h-6 lg:w-7 lg:h-7" />
          </button>
        </>
      )}
      </div>
    </div>
  )
}

export default HeroBanner
