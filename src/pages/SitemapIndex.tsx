import { Link } from "react-router-dom"
import SEOHead from "../components/SEOHead"

const SitemapIndex = () => {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <SEOHead
                title="Sitemap - NovlNest Free Novel Platform"
                description="Navigate all sections of NovlNest. Find novels, poems, author tools, and community links in our comprehensive sitemap."
                canonicalUrl="https://novlnest.com/sitemap"
            />

            <h1 className="text-4xl font-bold text-white mb-12 border-b border-white/10 pb-4">Sitemap</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                <section>
                    <h2 className="text-xl font-bold text-blue-400 mb-6 uppercase tracking-wider">Main Pages</h2>
                    <ul className="space-y-4">
                        <li><Link to="/" className="text-gray-300 hover:text-white transition-colors">Home</Link></li>
                        <li><Link to="/novels" className="text-gray-300 hover:text-white transition-colors">All Novels</Link></li>
                        <li><Link to="/poems" className="text-gray-300 hover:text-white transition-colors">All Poems</Link></li>
                        <li><Link to="/promote" className="text-gray-300 hover:text-white transition-colors">Promote Stories</Link></li>
                        <li><Link to="/about" className="text-gray-300 hover:text-white transition-colors">About NovlNest</Link></li>
                        <li><Link to="/contact" className="text-gray-300 hover:text-white transition-colors">Contact Support</Link></li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-purple-400 mb-6 uppercase tracking-wider">Writer Resources</h2>
                    <ul className="space-y-4">
                        <li><Link to="/submit" className="text-gray-300 hover:text-white transition-colors">Publish a Novel</Link></li>
                        <li><Link to="/submit-poem" className="text-gray-300 hover:text-white transition-colors">Publish a Poem</Link></li>
                        <li><Link to="/register" className="text-gray-300 hover:text-white transition-colors">Create Creator Account</Link></li>
                        <li><Link to="/best-wattpad-alternative" className="text-gray-300 hover:text-white transition-colors">Why novlnest?</Link></li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-green-400 mb-6 uppercase tracking-wider">Legal & Info</h2>
                    <ul className="space-y-4">
                        <li><Link to="/terms-of-service" className="text-gray-300 hover:text-white transition-colors">Terms of Service</Link></li>
                        <li><Link to="/privacy" className="text-gray-300 hover:text-white transition-colors">Privacy Policy</Link></li>
                        <li><Link to="/top-novel-websites" className="text-gray-300 hover:text-white transition-colors">Platform Reviews</Link></li>
                    </ul>
                </section>
            </div>
        </div>
    )
}

export default SitemapIndex
