import SEOHead from "../components/SEOHead"

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-gray-900 py-16">
      <SEOHead
        title="Terms of Service - NovlNest"
        description="Read NovlNest's Terms of Service to understand the rules and guidelines for using our platform. Learn about user responsibilities and platform policies."
        keywords="terms of service, user agreement, NovlNest terms, platform rules, user guidelines, legal terms"
        url="https://novlnest.com/terms-of-service"
        canonicalUrl="https://novlnest.com/terms-of-service"
      />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white mb-4">Terms of Service</h1>
          <p className="text-xl text-gray-300">
            Last updated: August 25, 2025
          </p>
        </div>

        {/* Content */}
        <div className="bg-gray-800 rounded-xl shadow-md p-8">
          <div className="prose-invert max-w-none">
            <h2 className="text-2xl font-bold text-white mb-4">Agreement to Terms</h2>
            <p className="text-gray-300 mb-6">
              By accessing and using Novlnest, you accept and agree to be bound by the terms and
              provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>

            <h2 className="text-2xl font-bold text-white mb-4 mt-8">Description of Service</h2>
            <p className="text-gray-300 mb-6">
              Novlnest is a platform that allows users to publish, share, and read original novels and stories. Our
              service includes features for content creation, community interaction, and content discovery.
            </p>

            <h2 className="text-2xl font-bold text-white mb-4 mt-8">User Accounts</h2>
            <p className="text-gray-300 mb-4">
              To access certain features of our service, you must create an account. You agree to:
            </p>
            <ul className="list-disc list-inside text-gray-300 mb-6 space-y-2">
              <li>Provide accurate, current, and complete information during registration</li>
              <li>Maintain and promptly update your account information</li>
              <li>Maintain the security of your password and account</li>
              <li>Accept responsibility for all activities that occur under your account</li>
              <li>Notify us immediately of any unauthorized use of your account</li>
            </ul>

            <h2 className="text-2xl font-bold text-white mb-4 mt-8">User Content & Rights</h2>

            <p className="text-gray-300 mb-6">
              <span className="font-bold">Ownership: </span>
              You retain full ownership of any content (stories, novels, comments, or other creative work) you publish on NovlNest.
            </p>
            <div className="text-gray-300 mb-6">
              <p className="font-bold mb-4">License to NovlNest: </p>
                <ul className="list-disc list-inside text-gray-300 mb-6 space-y-2">
                  <li>By posting your work, you grant NovlNest a non-exclusive, revocable, worldwide license to host, display, and share your content only on the NovlNest platform and its related services.</li>
                  <li>This license does not give NovlNest permission to sell, republish, or license your work outside the platform.</li>
                  <li>You may remove your content at any time, and the license will end once it is deleted.</li>
                </ul>
            </div>
            <p className="text-gray-300 mb-6">
              <span className="font-bold">Publishing Rights Disclaimer: </span>
                Posting your work on NovlNest may count as a form of publication. This can affect your ability to sell “first publication rights” to traditional publishers. If you plan to submit your work to publishers, you should carefully consider whether to share the full text on NovlNest.
            </p>

            <h3 className="text-xl font-semibold text-white mb-4">Content Standards</h3>
            <p className="text-gray-300 mb-4">
              All content must comply with our community standards. You agree not to post content that:
            </p>
            <ul className="list-disc list-inside text-gray-300 mb-6 space-y-2">
              <li>Violates any applicable laws or regulations</li>
              <li>Infringes on intellectual property rights of others</li>
              <li>Contains hate speech, harassment, or discriminatory content</li>
              <li>Includes explicit sexual content involving minors</li>
              <li>Promotes violence or illegal activities</li>
              <li>Contains spam, malware, or malicious code</li>
              <li>Violates privacy rights of others</li>
            </ul>

            <h2 className="text-2xl font-bold text-white mb-6 mt-8">Intellectual Property</h2>
            <p className="text-gray-300 mb-6">
              All elements of the NovlNest platform (design, features, branding, and original site content) are owned by NovlNest and protected under copyright and trademark laws. This does not apply to user-submitted stories.
            </p>

            <h2 className="text-2xl font-bold text-white mb-6 mt-8">Prohibited Uses</h2>
            <p className="text-gray-300 mb-4">You may not use our service:</p>
            <ul className="list-disc list-inside text-gray-300 mb-6 space-y-2">
              <li>For any unlawful purpose or to solicit others to perform unlawful acts</li>
              <li>
                To violate any international, federal, provincial, or state regulations, rules, laws, or local
                ordinances
              </li>
              <li>
                To infringe upon or violate our intellectual property rights or the intellectual property rights of
                others
              </li>
              <li>To harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate</li>
              <li>To submit false or misleading information</li>
              <li>To upload or transmit viruses or any other type of malicious code</li>
              <li>To spam, phish, pharm, pretext, spider, crawl, or scrape</li>
              <li>For any obscene or immoral purpose</li>
              <li>To interfere with or circumvent the security features of the service</li>
            </ul>

            <h2 className="text-2xl font-bold text-white mb-6 mt-8">Content Moderation</h2>
            <p className="text-gray-300 mb-6">
              We reserve the right to review, moderate, and remove content that violates our terms of service or
              community guidelines. We may also suspend or terminate accounts that repeatedly violate our policies.
            </p>

            <h2 className="text-2xl font-bold text-white mb-6 mt-8">Privacy Policy</h2>
            <p className="text-gray-300 mb-6">
              Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the
              service, to understand our practices.
            </p>

            <h2 className="text-2xl font-bold text-white mb-6 mt-8">Disclaimers</h2>
            <p className="text-gray-300 mb-6">
              The information on this website is provided on an "as is" basis. To the fullest extent permitted by law,
              this Company excludes all representations, warranties, conditions and terms whether express or implied,
              statutory or otherwise.
            </p>

            <h2 className="text-2xl font-bold text-white mb-6 mt-8">Limitation of Liability</h2>
            <p className="text-gray-300 mb-6">
              In no event shall Novlnest, nor its directors, employees, partners, agents, suppliers, or affiliates, be
              liable for any indirect, incidental, punitive, consequential, or special damages arising out of or related
              to your use of the service.
            </p>

            <h2 className="text-2xl font-bold text-white mb-6 mt-8">Termination</h2>
            <p className="text-gray-300 mb-6">
              We may terminate or suspend your account and bar access to the service immediately, without prior notice
              or liability, under our sole discretion, for any reason whatsoever, including but not limited to a breach
              of the Terms.
            </p>

            <h2 className="text-2xl font-bold text-white mb-6 mt-8">Governing Law</h2>
            <p className="text-gray-300 mb-6">
              These Terms shall be interpreted and governed by the laws of the United States, without regard to its
              conflict of law provisions. Our failure to enforce any right or provision of these Terms will not be
              considered a waiver of those rights.
            </p>

            <h2 className="text-2xl font-bold text-white mb-6 mt-8">Changes to Terms</h2>
            <p className="text-gray-300 mb-6">
              We reserve the right, at our sole discretion, to modify or replace these Terms from time to time. Material changes will be communicated to users in advance.
            </p>

            <h2 className="text-2xl font-bold text-white mb-6 mt-8">Contact Information</h2>
            <p className="text-gray-300 mb-4">
              If you have any questions or concerns about these Terms of Service, please contact us at:
            </p>
            <div className="bg-gray-700 p-4 rounded-lg">
              <p className="text-gray-300">
                Email: <span className="font-bold">n0velnest999@gmail.com</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TermsOfService
