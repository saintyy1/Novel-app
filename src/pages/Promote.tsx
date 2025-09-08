"use client"
import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { db } from "../firebase/config"
import { collection, query, where, getDocs } from "firebase/firestore"


const Promote = () => {
  const { currentUser, loading } = useAuth()
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [selectedBook, setSelectedBook] = useState<any | null>(null)
  const [currentStep, setCurrentStep] = useState<"select-book" | "choose-plan">("select-book")
  const [userBooks, setUserBooks] = useState<any[]>([])
  const [loadingBooks, setLoadingBooks] = useState(true)
  const [processingPayment, setProcessingPayment] = useState(false)

  useEffect(() => {
    const fetchUserBooks = async () => {
      if (!currentUser) return

      try {
        const q = query(collection(db, "novels"), where("authorId", "==", currentUser.uid), where("isPromoted", "==", false))
        const querySnapshot = await getDocs(q)
        const books = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setUserBooks(books)
      } catch (error) {
        console.error("Error fetching user books:", error)
      } finally {
        setLoadingBooks(false)
      }
    }

    if (currentUser) {
      fetchUserBooks()
    }
  }, [currentUser])

  const plans = [
    {
      id: "1-month",
      name: "Essential Boost",
      price: 1500,
      duration: "30 days",
      features: [
        "Promoted sections feature",
        "Increased visibility in search",
        "Priority in carousels",
        "Email support",
      ],
      popular: false,
      icon: "🚀",
    },
    {
      id: "2-months",
      name: "Premium Growth",
      price: 2500,
      duration: "60 days",
      features: [
        "Everything in Essential Boost",
        "Extended promotion period",
        "Higher priority placement",
        "Priority customer support",
      ],
      popular: false,
      icon: "⭐",
    },
  ]

  const handleBookSelect = (book: any) => {
    setSelectedBook(book)
    setCurrentStep("choose-plan")
  }

  const goBackToBookSelection = () => {
    setCurrentStep("select-book")
    setSelectedPlan(null)
  }

  const getFirebaseDownloadUrl = (url: string) => {
    if (!url || !url.includes("firebasestorage.app")) {
      return url
    }

    try {
      // Convert Firebase Storage URL to download URL format that bypasses CORS
      const urlParts = url.split("/")
      const bucketName = urlParts[3] // Extract bucket name
      const filePath = urlParts.slice(4).join("/") // Extract file path

      // Create download URL format that doesn't require CORS
      return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(filePath)}?alt=media`
    } catch (error) {
      console.log(`Error converting Firebase URL: ${error}`)
      return url
    }
  }

  const handlePayment = async () => {
    if (!selectedPlan || !selectedBook || !currentUser) return

    setProcessingPayment(true)

    try {
      const selectedPlanData = plans.find((p) => p.id === selectedPlan)
      const callbackUrl = "http://localhost:5173/PaymentCallback"
      const bookId = selectedBook.id
      console.log(bookId)

      // Initialize payment with Paystack
      const response = await fetch("https://paystack-backend-six.vercel.app/api/index?route=initialize-transaction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: currentUser.email,
          amount: selectedPlanData?.price,
          planId: selectedPlan,
          bookId: bookId,
          userId: currentUser.uid,
          callback_url: callbackUrl,
        }),
      })
      console.log(bookId)
      const data = await response.json()
      console.log("Payment initialization response:", data)

      if (data.status) {
        // Redirect to Paystack payment page
        window.location.href = data.authorization_url
      } else {
        alert("Failed to initialize payment. Please try again.")
      }
    } catch (error) {
      console.error("Payment error:", error)
      alert("An error occurred. Please try again.")
    } finally {
      setProcessingPayment(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-violet-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-violet-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Please Sign In</h2>
          <p className="text-xl text-gray-600 mb-8">You need to be signed in to promote your novels</p>
          <Link
            to="/login"
            className="bg-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-violet-100">
      <div className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-violet-700 to-purple-800">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 to-violet-900/20"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=60 height=60 viewBox=0 0 60 60 xmlns=http://www.w3.org/2000/svg%3E%3Cg fill=none fillRule=evenodd%3E%3Cg fill=%23ffffff fillOpacity=0.05%3E%3Ccircle cx=30 cy=30 r=2/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-30"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-15 pb-7">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-6 py-3 mb-8 border border-white/20">
              <span className="text-2xl">📚</span>
              <span className="text-white/90 font-medium">New Feature Launch</span>
            </div>

            <h1 className="text-6xl md:text-7xl font-black text-white mb-8 text-balance leading-tight">
              {currentStep === "select-book" ? (
                <>
                  Choose Your Novel to
                  <span className="bg-gradient-to-r from-yellow-300 to-orange-400 bg-clip-text text-transparent">
                    {" "}
                    Promote
                  </span>
                </>
              ) : (
                <>
                  Promote Your Novel to
                  <span className="bg-gradient-to-r from-yellow-300 to-orange-400 bg-clip-text text-transparent">
                    {" "}
                    More Readers
                  </span>
                </>
              )}
            </h1>

            <p className="text-xl md:text-2xl text-purple-100 max-w-4xl mx-auto mb-12 text-pretty leading-relaxed">
              {currentStep === "select-book"
                ? "Select which of your published novels you'd like to promote to reach more readers"
                : "Get your novel featured in our promoted sections and reach readers who are actively looking for their next great read"}
            </p>

            <div className="flex items-center justify-center gap-4 mb-12">
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-full ${currentStep === "select-book" ? "bg-white/20 text-white" : "bg-white/10 text-white/60"}`}
              >
                <span className="w-6 h-6 rounded-full bg-white text-purple-600 flex items-center justify-center text-sm font-bold">
                  1
                </span>
                <span className="font-medium">Select Book</span>
              </div>
              <div className="w-8 h-0.5 bg-white/30"></div>
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-full ${currentStep === "choose-plan" ? "bg-white/20 text-white" : "bg-white/10 text-white/60"}`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${currentStep === "choose-plan" ? "bg-white text-purple-600" : "bg-white/30 text-white/60"}`}
                >
                  2
                </span>
                <span className="font-medium">Choose Plan</span>
              </div>
            </div>

            {currentStep === "select-book" && (
              <div className="py-8">
                <div className="text-center mb-16">
                  <div className="inline-flex items-center gap-2 bg-purple-100 rounded-full px-6 py-3 mb-6">
                    <span className="text-purple-600 font-semibold">📖 Your Published Novels</span>
                  </div>
                  <h2 className="text-5xl font-black text-gray-900 mb-6">Select a Book to Promote</h2>
                  <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
                    Choose from your published novels to start promoting and reaching more readers
                  </p>
                </div>

                {loadingBooks ? (
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <p className="text-lg text-gray-600">Loading your novels...</p>
                  </div>
                ) : userBooks.length === 0 ? (
                  <div className="text-center">
                    <div className="text-6xl mb-6">📚</div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">No Published Novels Found</h3>
                    <p className="text-lg text-gray-300 mb-8">You need to publish a novel before you can promote it</p>
                    <Link
                      to="/submit"
                      className="bg-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
                    >
                      Write Your First Novel
                    </Link>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {userBooks.map((book) => (
                      <div
                        key={book.id}
                        className="bg-white rounded-3xl p-8 border-2 border-gray-200 hover:border-purple-300 hover:shadow-xl transition-all duration-300 cursor-pointer group"
                        onClick={() => handleBookSelect(book)}
                      >
                        <div className="text-center mb-6">
                          <img
                            src={getFirebaseDownloadUrl(book.coverSmallImage || book.coverImage || "/placeholder.svg")}
                            alt={book.title}
                            className="w-32 h-48 mx-auto rounded-xl shadow-lg group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>

                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-purple-600">
                                {Array.isArray(book.chapters) ? book.chapters.length : 0}
                                </div>
                                <div className="text-sm text-gray-500">Chapters</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-purple-600">
                                {(book.views || 0).toLocaleString()}
                                </div>
                                <div className="text-sm text-gray-500">Views</div>
                            </div>
                            </div>

                          <button className="w-full py-3 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl font-bold hover:shadow-lg transition-all duration-300 group-hover:scale-105">
                            Promote This Novel
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {currentStep === "choose-plan" && (
              <>
                {selectedBook && (
                  <div className="py-12">
                    <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-200 max-w-4xl mx-auto">
                      <div className="flex items-center gap-2 mb-4">
                        <button
                          onClick={goBackToBookSelection}
                          className="text-purple-600 hover:text-purple-700 font-medium flex items-center gap-2"
                        >
                          ← Change Book
                        </button>
                      </div>
                      <div className="flex items-center gap-6">
                        <img
                          src={getFirebaseDownloadUrl(selectedBook.coverSmallImage || selectedBook.coverImage || "/placeholder.svg")}
                          alt={selectedBook.title}
                          className="w-20 h-30 rounded-lg shadow-md"
                        />
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900 mb-2">{selectedBook.title}</h3>
                          <div className="flex gap-2 mb-2">
                            {selectedBook.genres.map((genre: string, index: number) => (
                              <span
                                key={index}
                                className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium"
                              >
                                {genre}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="py-8">
                  <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 bg-purple-100 rounded-full px-6 py-3 mb-6">
                      <span className="text-purple-600 font-semibold">💎 Promotion Plans</span>
                    </div>
                    <h2 className="text-5xl font-black text-gray-900 mb-6">Choose Your Plan</h2>
                    <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
                      Select the perfect promotion package to boost your novel's visibility and connect with more
                      readers
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                    {plans.map((plan) => (
                      <div
                        key={plan.id}
                        className={`relative bg-white rounded-3xl p-5 border-2 transition-all duration-500 cursor-pointer hover:shadow-2xl group ${
                          selectedPlan === plan.id
                            ? "border-purple-500 shadow-2xl shadow-purple-500/25 scale-105 bg-gradient-to-br from-white to-purple-50"
                            : "border-gray-200 hover:border-purple-300 hover:scale-102"
                        }`}
                        onClick={() => setSelectedPlan(plan.id)}
                      >

                        <div className="text-center mb-10">
                          <div className="text-6xl mb-6 group-hover:scale-110 transition-transform duration-300">
                            {plan.icon}
                          </div>
                          <h3 className="text-3xl font-black text-gray-900 mb-4">{plan.name}</h3>
                          <div className="flex items-center justify-center gap-3 mb-3">
                            <div className="text-5xl font-black bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
                              ₦{plan.price}
                            </div>
                          </div>
                          <p className="text-gray-600 text-lg font-medium">{plan.duration} of premium promotion</p>
                        </div>

                        <ul className="space-y-5 mb-10">
                          {plan.features.map((feature, index) => (
                            <li key={index} className="flex items-start gap-4">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-violet-500 flex items-center justify-center mt-1 flex-shrink-0">
                                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </div>
                              <span className="text-gray-700 font-medium text-lg">{feature}</span>
                            </li>
                          ))}
                        </ul>

                        <button
                          className={`w-full py-5 rounded-2xl font-bold text-xl transition-all duration-300 ${
                            selectedPlan === plan.id
                              ? "bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-xl shadow-purple-500/30 hover:shadow-2xl transform hover:scale-105"
                              : "bg-gray-100 text-gray-600 hover:bg-gradient-to-r hover:from-purple-600 hover:to-violet-600 hover:text-white hover:shadow-xl"
                          }`}
                        >
                          {selectedPlan === plan.id ? "✓ Plan Selected" : "Choose This Plan"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="py-8">
              <div className="bg-gradient-to-br from-purple-600 via-violet-700 to-purple-800 rounded-3xl p-8 text-center overflow-hidden">

                <div className="relative z-10">
                  <div className="text-6xl mb-6">🚀</div>
                  <h2 className="text-4xl font-black text-white mb-6">Ready to Promote Your Novel?</h2>
                  <p className="text-xl text-purple-100 mb-10 max-w-3xl mx-auto leading-relaxed">
                    Start promoting your novel today and reach readers who are actively looking for their next great
                    read
                  </p>

                  <div className="space-y-6">
                    <button
                      disabled={!selectedPlan || processingPayment}
                      onClick={handlePayment}
                      className={`px-6 py-6 rounded-2xl font-black text-2xl transition-all duration-300 ${
                        selectedPlan && !processingPayment
                          ? "bg-white text-purple-700 hover:bg-gray-100 shadow-2xl hover:shadow-3xl transform hover:scale-105 hover:-translate-y-1"
                          : "bg-white/20 text-white/50 cursor-not-allowed"
                      }`}
                    >
                      {processingPayment
                        ? "🔄 Processing..."
                        : selectedPlan
                          ? "🚀 Launch My Promotion Now"
                          : "👆 Select a Plan Above to Continue"}
                    </button>

                    <div className="flex justify-center">
                      <Link to="/" className="text-purple-200 hover:text-white transition-colors text-lg font-medium">
                        ← Return to Home
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="py-8">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-black text-gray-900 mb-6">Questions? We've Got Answers</h2>
                <p className="text-xl text-gray-300">Everything you need to know about promoting your novel</p>
              </div>

              <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
                <div className="space-y-8">
                  <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
                    <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                      <span className="text-2xl">⚡</span>
                      How quickly will my novel be featured?
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      Your novel will be featured in our promoted sections within 24 hours of payment confirmation and
                      will remain there for the duration of your selected plan.
                    </p>
                  </div>

                  <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
                    <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                      <span className="text-2xl">🎯</span>
                      Where will my novel be promoted?
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      Your novel will appear in dedicated promoted sections, get priority placement in search results,
                      and be featured in our carousel rotations for maximum visibility.
                    </p>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
                    <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                      <span className="text-2xl">📊</span>
                      Can I track my promotion performance?
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      Yes! You'll get access to analytics showing your novel's views, engagement metrics, and reader
                      interactions during the promotion period.
                    </p>
                  </div>

                  <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
                    <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                      <span className="text-2xl">💯</span>
                      What if I need help with my promotion?
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      Our support team is here to help! Contact us anytime during your promotion period and we'll assist
                      you with any questions or optimization needs.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Promote
