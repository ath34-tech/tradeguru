import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Activity, Shield, AlertCircle, Brain, Zap } from 'lucide-react';
import { calculatePortfolioHealth, generatePortfolioSummary, generateAIInsightsPrompt, generateWhyPrompt } from '../utils/analytics';
import { getPortfolioInsights, getMetricExplanation } from '../services/gemini';

const COLORS = ['#0ea5e9', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444'];

export default function AnalyticsPage() {
    const { profile } = useAuth();
    const [portfolio, setPortfolio] = useState([]);
    const [loading, setLoading] = useState(true);
    const [portfolioHealth, setPortfolioHealth] = useState(null);
    const [aiInsights, setAiInsights] = useState(null);
    const [loadingAI, setLoadingAI] = useState(false);
    const [selectedMetric, setSelectedMetric] = useState(null);
    const [metricExplanation, setMetricExplanation] = useState(null);

    useEffect(() => {
        if (profile?.id) {
            fetchPortfolio();
        }
    }, [profile?.id]);

    useEffect(() => {
        if (portfolio.length > 0) {
            const health = calculatePortfolioHealth(portfolio);
            setPortfolioHealth(health);
        }
    }, [portfolio]);

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

    const handleGetFullAnalysis = async () => {
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

    const handleExplainMetric = async (metric) => {
        if (!portfolioHealth) return;

        setSelectedMetric(metric);
        setLoadingAI(true);
        try {
            const summary = generatePortfolioSummary(portfolio);
            const prompt = generateWhyPrompt(metric, portfolioHealth.breakdown[metric], summary);
            const explanation = await getMetricExplanation(prompt);
            setMetricExplanation(explanation);
        } catch (error) {
            console.error('Error explaining metric:', error);
        } finally {
            setLoadingAI(false);
        }
    };

    const getPieChartData = () => {
        const totalValue = portfolio.reduce((sum, stock) => sum + (stock.buy_price * stock.quantity), 0);
        return portfolio.map(stock => ({
            name: stock.stock_symbol,
            value: stock.buy_price * stock.quantity,
            percentage: ((stock.buy_price * stock.quantity) / totalValue * 100).toFixed(1),
        }));
    };

    const getBarChartData = () => {
        return portfolio.map(stock => ({
            name: stock.stock_symbol,
            invested: stock.buy_price * stock.quantity,
        }));
    };

    const getHealthTrendData = () => {
        if (!portfolioHealth) return [];
        return [
            { name: 'Diversification', value: portfolioHealth.breakdown.diversification },
            { name: 'Risk Management', value: portfolioHealth.breakdown.risk },
            { name: 'Returns', value: portfolioHealth.breakdown.returns },
        ];
    };

    if (loading) {
        return <div className="p-10 text-center">Loading analytics...</div>;
    }

    if (portfolio.length === 0) {
        return (
            <div className="p-10">
                <div className="glass-card p-12 rounded-2xl text-center">
                    <Brain className="mx-auto mb-4 text-purple-400" size={48} />
                    <h2 className="text-2xl font-bold mb-2">No Portfolio Data</h2>
                    <p className="text-gray-400 mb-6">Add stocks to your portfolio to unlock AI-powered analytics</p>
                    <a
                        href="/dashboard"
                        className="inline-block px-6 py-3 bg-brand-600 hover:bg-brand-500 rounded-lg font-medium transition-all"
                    >
                        Go to Dashboard
                    </a>
                </div>
            </div>
        );
    }

    const pieData = getPieChartData();
    const barData = getBarChartData();
    const healthTrendData = getHealthTrendData();

    return (
        <div className="p-6 md:p-10 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Portfolio Analytics 📊</h1>
                    <p className="text-gray-400">Deep dive into your investment data with AI-powered insights</p>
                </div>
                <button
                    onClick={handleGetFullAnalysis}
                    disabled={loadingAI}
                    className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium transition-all disabled:opacity-50"
                >
                    {loadingAI ? (
                        <>
                            <Zap className="animate-spin" size={20} />
                            Analyzing...
                        </>
                    ) : (
                        <>
                            <Brain size={20} />
                            Get Full AI Analysis
                        </>
                    )}
                </button>
            </div>

            {/* AI Insights Card */}
            {aiInsights && (
                <div className="glass-card p-6 rounded-2xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20">
                    <div className="flex items-start gap-3">
                        <Brain className="text-purple-400 flex-shrink-0 mt-1" size={24} />
                        <div className="flex-1">
                            <h3 className="font-bold mb-2">AI Portfolio Analysis</h3>
                            <p className="text-sm leading-relaxed whitespace-pre-line">{aiInsights}</p>
                            <p className="text-xs text-gray-500 mt-3 italic">
                                ⚠️ Educational analysis only. Always DYOR (Do Your Own Research).
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Portfolio Health Score */}
            {portfolioHealth && (
                <div className="glass-card p-6 rounded-2xl">
                    <div className="flex items-center gap-2 mb-6">
                        <Activity className="text-brand-400" size={24} />
                        <h3 className="text-xl font-bold">Portfolio Health Score</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <button
                            onClick={() => handleExplainMetric('diversification')}
                            className="glass-card p-6 rounded-xl text-left hover:bg-white/10 transition-all group"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <Shield size={20} className="text-blue-400" />
                                <span className="text-xs text-gray-500 group-hover:text-gray-400">Click for AI explanation</span>
                            </div>
                            <h4 className="text-sm text-gray-400 mb-2">Diversification</h4>
                            <p className="text-3xl font-bold text-blue-400">{portfolioHealth.breakdown.diversification}/100</p>
                            <p className="text-xs text-gray-500 mt-2">Shannon Entropy Based</p>
                        </button>

                        <button
                            onClick={() => handleExplainMetric('risk')}
                            className="glass-card p-6 rounded-xl text-left hover:bg-white/10 transition-all group"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <AlertCircle size={20} className="text-yellow-400" />
                                <span className="text-xs text-gray-500 group-hover:text-gray-400">Click for AI explanation</span>
                            </div>
                            <h4 className="text-sm text-gray-400 mb-2">Risk Score</h4>
                            <p className="text-3xl font-bold text-yellow-400">{portfolioHealth.breakdown.risk}/100</p>
                            <p className="text-xs text-gray-500 mt-2">Concentration Index</p>
                        </button>

                        <button
                            onClick={() => handleExplainMetric('returns')}
                            className="glass-card p-6 rounded-xl text-left hover:bg-white/10 transition-all group"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <TrendingUp size={20} className="text-green-400" />
                                <span className="text-xs text-gray-500 group-hover:text-gray-400">Click for AI explanation</span>
                            </div>
                            <h4 className="text-sm text-gray-400 mb-2">Returns</h4>
                            <p className="text-3xl font-bold text-green-400">{portfolioHealth.breakdown.returns}/100</p>
                            <p className="text-xs text-gray-500 mt-2">Performance Normalized</p>
                        </button>
                    </div>

                    {selectedMetric && metricExplanation && (
                        <div className="mt-6 glass-card p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                            <h4 className="font-semibold mb-2 capitalize">Why is my {selectedMetric} score {portfolioHealth.breakdown[selectedMetric]}/100?</h4>
                            <p className="text-sm text-gray-300">{metricExplanation}</p>
                        </div>
                    )}
                </div>
            )}

            {/* Charts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Pie Chart - Portfolio Composition */}
                <div className="glass-card p-6 rounded-2xl">
                    <h3 className="text-xl font-bold mb-6">Portfolio Composition</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percentage }) => `${name} ${percentage}%`}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)' }}
                                formatter={(value) => `₹${value.toLocaleString()}`}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Bar Chart - Investment Distribution */}
                <div className="glass-card p-6 rounded-2xl">
                    <h3 className="text-xl font-bold mb-6">Investment Distribution</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={barData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="name" stroke="#6b7280" />
                            <YAxis stroke="#6b7280" />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)' }}
                                formatter={(value) => `₹${value.toLocaleString()}`}
                            />
                            <Bar dataKey="invested" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Line Chart - Health Metrics */}
                <div className="glass-card p-6 rounded-2xl md:col-span-2">
                    <h3 className="text-xl font-bold mb-6">Health Metrics Breakdown</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={healthTrendData} layout="horizontal">
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="name" stroke="#6b7280" />
                            <YAxis stroke="#6b7280" domain={[0, 100]} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)' }}
                            />
                            <Bar dataKey="value" fill="#8b5cf6" radius={[0, 8, 8, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
