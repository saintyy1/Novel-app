import { Link } from "react-router-dom"
import SEOHead from "../components/SEOHead"
import { BookOpen, Edit3, Users, Zap, Shield, Heart } from "lucide-react"

const WattpadAlternative = () => {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <SEOHead
                title="Best Wattpad Alternative 2026 - Free Online Novel Platform | NovlNest"
                description="Looking for the best Wattpad alternative? NovlNest offers a premium, ad-free experience for readers and writers. Discover trending fiction and share your stories today."
                keywords="wattpad alternative, best novel platform, free reading apps, write novels online, storytelling community, NovlNest"
                canonicalUrl="https://novlnest.com/best-wattpad-alternative"
            />

            <div className="text-center mb-16">
                <h1 className="text-4xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500 mb-6">
                    The Premium Wattpad Alternative
                </h1>
                <p className="text-xl text-gray-400 max-w-3xl mx-auto">
                    Tired of excessive ads and limited visibility? Join NovlNest, the community-driven platform where every storyteller gets a chance to shine.
                </p>
                <div className="mt-10 flex justify-center gap-4">
                    <Link to="/register" className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-all transform hover:scale-105">
                        Start Writing Free
                    </Link>
                    <Link to="/novels" className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg transition-all">
                        Explore Novels
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
                <div className="bg-white/5 p-8 rounded-2xl border border-white/10 hover:border-purple-500/50 transition-colors">
                    <Zap className="h-12 w-12 text-yellow-400 mb-4" />
                    <h3 className="text-2xl font-bold text-white mb-3">Better Visibility</h3>
                    <p className="text-gray-400">Our algorithm prioritizes quality and engagement, not just big names. New authors get discovered faster on NovlNest.</p>
                </div>
                <div className="bg-white/5 p-8 rounded-2xl border border-white/10 hover:border-purple-500/50 transition-colors">
                    <Edit3 className="h-12 w-12 text-blue-400 mb-4" />
                    <h3 className="text-2xl font-bold text-white mb-3">Modern Editor</h3>
                    <p className="text-gray-400">Focus on your story with our distraction-free browser-based editor. Auto-save, formatting, and easy chapter management.</p>
                </div>
                <div className="bg-white/5 p-8 rounded-2xl border border-white/10 hover:border-purple-500/50 transition-colors">
                    <Users className="h-12 w-12 text-green-400 mb-4" />
                    <h3 className="text-2xl font-bold text-white mb-3">Active Community</h3>
                    <p className="text-gray-400">Engage with readers who care. Our comment system and author tools foster real connections.</p>
                </div>
            </div>

            <div className="bg-gradient-to-br from-purple-900/20 to-indigo-900/20 rounded-3xl p-8 md:p-12 border border-purple-500/20 mb-20">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                    <div>
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Why NovlNest is the Best Choice for You</h2>
                        <ul className="space-y-4">
                            <li className="flex items-center text-gray-300">
                                <Shield className="h-5 w-5 text-purple-400 mr-3" />
                                <span>Ad-light experience for undisturbed reading</span>
                            </li>
                            <li className="flex items-center text-gray-300">
                                <Heart className="h-5 w-5 text-purple-400 mr-3" />
                                <span>Direct support for authors through tips</span>
                            </li>
                            <li className="flex items-center text-gray-300">
                                <BookOpen className="h-5 w-5 text-purple-400 mr-3" />
                                <span>Responsive interface that works on any device</span>
                            </li>
                            <li className="flex items-center text-gray-300">
                                <Users className="h-5 w-5 text-purple-400 mr-3" />
                                <span>Fair moderation and creator-first policies</span>
                            </li>
                        </ul>
                    </div>
                    <div className="relative">
                        <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl blur opacity-25"></div>
                        <div className="relative bg-[#121212] p-6 rounded-2xl border border-white/10">
                            <div className="flex items-center mb-4">
                                <div className="h-3 w-3 rounded-full bg-red-500 mr-2"></div>
                                <div className="h-3 w-3 rounded-full bg-yellow-500 mr-2"></div>
                                <div className="h-3 w-3 rounded-full bg-green-500"></div>
                            </div>
                            <h4 className="text-white font-mono text-sm mb-2">Wattpad vs NovlNest</h4>
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs py-2 border-b border-white/5">
                                    <span className="text-gray-500">Feature</span>
                                    <span className="text-gray-400 font-bold">NovlNest</span>
                                </div>
                                <div className="flex justify-between text-xs py-2 border-b border-white/5">
                                    <span className="text-gray-500">Ads</span>
                                    <span className="text-green-400">Very Rare</span>
                                </div>
                                <div className="flex justify-between text-xs py-2 border-b border-white/5">
                                    <span className="text-gray-500">Algorithmic Push</span>
                                    <span className="text-green-400">High for New</span>
                                </div>
                                <div className="flex justify-between text-xs py-2">
                                    <span className="text-gray-500">Editor</span>
                                    <span className="text-green-400">Mobile Responsive</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="text-center">
                <h2 className="text-3xl font-bold text-white mb-8">Ready to start your journey?</h2>
                <Link to="/register" className="inline-block px-12 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-lg rounded-xl shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all transform hover:-translate-y-1">
                    Create Your Account Now
                </Link>
            </div>
        </div>
    )
}

export default WattpadAlternative
