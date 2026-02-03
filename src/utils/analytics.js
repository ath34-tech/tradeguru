// AI Analytics Utilities

/**
 * Calculate portfolio health score (0-100)
 * Based on: diversification, risk, and returns
 */
export function calculatePortfolioHealth(portfolio) {
    if (!portfolio || portfolio.length === 0) {
        return { score: 0, breakdown: {} };
    }

    const diversificationScore = calculateDiversification(portfolio);
    const riskScore = calculateRiskScore(portfolio);
    const returnsScore = calculateReturnsScore(portfolio);

    const overallScore = Math.round(
        diversificationScore * 0.4 +
        riskScore * 0.3 +
        returnsScore * 0.3
    );

    return {
        score: overallScore,
        breakdown: {
            diversification: Math.round(diversificationScore),
            risk: Math.round(riskScore),
            returns: Math.round(returnsScore),
        },
    };
}

/**
 * Calculate diversification using Shannon Entropy
 * Higher entropy = better diversification
 */
function calculateDiversification(portfolio) {
    const totalValue = portfolio.reduce((sum, stock) =>
        sum + (stock.buy_price * stock.quantity), 0
    );

    if (totalValue === 0) return 0;

    // Calculate Shannon entropy
    let entropy = 0;
    portfolio.forEach(stock => {
        const proportion = (stock.buy_price * stock.quantity) / totalValue;
        if (proportion > 0) {
            entropy -= proportion * Math.log2(proportion);
        }
    });

    // Normalize to 0-100 scale
    // Maximum entropy for n holdings is log2(n)
    const maxEntropy = Math.log2(portfolio.length || 1);
    const normalizedEntropy = maxEntropy > 0 ? (entropy / maxEntropy) * 100 : 0;

    // Penalize if too few holdings
    const holdingsPenalty = portfolio.length < 5 ? (portfolio.length / 5) : 1;

    return normalizedEntropy * holdingsPenalty;
}

/**
 * Calculate risk score based on concentration
 * Lower concentration = better risk score
 */
function calculateRiskScore(portfolio) {
    const totalValue = portfolio.reduce((sum, stock) =>
        sum + (stock.buy_price * stock.quantity), 0
    );

    if (totalValue === 0) return 0;

    // Calculate concentration (Herfindahl index)
    let concentration = 0;
    portfolio.forEach(stock => {
        const proportion = (stock.buy_price * stock.quantity) / totalValue;
        concentration += proportion * proportion;
    });

    // Lower concentration = higher score
    // For n equal holdings, min concentration is 1/n
    const minConcentration = 1 / (portfolio.length || 1);
    const normalizedConcentration = 1 - ((concentration - minConcentration) / (1 - minConcentration));

    return Math.max(0, normalizedConcentration * 100);
}

/**
 * Calculate returns score
 * For now, simple P/L percentage normalized to 0-100
 */
function calculateReturnsScore(portfolio) {
    const totalInvested = portfolio.reduce((sum, stock) =>
        sum + (stock.buy_price * stock.quantity), 0
    );

    if (totalInvested === 0) return 50; // neutral

    // Mock current value (10% gain for demo)
    const currentValue = totalInvested * 1.1;
    const returns = ((currentValue - totalInvested) / totalInvested) * 100;

    // Map -20% to +20% returns to 0-100 scale
    // 0% returns = 50 score
    const normalizedReturns = 50 + (returns * 2.5);

    return Math.max(0, Math.min(100, normalizedReturns));
}

/**
 * Generate AI-friendly portfolio summary for Gemini prompt
 */
export function generatePortfolioSummary(portfolio) {
    const totalInvested = portfolio.reduce((sum, stock) =>
        sum + (stock.buy_price * stock.quantity), 0
    );

    const holdings = portfolio.map(stock => ({
        symbol: stock.stock_symbol,
        quantity: stock.quantity,
        avgPrice: stock.buy_price,
        value: stock.buy_price * stock.quantity,
        percentage: ((stock.buy_price * stock.quantity) / totalInvested * 100).toFixed(1),
    }));

    return {
        totalInvested,
        numberOfHoldings: portfolio.length,
        holdings,
        health: calculatePortfolioHealth(portfolio),
    };
}

/**
 * Generate AI insights prompt
 */
export function generateAIInsightsPrompt(portfolioSummary) {
    const { holdings, health, totalInvested, numberOfHoldings } = portfolioSummary;

    return `You are a trading education assistant for TradeGuru, an AI-powered learning platform for Indian retail investors.

CRITICAL RULES:
- Never give specific buy/sell recommendations
- Always emphasize user's own research
- Explain concepts, don't predict markets
- Include risk disclaimer
- Keep responses beginner-friendly

Analyze this portfolio:
- Total invested: ₹${totalInvested.toLocaleString()}
- Number of holdings: ${numberOfHoldings}
- Health score: ${health.score}/100
  - Diversification: ${health.breakdown.diversification}/100
  - Risk: ${health.breakdown.risk}/100
  - Returns: ${health.breakdown.returns}/100

Holdings:
${holdings.map(h => `- ${h.symbol}: ${h.percentage}% (₹${h.value.toLocaleString()})`).join('\n')}

Provide:
1. Brief portfolio summary (2 sentences)
2. Key strength (1 sentence)
3. Main risk/concern (1 sentence)
4. One educational suggestion to improve diversification or risk (no specific stock recommendations)

Keep total response under 150 words. Use simple language suitable for beginners.`;
}

/**
 * Generate "Why" explanation prompt for a specific metric
 */
export function generateWhyPrompt(metric, value, portfolioSummary) {
    const prompts = {
        diversification: `Explain why this portfolio has a diversification score of ${value}/100 in simple terms. The portfolio has ${portfolioSummary.numberOfHoldings} holdings. Keep it under 50 words.`,

        risk: `Explain why this portfolio has a risk score of ${value}/100 in beginner-friendly language. Consider the concentration of holdings. Keep it under 50 words.`,

        returns: `Explain why this portfolio has a returns score of ${value}/100. Avoid making predictions. Keep it under 50 words.`,
    };

    return prompts[metric] || '';
}
