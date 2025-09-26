"use client"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

const PromotionSection = () => {
  const [showLearnMore, setShowLearnMore] = useState(false)

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (showLearnMore) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [showLearnMore])

  return (
    <>
      <section className="py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="bg-gradient-to-r from-purple-600 to-violet-700 rounded-2xl shadow-xl overflow-hidden mx-4 sm:mx-0">
          <div className="px-6 py-8 md:py-12 md:px-12 text-center text-white relative">
            <div className="absolute inset-0 bg-black opacity-10 rounded-2xl"></div>
            <div className="relative">
              <div className="flex flex-col sm:flex-row items-center justify-center mb-4 gap-3">
  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
    <path
      fillRule="evenodd"
      d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z"
      clipRule="evenodd"
    />
  </svg>
  <h2 className="text-2xl md:text-3xl font-bold text-center sm:text-left">Want to promote your novel?</h2>
</div>
          
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <button
                  onClick={() => setShowLearnMore(true)}
                  className="px-6 py-3 bg-white text-purple-600 rounded-full font-semibold hover:bg-purple-50 transition duration-300 shadow-lg"
                >
                  Learn More
                </button>
                <Link
                  to="/promote"
                  className="px-6 py-3 bg-purple-800 text-white rounded-full font-semibold hover:bg-purple-900 transition duration-300 shadow-lg border border-purple-600"
                >
                  View Pricing
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Learn More Modal */}
      {showLearnMore && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white">Promote Your Novel</h3>
                <button
                  onClick={() => setShowLearnMore(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6 text-gray-300">
                <div>
                  <h4 className="text-lg font-semibold text-white mb-3 flex items-center">
                    <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3">
                      1
                    </span>
                    Steps to Promote
                  </h4>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <span className="text-purple-400 mr-2">•</span>
                      Select your novel
                    </li>
                    <li className="flex items-start">
                      <span className="text-purple-400 mr-2">•</span>
                      Choose your promotion duration (N1,500 for 1 month or N2,500 for 2 months)
                    </li>
                    <li className="flex items-start">
                      <span className="text-purple-400 mr-2">•</span>
                      Complete payment for your selected package
                    </li>
                    <li className="flex items-start">
                      <span className="text-purple-400 mr-2">•</span>
                      Your novel will be featured in promoted sections
                    </li>
                    <li className="flex items-start">
                      <span className="text-purple-400 mr-2">•</span>
                      Track your increased views and engagement
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-white mb-3 flex items-center">
                    <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3">
                      2
                    </span>
                    Tips for Success
                  </h4>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <span className="text-green-400 mr-2">✓</span>
                        Use high-quality, eye-catching
                      Cover Image that represents your story
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-400 mr-2">✓</span>
                        Choose a memorable title that captures
                      the essence of your novel
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-400 mr-2">✓</span>
                       Write a captivating summary that
                      hooks readers
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-400 mr-2">✓</span>
                       Tag your novel with accurate genres to
                      reach the right audience
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-400 mr-2">✓</span>
                       Ensure your chapters are well-written and
                      engaging
                    </li>
                  </ul>
                </div>

                <div className="bg-gray-800 rounded-lg p-4">
                  <h5 className="text-white font-semibold mb-2">💡 Pro Tip</h5>
                  <p className="text-sm">
                    Promoted novels get up to 10x more visibility and are featured in special sections throughout the
                    platform. The better your cover and description, the higher your click-through rate will be!
                  </p>
                </div>
              </div>

              <div className="mt-8 flex justify-center">
                <Link
                  to="/promote"
                  onClick={() => setShowLearnMore(false)}
                  className="px-8 py-3 bg-purple-600 text-white rounded-full font-semibold hover:bg-purple-700 transition duration-300"
                >
                  Get Started with Promotion
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default PromotionSection
