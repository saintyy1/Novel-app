import SEOHead from "../components/SEOHead"

const Contact = () => {
  return (
    <div className="bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 py-16">
      <SEOHead
        title="Contact Us - NovlNest"
        description="Get in touch with the NovlNest team. We're here to help with questions, feedback, or support. Contact us for any inquiries about our platform."
        keywords="contact NovlNest, support, help, feedback, customer service, get in touch, NovlNest team"
        url="https://novlnest.com/contact"
        canonicalUrl="https://novlnest.com/contact"
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl">
              <svg
                className="h-10 w-10 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>
          <h1 className="text-5xl font-bold text-white mb-4 bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
            Get in Touch
          </h1>
        </div>

          {/* Contact Information */}
          <div className="flex flex-col gap-4 w-full md:w-2/3 mx-auto">
            {/* Contact Methods */}
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl shadow-2xl p-6">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                <svg className="h-6 w-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                Contact Info
              </h2>
              <div className="flex flex-col gap-4">
                <div className="flex items-start group">
                  <div className="bg-gradient-to-br from-purple-500 to-indigo-500 p-3 rounded-xl mr-4 group-hover:scale-110 transition-transform">
                    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Email</h3>
                    <p className="text-purple-300 font-medium">n0velnest999@gmail.com</p>
                    <p className="text-sm text-gray-400 mt-1">We typically respond within 24 hours</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Response Time */}
            <div className="bg-gradient-to-r from-purple-600/20 to-indigo-600/20 backdrop-blur-lg border border-purple-500/30 rounded-2xl shadow-2xl p-6">
              <div className="text-center">
                <div className="bg-gradient-to-br from-purple-500 to-indigo-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Fast Response</h3>
                <p className="text-purple-200">
                  We pride ourselves on quick response times. Most inquiries are answered within 24 hours, often much
                  sooner!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
  )
}

export default Contact
