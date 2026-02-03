import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { TrendingUp, TrendingDown, DollarSign, Activity, Plus, Trash2, Brain, Sparkles, AlertCircle, Shield, BarChart3, Zap, Award, Target, Search, X } from 'lucide-react';
import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { calculatePortfolioHealth, generatePortfolioSummary, generateAIInsightsPrompt } from '../utils/analytics';
import { getPortfolioInsights } from '../services/gemini';
import { searchStocks, getStockPrice, POPULAR_STOCKS } from '../services/stockData';
import { Link } from 'react-router-dom';

const mockChartData = [
    { name: 'Mon', value: 10000 },
    { name: 'Tue', value: 12000 },
    { name: 'Wed', value: 11000 },
    { name: 'Thu', value: 14000 },
    { name: 'Fri', value: 13500 },
    { name: 'Sat', value: 16000 },
    { name: 'Sun', value: 18000 },
];

const COLORS = ['#0ea5e9', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

export default function DashboardPage() {
    const { profile } = useAuth();
    const [portfolio, setPortfolio] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddStock, setShowAddStock] = useState(false);
    const [newStock, setNewStock] = useState({ symbol: '', quantity: 1, buy_price: 0 });
    const [portfolioHealth, setPortfolioHealth] = useState(null);
    const [aiInsights, setAiInsights] = useState(null);
    const [loadingAI, setLoadingAI] = useState(false);
    const [dailyTip, setDailyTip] = useState(null);

    // Stock search states
    const [stockSearch, setStockSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [selectedStock, setSelectedStock] = useState(null);
    const [fetchingPrice, setFetchingPrice] = useState(false);

    useEffect(() => {
        if (profile?.id) {
            fetchPortfolio();
            generateDailyTip();
        }
    }, [profile?.id]);

    useEffect(() => {
        if (portfolio.length > 0) {
            const health = calculatePortfolioHealth(portfolio);
            setPortfolioHealth(health);
        }
    }, [portfolio]);

    // Stock search with debounce
    useEffect(() => {
        if (stockSearch.length < 2) {
            setSearchResults([]);
            return;
        }

        const delaySearch = setTimeout(async () => {
            setSearching(true);
            const results = await searchStocks(stockSearch);
            setSearchResults(results);
            setSearching(false);
        }, 500);

        return () => clearTimeout(delaySearch);
    }, [stockSearch]);

    const generateDailyTip = () => {
        const tips = [
            "💡 Diversification reduces risk. Aim for at least 5-7 stocks across different sectors.",
            "📊 Review your portfolio weekly, but avoid checking prices hourly - it adds stress!",
            "🎯 Set clear investment goals. Know WHY you're investing before WHAT to buy.",
            "⚠️ Never invest money you can't afford to lose. Emergency fund comes first!",
            "📚 Learn one new concept weekly. Knowledge compounds like interest.",
            "🔍 Research > Tips. Always verify before investing based on social media advice.",
            "⏰ Time in the market > Timing the market. Stay invested for the long term.",
        ];
        const randomTip = tips[Math.floor(Math.random() * tips.length)];
        setDailyTip(randomTip);
    };

    const fetchPortfolio = async () => {
        if (!profile?.id) {
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('portfolios')
                .select('*')
                .eq('user_id', profile.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPortfolio(data || []);
        } catch (error) {
            console.error('Error fetching portfolio:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectStock = async (stock) => {
        setSelectedStock(stock);
        setStockSearch('');
        setSearchResults([]);
        setNewStock({ ...newStock, symbol: stock.symbol.replace('.NS', '').replace('.BSE', '') });

        // Fetch current price
        setFetchingPrice(true);
        const priceData = await getStockPrice(stock.symbol);
        if (priceData) {
            setNewStock({ ...newStock, symbol: stock.symbol.replace('.NS', '').replace('.BSE', ''), buy_price: priceData.price.toFixed(2) });
        }
        setFetchingPrice(false);
    };

    const handleAddStock = async (e) => {
        e.preventDefault();

        if (!profile?.id) {
            alert('Profile not loaded. Please refresh the page.');
            return;
        }

        try {
            const { error } = await supabase
                .from('portfolios')
                .insert({
                    user_id: profile.id,
                    stock_symbol: newStock.symbol.toUpperCase(),
                    quantity: parseInt(newStock.quantity),
                    buy_price: parseFloat(newStock.buy_price),
                });

            if (error) throw error;

            setShowAddStock(false);
            setNewStock({ symbol: '', quantity: 1, buy_price: 0 });
            setSelectedStock(null);
            setStockSearch('');
            fetchPortfolio();
        } catch (error) {
            console.error('Error adding stock:', error);
            alert('Failed to add stock');
        }
    };

    const handleDeleteStock = async (id) => {
        if (!confirm('Remove this stock from portfolio?')) return;

        try {
            const { error } = await supabase
                .from('portfolios')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchPortfolio();
            setAiInsights(null);
        } catch (error) {
            console.error('Error deleting stock:', error);
        }
    };

    const handleGetAIInsights = async () => {
        if (portfolio.length === 0) {
            alert('Add some stocks to your portfolio first!');
            return;
        }

        setLoadingAI(true);
        try {
            const summary = generatePortfolioSummary(portfolio);
            const prompt = generateAIInsightsPrompt(summary);
            const insights = await getPortfolioInsights(prompt);
            setAiInsights(insights);
        } catch (error) {
            console.error('Error getting AI insights:', error);
            alert('Failed to generate AI insights. Please try again.');
        } finally {
            setLoadingAI(false);
        }
    };

    const calculateStats = () => {
        const totalInvested = portfolio.reduce((sum, stock) => sum + (stock.buy_price * stock.quantity), 0);
        const currentValue = totalInvested * 1.1;
        const profitLoss = currentValue - totalInvested;
        const percentReturn = totalInvested > 0 ? ((profitLoss / totalInvested) * 100).toFixed(2) : 0;

        return { totalInvested, currentValue, profitLoss, percentReturn };
    };

    const stats = calculateStats();

    const getHealthColor = (score) => {
        if (score >= 70) return 'text-green-400';
        if (score >= 40) return 'text-yellow-400';
        return 'text-red-400';
    };

    const getHealthLabel = (score) => {
        if (score >= 70) return 'Healthy';
        if (score >= 40) return 'Moderate';
        return 'Needs Attention';
    };

    const getPieData = () => {
        const totalValue = portfolio.reduce((sum, stock) => sum + (stock.buy_price * stock.quantity), 0);
        return portfolio.slice(0, 5).map(stock => ({
            name: stock.stock_symbol,
            value: stock.buy_price * stock.quantity,
            percentage: ((stock.buy_price * stock.quantity) / totalValue * 100).toFixed(1),
        }));
    };

    const statCards = [
        { label: 'Total Invested', value: `₹${stats.totalInvested.toLocaleString()}`, icon: DollarSign, color: 'text-blue-400', trend: '' },
        { label: 'Current Value', value: `₹${stats.currentValue.toLocaleString()}`, icon: TrendingUp, color: 'text-green-400', trend: `+${stats.percentReturn}%` },
        { label: 'Portfolio Health', value: portfolioHealth ? `${portfolioHealth.score}/100` : 'N/A', icon: Activity, color: portfolioHealth ? getHealthColor(portfolioHealth.score) : 'text-gray-400', trend: portfolioHealth ? getHealthLabel(portfolioHealth.score) : '' },
    ];

    return (
        <div className="p-6 md:p-10 space-y-8">
            {/* Header with Daily Tip */}
            <div>
                <h1 className="text-3xl font-bold mb-2">Welcome back, {profile?.full_name?.split(' ')[0]} 👋</h1>
                <p className="text-gray-400">Here's your AI-powered portfolio analysis.</p>

                {dailyTip && (
                    <div className="mt-4 glass-card p-4 rounded-xl bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 flex items-start gap-3">
                        <Zap className="text-yellow-400 flex-shrink-0 mt-0.5" size={20} />
                        <div>
                            <p className="text-sm font-semibold mb-1">💡 Daily Learning Tip</p>
                            <p className="text-sm text-gray-300">{dailyTip}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {statCards.map((stat, i) => (
                    <div key={i} className="glass-card p-6 rounded-2xl relative overflow-hidden group">
                        <div className={`absolute top-4 right-4 p-3 rounded-xl bg-white/5 ${stat.color} group-hover:scale-110 transition-transform`}>
                            <stat.icon size={24} />
                        </div>
                        <p className="text-gray-400 text-sm font-medium mb-1">{stat.label}</p>
                        <h3 className="text-3xl font-bold mb-2">{stat.value}</h3>
                        {stat.trend && (
                            <span className={`text-xs font-semibold px-2 py-1 rounded-full bg-white/5 ${stat.trend.startsWith('+') || stat.trend === 'Healthy' ? 'text-green-400' : stat.trend === 'Moderate' ? 'text-yellow-400' : 'text-red-400'}`}>
                                {stat.trend}
                            </span>
                        )}
                    </div>
                ))}
            </div>

            {/* INLINE ANALYTICS - Portfolio Health & Charts */}
            {portfolioHealth && portfolio.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Health Breakdown */}
                    <div className="glass-card p-6 rounded-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <Activity className="text-brand-400" size={24} />
                                <h3 className="text-xl font-bold">Portfolio Health</h3>
                            </div>
                            <button
                                onClick={handleGetAIInsights}
                                disabled={loadingAI}
                                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                            >
                                {loadingAI ? (
                                    <>
                                        <Sparkles className="animate-spin" size={18} />
                                        Analyzing...
                                    </>
                                ) : (
                                    <>
                                        <Brain size={18} />
                                        AI Insights
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="space-y-3 mb-6">
                            <div className="glass-card p-4 rounded-xl">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-400">Diversification</span>
                                    <Shield size={16} className="text-blue-400" />
                                </div>
                                <p className="text-2xl font-bold text-blue-400">{portfolioHealth.breakdown.diversification}/100</p>
                                <p className="text-xs text-gray-500 mt-1">Shannon Entropy</p>
                            </div>

                            <div className="glass-card p-4 rounded-xl">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-400">Risk Score</span>
                                    <AlertCircle size={16} className="text-yellow-400" />
                                </div>
                                <p className="text-2xl font-bold text-yellow-400">{portfolioHealth.breakdown.risk}/100</p>
                                <p className="text-xs text-gray-500 mt-1">HHI Index</p>
                            </div>

                            <div className="glass-card p-4 rounded-xl">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-400">Returns</span>
                                    <TrendingUp size={16} className="text-green-400" />
                                </div>
                                <p className="text-2xl font-bold text-green-400">{portfolioHealth.breakdown.returns}/100</p>
                                <p className="text-xs text-gray-500 mt-1">Performance</p>
                            </div>
                        </div>

                        {aiInsights && (
                            <div className="glass-card p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20">
                                <div className="flex items-start gap-3">
                                    <Sparkles className="text-purple-400 flex-shrink-0 mt-1" size={20} />
                                    <div className="flex-1">
                                        <p className="text-sm leading-relaxed whitespace-pre-line">{aiInsights}</p>
                                        <p className="text-xs text-gray-500 mt-3 italic">
                                            ⚠️ Educational analysis only. Always DYOR.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <Link
                            to="/analytics"
                            className="mt-4 flex items-center justify-center gap-2 w-full py-2 glass-card hover:bg-white/10 rounded-lg text-sm font-medium transition-all"
                        >
                            <BarChart3 size={18} />
                            View Detailed Analytics
                        </Link>
                    </div>

                    {/* Portfolio Composition Pie Chart */}
                    <div className="glass-card p-6 rounded-2xl">
                        <h3 className="text-xl font-bold mb-6">Portfolio Composition</h3>
                        {portfolio.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={getPieData()}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percentage }) => `${name} ${percentage}%`}
                                        outerRadius={100}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {getPieData().map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)' }}
                                        formatter={(value) => `₹${value.toLocaleString()}`}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-center py-12 text-gray-400">
                                <p>Add stocks to see composition</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Performance Chart */}
            <div className="glass-card p-6 rounded-2xl">
                <h3 className="text-xl font-bold mb-6">Portfolio Performance (Mock)</h3>
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={mockChartData}>
                            <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="name" stroke="#6b7280" />
                            <YAxis stroke="#6b7280" />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1e293b', borderColor: 'rgba(255,255,255,0.1)' }}
                                itemStyle={{ color: '#fff' }}
                            />
                            <Area type="monotone" dataKey="value" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorValue)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Holdings */}
            <div className="glass-card p-6 rounded-2xl">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold">Your Holdings</h3>
                    <button
                        onClick={() => setShowAddStock(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 rounded-lg text-sm font-medium transition-all"
                    >
                        <Plus size={18} />
                        Add Stock
                    </button>
                </div>

                {portfolio.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <Award className="mx-auto mb-4 text-gray-600" size={48} />
                        <p className="text-lg font-semibold mb-2">Start Your Investment Journey!</p>
                        <p className="mb-6">Add your first stock to unlock AI-powered insights</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-gray-400 text-sm border-b border-white/10">
                                    <th className="pb-4 font-medium">Stock</th>
                                    <th className="pb-4 font-medium">Quantity</th>
                                    <th className="pb-4 font-medium">Avg Price</th>
                                    <th className="pb-4 font-medium">Invested</th>
                                    <th className="pb-4 font-medium"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {portfolio.map((stock) => (
                                    <tr key={stock.id} className="hover:bg-white/5 transition-colors">
                                        <td className="py-4 font-medium">{stock.stock_symbol}</td>
                                        <td className="py-4 text-gray-400">{stock.quantity}</td>
                                        <td className="py-4 text-gray-400">₹{stock.buy_price}</td>
                                        <td className="py-4 font-medium">₹{(stock.buy_price * stock.quantity).toLocaleString()}</td>
                                        <td className="py-4 text-right">
                                            <button
                                                onClick={() => handleDeleteStock(stock.id)}
                                                className="p-2 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Enhanced Add Stock Modal with Search */}
            {showAddStock && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <form onSubmit={handleAddStock} className="glass-card p-8 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold">Add Stock to Portfolio</h2>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowAddStock(false);
                                    setSelectedStock(null);
                                    setStockSearch('');
                                }}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4 mb-6">
                            {/* Stock Search */}
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Search Stock</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                                    <input
                                        type="text"
                                        value={stockSearch}
                                        onChange={(e) => setStockSearch(e.target.value)}
                                        placeholder="Search by name or symbol..."
                                        className="w-full glass-input px-10 py-3 rounded-lg"
                                    />
                                    {searching && (
                                        <div className="absolute right-3 top-3">
                                            <div className="animate-spin h-5 w-5 border-2 border-brand-500 border-t-transparent rounded-full"></div>
                                        </div>
                                    )}
                                </div>

                                {/* Search Results */}
                                {searchResults.length > 0 && (
                                    <div className="mt-2 glass-card rounded-lg max-h-48 overflow-y-auto">
                                        {searchResults.map((stock, i) => (
                                            <button
                                                key={i}
                                                type="button"
                                                onClick={() => handleSelectStock(stock)}
                                                className="w-full px-4 py-3 hover:bg-white/10 transition-colors text-left border-b border-white/5 last:border-0"
                                            >
                                                <p className="font-medium">{stock.symbol}</p>
                                                <p className="text-xs text-gray-400">{stock.name}</p>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Popular Stocks */}
                                {!stockSearch && !selectedStock && (
                                    <div className="mt-2">
                                        <p className="text-xs text-gray-400 mb-2">Popular stocks:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {POPULAR_STOCKS.slice(0, 6).map((stock, i) => (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    onClick={() => handleSelectStock(stock)}
                                                    className="px-3 py-1 glass-card hover:bg-white/10 rounded-lg text-xs transition-all"
                                                >
                                                    {stock.symbol.replace('.NS', '')}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Selected Stock Display */}
                            {selectedStock && (
                                <div className="glass-card p-3 rounded-lg bg-brand-500/10 border border-brand-500/20">
                                    <p className="text-sm font-semibold">{selectedStock.name}</p>
                                    <p className="text-xs text-gray-400">{selectedStock.symbol}</p>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Stock Symbol</label>
                                <input
                                    type="text"
                                    required
                                    value={newStock.symbol}
                                    onChange={(e) => setNewStock({ ...newStock, symbol: e.target.value })}
                                    placeholder="e.g., RELIANCE"
                                    className="w-full glass-input px-4 py-3 rounded-lg uppercase"
                                    readOnly={selectedStock}
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Quantity</label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    value={newStock.quantity}
                                    onChange={(e) => setNewStock({ ...newStock, quantity: e.target.value })}
                                    className="w-full glass-input px-4 py-3 rounded-lg"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-2">
                                    Buy Price (₹)
                                    {fetchingPrice && <span className="ml-2 text-xs">Fetching...</span>}
                                </label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    step="0.01"
                                    value={newStock.buy_price}
                                    onChange={(e) => setNewStock({ ...newStock, buy_price: e.target.value })}
                                    className="w-full glass-input px-4 py-3 rounded-lg"
                                />
                                <p className="text-xs text-gray-500 mt-1">Real-time price auto-filled when available</p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowAddStock(false);
                                    setSelectedStock(null);
                                    setStockSearch('');
                                }}
                                className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-lg font-medium transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!newStock.symbol || !newStock.buy_price}
                                className="flex-1 py-3 bg-brand-600 hover:bg-brand-500 rounded-lg font-medium transition-all disabled:opacity-50"
                            >
                                Add Stock
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
