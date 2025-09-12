import React, { useState } from 'react'
import { collection, addDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { 
  HelpCircle, 
  Mail, 
  MessageCircle, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Search,
  BookOpen,
  Settings,
  User,
  CreditCard,
  Shield
} from 'lucide-react'
import { Link } from 'react-router-dom'

interface FormData {
  name: string
  email: string
  subject: string
  message: string
}

interface FAQItem {
  id: string
  question: string
  answer: string
  category: string
}

const Support = () => {
  const { currentUser } = useAuth()
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    subject: '',
    message: ''
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null)

  const faqData: FAQItem[] = [
    {
      id: '1',
      question: 'How do I submit a novel?',
      answer: 'Navigate to the "Submit Novel" section in your dashboard, fill out the novel details including title, description, genre, and upload your manuscript. Our team will review it within 1-2 days.',
      category: 'content'
    },
    {
      id: '2',
      question: 'How do I read novels?',
      answer: 'Browse our library of novels, click on any novel that interests you, and start reading. You can read on any device with internet access.',
      category: 'reading'
    },
    {
      id: '3',
      question: 'What payment methods do you accept?',
      answer: 'We accept all major credit cards (Visa, MasterCard, American Express). All transactions are secure and encrypted.',
      category: 'payment'
    },
    {
      id: '4',
      question: 'How do I change my password?',
      answer: 'Go to your Settings page, click on "Security", then "Change Password". Enter your current password and new password. Make sure your new password is strong and unique.',
      category: 'account'
    },
  ]

  const categories = [
    { id: 'all', name: 'All Topics', icon: BookOpen },
    { id: 'account', name: 'Account', icon: User },
    { id: 'content', name: 'Content', icon: BookOpen },
    { id: 'reading', name: 'Reading', icon: BookOpen },
    { id: 'payment', name: 'Payment', icon: CreditCard },
  ]

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await addDoc(collection(db, 'support_messages'), {
        name: currentUser?.displayName || 'Guest User',
        email: currentUser?.email || 'no-email@example.com',
        subject: formData.subject,
        message: formData.message,
        status: 'unread',
        createdAt: new Date().toISOString(),
        timestamp: new Date(),
      })

      setSuccess(true)
      setFormData({ name: '', email: '', subject: '', message: '' })
    } catch (err) {
      console.error('Error sending message:', err)
      setError('Failed to send message. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const filteredFAQs = faqData.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const toggleFAQ = (id: string) => {
    setExpandedFAQ(expandedFAQ === id ? null : id)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-2xl">
              <HelpCircle className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            How can we help you?
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Find answers to common questions or get in touch with our support team
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* FAQ Section */}
          <div className="lg:col-span-2 space-y-8">
            {/* Search and Filter */}
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-100 sm:text-gray-200 z-10 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search FAQs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white/30 sm:bg-white/25 border-2 border-white/50 sm:border-white/40 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 text-white placeholder-gray-100 sm:placeholder-gray-200 transition-all text-base"
                  />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-3 bg-white/30 sm:bg-white/25 border-2 border-white/50 sm:border-white/40 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 text-white transition-all text-base min-w-0 sm:min-w-[200px]"
                >
                  {categories.map(category => (
                    <option key={category.id} value={category.id} className="bg-gray-800 text-white">
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-4">
                {filteredFAQs.map((faq) => (
                  <div
                    key={faq.id}
                    className="bg-white/5 border border-white/10 rounded-xl overflow-hidden transition-all hover:bg-white/10"
                  >
                    <button
                      onClick={() => toggleFAQ(faq.id)}
                      className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-white/5 transition-colors"
                    >
                      <span className="text-white font-medium">{faq.question}</span>
                      {expandedFAQ === faq.id ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                    {expandedFAQ === faq.id && (
                      <div className="px-6 pb-4">
                        <p className="text-gray-300 leading-relaxed">{faq.answer}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl shadow-2xl p-6">
              <div className="flex items-center mb-8">
                <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center mr-4">
                  <MessageCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Still need help?</h2>
                  <p className="text-gray-300">Send us a message and we'll get back to you soon</p>
                </div>
              </div>

              {success && (
                <div className="mb-6 bg-green-500/20 border border-green-500/50 text-green-300 px-6 py-4 rounded-xl backdrop-blur-sm">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Thank you for your message! We'll get back to you within 24 hours.
                  </div>
                </div>
              )}

              {error && (
                <div className="mb-6 bg-red-500/20 border border-red-500/50 text-red-300 px-6 py-4 rounded-xl backdrop-blur-sm">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    {error}
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-200 mb-2">
                      Full Name *
                      <span className="text-xs text-gray-400 ml-2">(from your account)</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      readOnly
                      value={currentUser?.displayName || formData.name}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 backdrop-blur-sm cursor-not-allowed opacity-75"
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-200 mb-2">
                      Email Address *
                      <span className="text-xs text-gray-400 ml-2">(from your account)</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      readOnly
                      value={currentUser?.email || formData.email}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 backdrop-blur-sm cursor-not-allowed opacity-75"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-200 mb-2">
                    Subject *
                  </label>
                  <select
                    id="subject"
                    name="subject"
                    required
                    value={formData.subject}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white backdrop-blur-sm transition-all"
                  >
                    <option value="" className="bg-gray-800">Select a subject</option>
                    <option value="general" className="bg-gray-800">General Inquiry</option>
                    <option value="technical" className="bg-gray-800">Technical Support</option>
                    <option value="content" className="bg-gray-800">Content Issues</option>
                    <option value="account" className="bg-gray-800">Account Help</option>
                    <option value="payment" className="bg-gray-800">Payment Issues</option>
                    <option value="feedback" className="bg-gray-800">Feedback & Suggestions</option>
                    <option value="bug" className="bg-gray-800">Bug Report</option>
                    <option value="other" className="bg-gray-800">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-200 mb-2">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={6}
                    value={formData.message}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-400 backdrop-blur-sm transition-all resize-none"
                    placeholder="Tell us how we can help you..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] shadow-lg"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                      Sending Message...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <MessageCircle className="h-5 w-5 mr-2" />
                      Send Message
                    </div>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Contact Info Sidebar */}
          <div className="space-y-6">
            {/* Contact Methods */}
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-white mb-6">Get in Touch</h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <div className="h-10 w-10 bg-purple-500/20 rounded-lg flex items-center justify-center mr-4">
                    <Mail className="h-5 w-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Email Support</p>
                    <p className="text-gray-400 text-sm">n0velnest999@gmail.com</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="h-10 w-10 bg-green-500/20 rounded-lg flex items-center justify-center mr-4">
                    <Clock className="h-5 w-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Response Time</p>
                    <p className="text-gray-400 text-sm">Within 24 hours</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-white mb-6">Quick Links</h3>
              <div className="space-y-3">
                <Link to="/privacy" className="flex items-center text-gray-300 hover:text-white transition-colors">
                  <Shield className="h-4 w-4 mr-3" />
                  Privacy Policy
                </Link>
                <Link to="/terms-of-service" className="flex items-center text-gray-300 hover:text-white transition-colors">
                  <BookOpen className="h-4 w-4 mr-3" />
                  Terms of Service
                </Link>
                <Link to="/settings" className="flex items-center text-gray-300 hover:text-white transition-colors">
                  <Settings className="h-4 w-4 mr-3" />
                  Account Settings
                </Link>
              </div>
            </div>

            {/* Status */}
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">System Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Platform</span>
                  <div className="flex items-center">
                    <div className="h-2 w-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-green-400 text-sm">Operational</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Payments</span>
                  <div className="flex items-center">
                    <div className="h-2 w-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-green-400 text-sm">Operational</span>
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

export default Support