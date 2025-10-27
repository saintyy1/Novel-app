"use client"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { doc, getDoc } from "firebase/firestore"
import { db } from "../firebase/config"
import { sendPromotionApprovedNotification } from "../services/notificationService"

const PaymentCallback = () => {
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading")
  const [message, setMessage] = useState("")
   const params = new URLSearchParams(window.location.search);
        
  useEffect(() => {
    const verifyPayment = async () => {
      const reference = params.get("reference");

      if (!reference) {
        setStatus("failed")
        setMessage("No payment reference found")
        return
      }

      try {
        const response = await fetch("https://paystack-backend-six.vercel.app/api/index?route=verify-payment", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reference }),
        })

        const data = await response.json()

        if (data.status) {
          setStatus("success")
          setMessage("Your novel has been successfully promoted!")
          
          // Send notification to the user
          let bookId = data.bookId
          let userId = data.userId
          let planId = data.planId
          let novelTitle = null
          let planName = null
          let planDuration = null
          
          // If backend doesn't return the data, use localStorage fallback
          if (!bookId || !userId) {
            const pendingPayment = localStorage.getItem('pendingPromotionPayment')
            if (pendingPayment) {
              const paymentData = JSON.parse(pendingPayment)
              bookId = paymentData.bookId
              userId = paymentData.userId
              planId = paymentData.planId
              novelTitle = paymentData.novelTitle
              planName = paymentData.planName
              planDuration = paymentData.planDuration
            }
          }
          
          if (bookId && userId) {
            try {
              // If we don't have novel title from localStorage, fetch from Firestore
              if (!novelTitle) {
                const novelDoc = await getDoc(doc(db, "novels", bookId))
                if (novelDoc.exists()) {
                  novelTitle = novelDoc.data().title
                }
              }
              
              // Determine plan details if not from localStorage
              if (!planName || !planDuration) {
                planDuration = planId === "1-month" ? "30 days" : "60 days"
                planName = planId === "1-month" ? "Essential Boost" : "Premium Growth"
              }
              
              if (novelTitle && planName && planDuration) {
                await sendPromotionApprovedNotification(
                  userId,
                  bookId,
                  novelTitle,
                  planName,
                  planDuration
                )
              }
              
              // Clear localStorage after successful notification
              localStorage.removeItem('pendingPromotionPayment')
            } catch (notificationError) {
              console.error("Error sending promotion notification:", notificationError)
              // Don't fail the whole process if notification fails
            }
          }
        } else {
          setStatus("failed")
          setMessage(data.message || "Payment verification failed")
          // Clear localStorage on failed payment
          localStorage.removeItem('pendingPromotionPayment')
        }
      } catch (error) {
        setStatus("failed")
        setMessage("An error occurred while verifying payment")
      }
    }

    verifyPayment()
  }, [params])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-violet-100 flex items-center justify-center">
      <div className="bg-white rounded-3xl p-16 shadow-2xl text-center max-w-2xl mx-auto">
        {status === "loading" && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-6"></div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Verifying Payment...</h2>
            <p className="text-lg text-gray-600">Please wait while we confirm your payment</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="text-6xl mb-6">🎉</div>
            <h2 className="text-3xl font-bold text-green-600 mb-4">Payment Successful!</h2>
            <p className="text-lg text-gray-600 mb-8">{message}</p>
            <div className="space-y-4">
              <Link to="/" className="block text-purple-600 hover:text-purple-700 font-medium">
                Return to Home
              </Link>
            </div>
          </>
        )}

        {status === "failed" && (
          <>
            <div className="text-6xl mb-6">❌</div>
            <h2 className="text-3xl font-bold text-red-600 mb-4">Payment Failed</h2>
            <p className="text-lg text-gray-600 mb-8">{message}</p>
            <div className="space-y-4">
              <Link
                to="/promote"
                className="block bg-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
              >
                Try Again
              </Link>
              <Link to="/" className="block text-purple-600 hover:text-purple-700 font-medium">
                Return to Home
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default PaymentCallback
