import { useState, useEffect, useCallback, useRef } from "react"
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

/* ===== Layout constants ===== */
const SLIDE_WIDTH = 85
const GAP = 4
const SIDE_PEEK = (100 - SLIDE_WIDTH) / 2
const DRAG_THRESHOLD = 50

const HeroBanner = ({ slides, autoSlideInterval = 4000 }: HeroBannerProps) => {
  const navigate = useNavigate()

  /* ===== Desktop ===== */
  const [desktopIndex, setDesktopIndex] = useState(0)

  const nextDesktop = useCallback(() => {
    setDesktopIndex((p) => (p + 1) % slides.length)
  }, [slides.length])

  const prevDesktop = useCallback(() => {
    setDesktopIndex((p) => (p - 1 + slides.length) % slides.length)
  }, [slides.length])

  useEffect(() => {
    if (slides.length <= 1) return
    const id = setInterval(nextDesktop, autoSlideInterval)
    return () => clearInterval(id)
  }, [slides.length, autoSlideInterval, nextDesktop])

  /* ===== Mobile infinite ===== */
  const extendedSlides =
    slides.length > 1
      ? [slides[slides.length - 1], ...slides, slides[0]]
      : slides

  const [mobileIndex, setMobileIndex] = useState(1)
  const [isTransitioning, setIsTransitioning] = useState(true)

  const trackRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const startX = useRef(0)
  const deltaX = useRef(0)
  const pointerId = useRef<number | null>(null)

  /* ===== Auto slide ===== */
  useEffect(() => {
    if (slides.length <= 1) return
    const id = setInterval(() => {
      if (isDragging.current) return
      setIsTransitioning(true)
      setMobileIndex((p) => p + 1)
    }, autoSlideInterval)
    return () => clearInterval(id)
  }, [slides.length, autoSlideInterval])

  /* ===== Infinite reset ===== */
  const handleTransitionEnd = () => {
    if (mobileIndex === extendedSlides.length - 1) {
      setIsTransitioning(false)
      setMobileIndex(1)
    }
    if (mobileIndex === 0) {
      setIsTransitioning(false)
      setMobileIndex(slides.length)
    }
  }

  /* ===== Swipe logic (FIXED) ===== */
  const onPointerDown = (e: React.PointerEvent) => {
    pointerId.current = e.pointerId
    trackRef.current?.setPointerCapture(e.pointerId)

    isDragging.current = true
    startX.current = e.clientX
    deltaX.current = 0
    setIsTransitioning(false)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current || !trackRef.current) return

    deltaX.current = e.clientX - startX.current
    e.preventDefault()

    trackRef.current.style.transform = `translateX(calc(-${
      mobileIndex * (SLIDE_WIDTH + GAP) - SIDE_PEEK
    }% + ${deltaX.current}px))`
  }

  const onPointerUp = () => {
    if (!isDragging.current) return

    if (pointerId.current !== null) {
      trackRef.current?.releasePointerCapture(pointerId.current)
      pointerId.current = null
    }

    isDragging.current = false
    setIsTransitioning(true)

    if (Math.abs(deltaX.current) > DRAG_THRESHOLD) {
      setMobileIndex((p) => (deltaX.current > 0 ? p - 1 : p + 1))
    }

    deltaX.current = 0
  }

  const handleBannerClick = (slide: BannerSlide) => {
    if (slide.externalLink) {
      window.open(slide.externalLink, "_blank", "noopener,noreferrer")
    } else if (slide.novelId) {
      navigate(`/novel/${slide.novelId}`)
    }
  }

  if (!slides.length) return null

  return (
    <div className="relative w-full md:max-w-[1200px] mx-auto md:h-[300px] lg:h-[350px] xl:h-[400px] mt-12">
      {/* Desktop */}
      <div className="hidden md:block relative w-full h-full overflow-hidden rounded-lg">
        {slides.map((s, i) => (
          <div
            key={s.id}
            onClick={() => handleBannerClick(s)}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              i === desktopIndex ? "opacity-100" : "opacity-0"
            }`}
          >
            <img src={s.image} className="w-full h-full object-cover" />
          </div>
        ))}
      </div>

      {/* Mobile infinite carousel */}
      <div className="md:hidden overflow-hidden w-full h-full">
        <div
          ref={trackRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={onPointerUp}
          onTransitionEnd={handleTransitionEnd}
          className="flex gap-4 cursor-grab active:cursor-grabbing"
          style={{
            touchAction: "pan-y",
            transform: `translateX(-${
              mobileIndex * (SLIDE_WIDTH + GAP) - SIDE_PEEK
            }%)`,
            transition: isTransitioning ? "transform 600ms ease" : "none",
          }}
        >
          {extendedSlides.map((s, i) => (
            <div
              key={`${s.id}-${i}`}
              className="flex-shrink-0 w-[85%]"
              onClick={() => handleBannerClick(s)}
            >
              <img
                src={s.image}
                className="w-full h-full rounded-lg object-cover"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Desktop arrows */}
      <button
        onClick={prevDesktop}
        className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 bg-white p-1 rounded-full"
      >
        <ChevronLeft />
      </button>
      <button
        onClick={nextDesktop}
        className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 bg-white p-1 rounded-full"
      >
        <ChevronRight />
      </button>
    </div>
  )
}

export default HeroBanner
