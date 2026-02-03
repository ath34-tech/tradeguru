import { Link } from 'react-router-dom';
import { ArrowRight, TrendingUp, Users, ShieldCheck, BrainCircuit } from 'lucide-react';

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-dark-bg text-white overflow-x-hidden">
            {/* Navbar */}
            <nav className="fixed top-0 w-full z-50 backdrop-blur-md border-b border-white/5 bg-dark-bg/80">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-2xl font-bold bg-gradient-to-r from-brand-400 to-purple-500 bg-clip-text text-transparent">
                        <TrendingUp className="text-brand-500" />
                        TradeGuru
                    </div>
                    <div className="flex gap-4">
                        <Link to="/login" className="px-6 py-2 rounded-lg text-gray-300 hover:text-white transition-colors">
                            Login
                        </Link>
                        <Link to="/signup" className="px-6 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-medium transition-all shadow-lg shadow-brand-500/20">
                            Get Started
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <section className="relative pt-40 pb-20 px-6">
                <div className="absolute top-20 left-1/4 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl -z-10 animate-pulse" />
                <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl -z-10" />

                <div className="max-w-4xl mx-auto text-center">
                    <h1 className="text-5xl md:text-7xl font-bold mb-8 leading-tight">
                        Master Trading with <br />
                        <span className="bg-gradient-to-r from-brand-400 to-purple-500 bg-clip-text text-transparent">AI & Expert Mentors</span>
                    </h1>
                    <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
                        TradeGuru combines AI-powered insights with real human mentorship to help students and beginners grow their wealth responsibly.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link to="/signup" className="px-8 py-4 rounded-xl bg-white text-dark-bg font-bold text-lg hover:bg-gray-100 transition-all flex items-center gap-2 justify-center">
                            Start Learning Now <ArrowRight size={20} />
                        </Link>
                        <Link to="/mentors" className="px-8 py-4 rounded-xl glass-card text-white font-medium text-lg hover:bg-white/10 transition-all">
                            Find a Mentor
                        </Link>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="py-20 px-6 bg-dark-card/30">
                <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8">
                    {[
                        {
                            icon: BrainCircuit,
                            title: "AI Trading Assistant",
                            desc: "Get instant explanations of complex trading concepts and portfolio analysis without the jargon."
                        },
                        {
                            icon: Users,
                            title: "1-on-1 Mentorship",
                            desc: "Connect with verified mentors for personalized guidance, strategy reviews, and career advice."
                        },
                        {
                            icon: ShieldCheck,
                            title: "Risk Management",
                            desc: "Learn safely with built-in risk assessment tools and educational guardrails."
                        }
                    ].map((feature, i) => (
                        <div key={i} className="glass-card p-8 rounded-2xl hover:border-brand-500/30 transition-all">
                            <feature.icon className="w-12 h-12 text-brand-400 mb-6" />
                            <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                            <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
