// Real Stock Data Integration using Yahoo Finance API via CORS Proxy
// 100% FREE - No API key required!

const CORS_PROXY = 'https://corsproxy.io/?';

/**
 * Popular Indian stocks for quick selection
 */
export const POPULAR_STOCKS = [
    { symbol: 'RELIANCE.NS', name: 'Reliance Industries' },
    { symbol: 'TCS.NS', name: 'Tata Consultancy Services' },
    { symbol: 'HDFCBANK.NS', name: 'HDFC Bank' },
    { symbol: 'INFY.NS', name: 'Infosys' },
    { symbol: 'ICICIBANK.NS', name: 'ICICI Bank' },
    { symbol: 'HINDUNILVR.NS', name: 'Hindustan Unilever' },
    { symbol: 'SBIN.NS', name: 'State Bank of India' },
    { symbol: 'BHARTIARTL.NS', name: 'Bharti Airtel' },
    { symbol: 'KOTAKBANK.NS', name: 'Kotak Mahindra Bank' },
    { symbol: 'ITC.NS', name: 'ITC Limited' },
    { symbol: 'LT.NS', name: 'Larsen & Toubro' },
    { symbol: 'AXISBANK.NS', name: 'Axis Bank' },
    { symbol: 'ASIANPAINT.NS', name: 'Asian Paints' },
    { symbol: 'MARUTI.NS', name: 'Maruti Suzuki' },
    { symbol: 'WIPRO.NS', name: 'Wipro' },
    { symbol: 'TITAN.NS', name: 'Titan Company' },
    { symbol: 'BAJFINANCE.NS', name: 'Bajaj Finance' },
    { symbol: 'SUNPHARMA.NS', name: 'Sun Pharma' },
    { symbol: 'TATAMOTORS.NS', name: 'Tata Motors' },
    { symbol: 'NTPC.NS', name: 'NTPC' },
];

/**
 * Search for stock symbols with autocomplete
 * @param {string} query - Search term (e.g., "RELI")
 * @returns {Array} - List of matching stocks
 */
export async function searchStocks(query) {
    if (!query || query.length < 2) return [];

    try {
        const apiUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`;
        const response = await fetch(CORS_PROXY + encodeURIComponent(apiUrl));

        if (!response.ok) {
            console.error('Stock search failed:', response.status);
            // Fallback to local search
            return searchStocksLocal(query);
        }

        const data = await response.json();

        const results = (data.quotes || [])
            .filter(quote => quote.exchange && (quote.exchange.includes('NSE') || quote.exchange.includes('BSE')))
            .map(quote => ({
                symbol: quote.symbol,
                name: quote.longname || quote.shortname || quote.symbol,
                exchange: quote.exchange,
                type: quote.quoteType,
            }))
            .slice(0, 10);

        // If no results from API, use local search
        return results.length > 0 ? results : searchStocksLocal(query);
    } catch (error) {
        console.error('Error searching stocks:', error);
        // Fallback to local search on error
        return searchStocksLocal(query);
    }
}

/**
 * Local/offline stock search from curated list
 */
function searchStocksLocal(query) {
    const lowerQuery = query.toLowerCase();

    return POPULAR_STOCKS
        .filter(stock =>
            stock.symbol.toLowerCase().includes(lowerQuery) ||
            stock.name.toLowerCase().includes(lowerQuery)
        )
        .map(stock => ({
            symbol: stock.symbol,
            name: stock.name,
            exchange: 'NSE',
            type: 'EQUITY'
        }))
        .slice(0, 10);
}

/**
 * Get current stock price using Yahoo Finance
 * @param {string} symbol - Stock symbol (e.g., "RELIANCE.NS")
 * @returns {Object} - Current price data
 */
export async function getStockPrice(symbol) {
    try {
        // Ensure Indian stocks have .NS suffix for NSE
        const formattedSymbol = symbol.includes('.') ? symbol : `${symbol}.NS`;

        const apiUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${formattedSymbol}?interval=1d&range=1d`;
        const response = await fetch(CORS_PROXY + encodeURIComponent(apiUrl));

        if (!response.ok) {
            throw new Error('Failed to fetch stock price');
        }

        const data = await response.json();
        const result = data.chart.result[0];

        if (!result?.meta?.regularMarketPrice) {
            throw new Error('No price data available');
        }

        const meta = result.meta;
        const quote = result.indicators.quote[0];
        const latestIndex = quote.close.length - 1;

        return {
            symbol: meta.symbol,
            price: meta.regularMarketPrice,
            previousClose: meta.previousClose,
            open: quote.open[latestIndex] || meta.regularMarketPrice,
            high: quote.high[latestIndex] || meta.regularMarketPrice,
            low: quote.low[latestIndex] || meta.regularMarketPrice,
            close: quote.close[latestIndex] || meta.regularMarketPrice,
            volume: quote.volume[latestIndex] || 0,
            change: meta.regularMarketPrice - meta.previousClose,
            changePercent: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100,
            currency: meta.currency || 'INR',
        };
    } catch (error) {
        console.error('Error fetching stock price:', error);
        return null;
    }
}

/**
 * Get OHLC (Open, High, Low, Close) data for a period
 * @param {string} symbol - Stock symbol
 * @param {string} range - Time range (1d, 5d, 1mo, 3mo, 6mo, 1y, 5y)
 * @returns {Array} - Array of OHLC data points
 */
export async function getOHLCData(symbol, range = '1mo') {
    try {
        const formattedSymbol = symbol.includes('.') ? symbol : `${symbol}.NS`;

        const apiUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${formattedSymbol}?interval=1d&range=${range}`;
        const response = await fetch(CORS_PROXY + encodeURIComponent(apiUrl));

        if (!response.ok) {
            throw new Error('Failed to fetch OHLC data');
        }

        const data = await response.json();
        const result = data.chart.result[0];

        if (!result?.timestamp) {
            throw new Error('No OHLC data available');
        }

        const timestamps = result.timestamp;
        const quote = result.indicators.quote[0];

        return timestamps.map((timestamp, i) => ({
            date: new Date(timestamp * 1000).toLocaleDateString(),
            timestamp: timestamp,
            open: quote.open[i],
            high: quote.high[i],
            low: quote.low[i],
            close: quote.close[i],
            volume: quote.volume[i],
        })).filter(d => d.close !== null);
    } catch (error) {
        console.error('Error fetching OHLC data:', error);
        return [];
    }
}
