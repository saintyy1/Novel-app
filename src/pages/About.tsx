import { Link } from "react-router-dom"

const About = () => {
  return (
    <div className="min-h-screen bg-gray-900 py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-md">
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
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">About NovelNest</h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            A platform where stories come to life and readers discover their next favorite adventure.
          </p>
        </div>

        {/* Main Content */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 mb-12">
          <div className="prose dark:prose-invert max-w-none">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Our Story</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              NovelNest was born from a simple belief: every story deserves to be told, and every reader deserves to
              find stories that speak to their soul. Founded in 2025, we set out to create a platform that bridges the
              gap between aspiring writers and passionate readers.
            </p>

            <p className="text-gray-600 dark:text-gray-300 mb-6">
              In a world where traditional publishing can be challenging to navigate, NovelNest provides a welcoming
              space for writers to share their creativity and for readers to discover fresh, diverse voices. Whether
              you're crafting your first short story or your tenth novel, our platform is designed to support your
              journey.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 mt-8">Our Mission</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              We believe that storytelling is one of humanity's most powerful tools for connection, understanding, and
              growth. Our mission is to democratize publishing and make it easier for writers to reach their audience
              while helping readers discover stories that inspire, entertain, and transform.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 mt-8">What We Offer</h2>
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-300 mb-3">For Writers</h3>
                <ul className="text-gray-600 dark:text-gray-300 space-y-2">
                  <li>• Easy-to-use publishing platform</li>
                  <li>• Chapter-by-chapter publishing</li>
                  <li>• Reader engagement tools</li>
                  <li>• Analytics and insights</li>
                  <li>• Community support</li>
                </ul>
              </div>
              <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-indigo-900 dark:text-indigo-300 mb-3">For Readers</h3>
                <ul className="text-gray-600 dark:text-gray-300 space-y-2">
                  <li>• Vast library of original stories</li>
                  <li>• Multiple genres and styles</li>
                  <li>• Personalized recommendations</li>
                  <li>• Interactive reading experience</li>
                  <li>• Direct connection with authors</li>
                </ul>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 mt-8">Our Values</h2>
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="text-center">
                <div className="bg-purple-100 dark:bg-purple-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="h-8 w-8 text-purple-600 dark:text-purple-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Inclusivity</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  We welcome stories from all backgrounds, cultures, and perspectives.
                </p>
              </div>
              <div className="text-center">
                <div className="bg-indigo-100 dark:bg-indigo-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="h-8 w-8 text-indigo-600 dark:text-indigo-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Innovation</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  We continuously evolve our platform to serve our community better.
                </p>
              </div>
              <div className="text-center">
                <div className="bg-green-100 dark:bg-green-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="h-8 w-8 text-green-600 dark:text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Community</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  We foster a supportive environment for writers and readers alike.
                </p>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 mt-8">Join Our Community</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Whether you're a writer looking to share your stories or a reader seeking your next great adventure,
              NovelNest is here for you. Join thousands of storytellers and story-lovers who have made NovelNest their
              literary home.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <Link
                to="/register"
                className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 transition-colors"
              >
                Start Writing Today
              </Link>
              <Link
                to="/novels"
                className="inline-flex items-center justify-center px-6 py-3 border border-purple-300 dark:border-purple-600 text-base font-medium rounded-md text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
              >
                Explore Stories
              </Link>
            </div>
          </div>
        </div>

        {/* Contact Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">Get in Touch</h2>
          <p className="text-gray-600 dark:text-gray-300 text-center mb-6">
            Have questions, suggestions, or just want to say hello? We'd love to hear from you.
          </p>
          <div className="flex justify-center">
            <Link
              to="/contact"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default About
