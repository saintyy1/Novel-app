const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gray-900 py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-white mb-4">Privacy Policy</h1>
          <p className="text-xl text-gray-300">
            Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8">
          <div className="prose dark:prose-invert max-w-none">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Introduction</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              At NovelNest, we are committed to protecting your privacy and ensuring the security
              of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard
              your information when you visit our website and use our services.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 mt-8">Information We Collect</h2>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Personal Information</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              We may collect personal information that you voluntarily provide to us when you:
            </p>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 mb-6 space-y-2">
              <li>Register for an account</li>
              <li>Submit novels or other content</li>
              <li>Contact us through our contact form</li>
              <li>Subscribe to our newsletter</li>
              <li>Participate in surveys or promotions</li>
            </ul>

            <p className="text-gray-600 dark:text-gray-300 mb-6">This information may include:</p>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 mb-6 space-y-2">
              <li>Name and display name</li>
              <li>Email address</li>
              <li>Profile picture</li>
              <li>Biographical information</li>
              <li>Content you create and publish</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Automatically Collected Information
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              When you visit our website, we may automatically collect certain information about your device and usage
              patterns, including:
            </p>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 mb-6 space-y-2">
              <li>IP address and location data</li>
              <li>Browser type and version</li>
              <li>Operating system</li>
              <li>Pages visited and time spent on our site</li>
              <li>Referring website</li>
              <li>Device identifiers</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 mt-8">How We Use Your Information</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">We use the information we collect to:</p>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 mb-6 space-y-2">
              <li>Provide, operate, and maintain our services</li>
              <li>Process your account registration and manage your profile</li>
              <li>Enable you to publish and share your content</li>
              <li>Communicate with you about your account and our services</li>
              <li>Respond to your inquiries and provide customer support</li>
              <li>Send you updates, newsletters, and promotional materials (with your consent)</li>
              <li>Analyze usage patterns to improve our services</li>
              <li>Detect, prevent, and address technical issues and security threats</li>
              <li>Comply with legal obligations</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 mt-8">
              Information Sharing and Disclosure
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              We do not sell, trade, or otherwise transfer your personal information to third parties without your
              consent, except in the following circumstances:
            </p>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Public Information</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Information you choose to make public (such as your profile information, published novels, and comments)
              will be visible to other users of our platform.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Service Providers</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              We may share your information with trusted third-party service providers who assist us in operating our
              website and providing our services, such as hosting providers, analytics services, and email delivery
              services.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Legal Requirements</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              We may disclose your information if required to do so by law or in response to valid requests by public
              authorities.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 mt-8">Data Security</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              We implement appropriate technical and organizational security measures to protect your personal
              information against unauthorized access, alteration, disclosure, or destruction. However, no method of
              transmission over the internet or electronic storage is 100% secure.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 mt-8">Your Rights and Choices</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">You have the right to:</p>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 mb-6 space-y-2">
              <li>Access and update your personal information</li>
              <li>Delete your account and associated data</li>
              <li>Opt out of promotional communications</li>
              <li>Request a copy of your data</li>
              <li>Request correction of inaccurate information</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 mt-8">
              Cookies and Tracking Technologies
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              We use cookies and similar tracking technologies to enhance your experience on our website. You can
              control cookie settings through your browser preferences, though disabling cookies may affect the
              functionality of our services.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 mt-8">Children's Privacy</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Our services are not intended for children under the age of 13. We do not knowingly collect personal
              information from children under 13. If you are a parent or guardian and believe your child has provided us
              with personal information, please contact us.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 mt-8">International Data Transfers</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Your information may be transferred to and processed in countries other than your own. We ensure that such
              transfers comply with applicable data protection laws and implement appropriate safeguards.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 mt-8">
              Changes to This Privacy Policy
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new
              Privacy Policy on this page and updating the "Last updated" date. We encourage you to review this Privacy
              Policy periodically.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 mt-8">Contact Us</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              If you have any questions about this Privacy Policy or our privacy practices, please contact us at:
            </p>
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <p className="text-gray-600 dark:text-gray-300">
                Email: privacy@novelnest.com
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PrivacyPolicy
