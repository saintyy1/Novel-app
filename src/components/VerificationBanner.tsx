import { useState, useEffect } from "react"
import { useAuth } from "../context/AuthContext"

const VerificationBanner = () => {
    const { currentUser, sendEmailVerificationLink } = useAuth()
    const [loading, setLoading] = useState(false)
    const [sent, setSent] = useState(false)
    const [timeLeft, setTimeLeft] = useState<string>("")

    useEffect(() => {
        if (!currentUser?.createdAt || currentUser?.isVerified) return

        const updateTimer = () => {
            const createdDate = new Date(currentUser.createdAt!).getTime()
            const now = new Date().getTime()
            const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000
            const diff = GRACE_PERIOD_MS - (now - createdDate)

            if (diff <= 0) {
                setTimeLeft("Expired")
            } else {
                const hours = Math.floor(diff / (1000 * 60 * 60))
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
                setTimeLeft(`${hours}h ${minutes}m`)
            }
        }

        updateTimer()
        const timer = setInterval(updateTimer, 60000)

        return () => clearInterval(timer)
    }, [currentUser])

    if (!currentUser || currentUser.isVerified) return null

    const handleResend = async () => {
        if (loading || sent) return
        setLoading(true)
        try {
            await sendEmailVerificationLink()
            setSent(true)
            setTimeout(() => setSent(false), 5000)
        } catch (error) {
            console.error("Resend error:", error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="mt-12 mb-4 bg-gradient-to-r from-amber-600/20 via-orange-600/20 to-amber-600/20 border-y border-amber-500/20 py-3 px-4 sm:px-6 lg:px-8 rounded-xl max-w-7xl mx-auto shadow-2xl backdrop-blur-sm">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/20 rounded-xl shadow-inner">
                        <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-white">
                            Verify your email to keep your account active
                        </p>
                        {timeLeft && (
                            <p className="text-xs text-amber-400 mt-0.5 font-semibold">
                                Grace period ends in: {timeLeft}
                            </p>
                        )}
                    </div>
                </div>
                <button
                    onClick={handleResend}
                    disabled={loading || sent}
                    className="relative group overflow-hidden px-6 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/30 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-amber-500/20 active:scale-95"
                >
                    <span className="relative z-10 text-xs font-bold text-black uppercase tracking-wider">
                        {loading ? "Sending link..." : sent ? "Verification sent!" : "Resend Link"}
                    </span>
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                </button>
            </div>
        </div>
    )
}

export default VerificationBanner
