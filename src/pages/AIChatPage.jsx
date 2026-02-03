import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, TrendingUp, Brain, Loader2, ArrowLeft } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Link } from 'react-router-dom';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

const QUICK_PROMPTS = [
    "What is diversification and why does it matter?",
    "How do I analyze a stock before buying?",
    "Explain P/E ratio in simple terms",
    "What's the difference between stocks and mutual funds?",
    "How much of my portfolio should be in equities?",
    "What is dollar-cost averaging?",
    "How do I evaluate my risk tolerance?",
    "What are blue-chip stocks?",
];

const SYSTEM_PROMPT = `You are TradeGuru AI, an educational trading assistant for Indian retail investors.

CRITICAL RULES:
1. NEVER give specific buy/sell recommendations
2. NEVER predict stock prices or market movements
3. ALWAYS emphasize "Do Your Own Research (DYOR)"
4. Explain concepts, don't recommend actions
5. Use Indian examples (NSE stocks like RELIANCE, TCS, INFY, HDFC)
6. Keep responses under 150 words
7. Use simple, beginner-friendly language
8. Include risk disclaimers when discussing strategies
9. Redirect complex portfolio questions to "Talk to a verified mentor"

Your goal is to EDUCATE, not to ADVISE. Build confidence through knowledge, not dependency.`;

export default function AIChatPage() {
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: "👋 Hi! I'm your AI trading educator. Ask me anything about stocks, investing, or trading concepts. I'm here to help you learn!\n\n⚠️ I provide educational content only, not financial advice. Always do your own research."
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (text = input) => {
        if (!text.trim() || loading) return;

        const userMessage = { role: 'user', content: text };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

            const chat = model.startChat({
                history: [
                    {
                        role: 'user',
                        parts: [{ text: SYSTEM_PROMPT }],
                    },
                    {
                        role: 'model',
                        parts: [{ text: 'Understood. I will provide educational content only, never give specific buy/sell recommendations, and always emphasize DYOR.' }],
                    },
                ],
            });

            const result = await chat.sendMessage(text);
            const response = await result.response;
            const aiResponse = response.text();

            setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
        } catch (error) {
            console.error('Error:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: "Sorry, I encountered an error. Please try again or rephrase your question."
            }]);
        } finally {
            setLoading(false);
        }
    };

    const handleQuickPrompt = (prompt) => {
        handleSend(prompt);
    };

    return (
        <div className="flex flex-col h-screen bg-dark-bg">
            {/* Header */}
            <div className="glass-card border-b border-white/10 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link to="/dashboard" className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-purple-500/20 rounded-lg">
                            <Brain className="text-purple-400" size={24} />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold">AI Trading Educator</h1>
                            <p className="text-xs text-gray-400">Powered by Gemini</p>
                        </div>
                    </div>
                </div>
                <Link
                    to="/mentors"
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-500 rounded-lg text-sm font-medium transition-all"
                >
                    Talk to Real Mentor
                </Link>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((msg, i) => (
                    <div
                        key={i}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-2xl rounded-2xl px-6 py-4 ${msg.role === 'user'
                                ? 'bg-brand-600 text-white'
                                : 'glass-card border border-purple-500/20'
                                }`}
                        >
                            {msg.role === 'assistant' && (
                                <div className="flex items-center gap-2 mb-2">
                                    <Sparkles size={16} className="text-purple-400" />
                                    <span className="text-xs font-semibold text-purple-400">AI Educator</span>
                                </div>
                            )}
                            <p className="whitespace-pre-line text-sm leading-relaxed">{msg.content}</p>
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="flex justify-start">
                        <div className="glass-card border border-purple-500/20 rounded-2xl px-6 py-4">
                            <div className="flex items-center gap-2">
                                <Loader2 className="animate-spin text-purple-400" size={16} />
                                <span className="text-sm text-gray-400">Thinking...</span>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts */}
            {messages.length <= 2 && (
                <div className="px-6 pb-4">
                    <p className="text-xs text-gray-400 mb-2">Quick questions:</p>
                    <div className="flex flex-wrap gap-2">
                        {QUICK_PROMPTS.slice(0, 4).map((prompt, i) => (
                            <button
                                key={i}
                                onClick={() => handleQuickPrompt(prompt)}
                                disabled={loading}
                                className="px-3 py-2 glass-card hover:bg-white/10 rounded-lg text-xs transition-all disabled:opacity-50"
                            >
                                {prompt}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Input */}
            <div className="glass-card border-t border-white/10 p-4">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSend();
                    }}
                    className="flex gap-3"
                >
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask me about stocks, trading, or investing..."
                        disabled={loading}
                        className="flex-1 glass-input px-4 py-3 rounded-xl disabled:opacity-50"
                    />
                    <button
                        type="submit"
                        disabled={loading || !input.trim()}
                        className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-medium transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                    </button>
                </form>
                <p className="text-xs text-gray-500 mt-2 text-center">
                    💡 Tip: Ask about concepts, not specific stocks. For personalized advice, talk to a verified mentor.
                </p>
            </div>
        </div>
    );
}
