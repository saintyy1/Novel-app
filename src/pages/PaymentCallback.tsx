"use client"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

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
        } else {
          setStatus("failed")
          setMessage(data.message || "Payment verification failed")
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
