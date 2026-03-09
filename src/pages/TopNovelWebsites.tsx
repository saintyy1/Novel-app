import { Link } from "react-router-dom"
import SEOHead from "../components/SEOHead"
import { TrendingUp } from "lucide-react"

const TopNovelWebsites = () => {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <SEOHead
                title="Top 5 Best Novel Websites for Free Reading in 2026 | NovlNest"
                description="Discover why NovlNest is ranked among the top novel websites for free online reading. Access thousands of webnovels, light novels, and original fiction."
                keywords="top novel websites, free novel platform, best sites to read novels, online webnovels, free ebooks, light novels online"
                canonicalUrl="https://novlnest.com/top-novel-websites"
            />

            <div className="max-w-4xl mx-auto">
                <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-8 leading-tight">
                    What Makes a <span className="text-purple-500">Top Novel Website</span> in 2026?
                </h1>

                <p className="text-xl text-gray-400 mb-12 leading-relaxed">
                    The digital publishing landscape is changing. Readers today want more than just content; they want a seamless experience, a supportive community, and fair treatment for creators. Here's why NovlNest is consistently rated as a <strong>top free novel platform</strong>.
                </p>

                <div className="space-y-12 mb-20">
                    <section className="bg-white/5 rounded-3xl p-8 border border-white/10">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="h-10 w-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">1</div>
                            <h2 className="text-2xl font-bold text-white">Infinite Selection of Free Stories</h2>
                        </div>
                        <p className="text-gray-400 pl-14">
                            NovlNest hosts thousands of original novels across every genre imaginable. From epic fantasy and gritty thrillers to sweet romance and slice-of-life, there's always something new to discover.
                        </p>
                    </section>

                    <section className="bg-white/5 rounded-3xl p-8 border border-white/10">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="h-10 w-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold">2</div>
                            <h2 className="text-2xl font-bold text-white">Mobile-First Reading Experience</h2>
                        </div>
                        <p className="text-gray-400 pl-14">
                            Our platform is optimized for reading on the go. Whether you're on a smartphone or tablet, the text adjusts perfectly to your screen, with customizable themes for day or night reading.
                        </p>
                    </section>

                    <section className="bg-white/5 rounded-3xl p-8 border border-white/10">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">3</div>
                            <h2 className="text-2xl font-bold text-white">Powerful Creator Tools</h2>
                        </div>
                        <p className="text-gray-400 pl-14">
                            We empower writers with tools that were previously only available on expensive platforms. Real-time analytics, easy chapter organization, and direct reader feedback mechanisms.
                        </p>
                    </section>
                </div>

                <div className="bg-gradient-to-r from-purple-900/40 to-indigo-900/40 rounded-3xl p-10 border border-purple-500/30 text-center">
                    <TrendingUp className="h-12 w-12 text-purple-400 mx-auto mb-6" />
                    <h2 className="text-3xl font-bold text-white mb-4">Ranked #1 for Community Engagement</h2>
                    <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
                        NovlNest isn't just a place to read; it's a place to belong. Join 10,000+ readers and writers today.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <Link to="/novels" className="px-10 py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors">
                            Browse for Free
                        </Link>
                        <Link to="/submit" className="px-10 py-4 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-colors">
                            Publish Your Story
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default TopNovelWebsites
