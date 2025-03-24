/**
 * News Simulator
 * 
 * This script helps simulate news data for testing without an actual backend.
 * It provides mock data for news articles, market stats, and related content.
 * 
 * Usage:
 * 1. Import this script in your React app
 * 2. The simulator will automatically override fetch for /news/ endpoints
 */

// Enable simulation in dev mode
const enableNewsSimulation = process.env.NODE_ENV === 'development';
console.log(`News simulator ${enableNewsSimulation ? 'ENABLED' : 'DISABLED'} for ${process.env.NODE_ENV} environment`);

// Sample news data array
const sampleNews = [
  {
    id: "news123",
    title: "Tech Industry Faces New Global Challenges",
    summary: "Recent developments in the tech sector have led to significant changes in how companies approach global markets, with increasing regulatory scrutiny.",
    content: "Technology companies worldwide are facing unprecedented challenges as they navigate increasingly complex global markets. Rising tensions between major economies, supply chain disruptions, and evolving regulatory frameworks have created a perfect storm for the industry.",
    source: "Tech Chronicle",
    source_id: "techchronicle",
    author: "Alex Rivera",
    pub_time: new Date(Date.now() - 3600000).toISOString(),
    canonical: "https://example.com/tech-industry-challenges",
    preview: "/static/3d.webp",
    genre: "Analysis"
  },
  {
    id: "news456",
    title: "Financial Markets Rally on Positive Economic Data",
    summary: "Global markets saw significant gains as new economic indicators showed stronger than expected growth in major economies.",
    content: "Investors around the world celebrated today as several key economic indicators revealed unexpected strength in major economies. The data suggests that fears of a slowdown may have been premature, sending equity markets on their biggest rally of the year.",
    source: "Market Watch Daily",
    source_id: "marketwatch",
    author: "Sophia Chen",
    pub_time: new Date(Date.now() - 7200000).toISOString(),
    canonical: "https://example.com/markets-rally",
    preview: "/static/newscloud.webp",
    genre: "News"
  },
  {
    id: "news789",
    title: "New Renewable Energy Breakthrough Announced",
    summary: "Scientists reveal a major advancement in solar cell efficiency that could revolutionize clean energy production worldwide.",
    content: "A team of researchers at the National Renewable Energy Laboratory has announced a breakthrough in photovoltaic technology that could reduce solar energy costs by over 50%. The innovation promises to make renewable energy competitive with fossil fuels without government subsidies.",
    source: "Science Today",
    source_id: "sciencetoday",
    author: "Marcus Johnson",
    pub_time: new Date(Date.now() - 14400000).toISOString(),
    canonical: "https://example.com/solar-breakthrough",
    preview: "/static/newspaper.webp",
    genre: "Science & Education"
  },
  {
    id: "newsabc",
    title: "Startup Secures $100M for AI Healthcare Platform",
    summary: "Healthcare AI startup raises significant funding to expand their diagnostic platform to hospitals worldwide.",
    content: "MediMind, a startup specializing in AI-powered medical diagnostics, has secured $100 million in Series C funding. The investment will help the company deploy its technology in hospitals across North America, Europe, and Asia, potentially improving diagnostic accuracy for millions of patients.",
    source: "Venture Beat",
    source_id: "venturebeat",
    author: "Priya Sharma",
    pub_time: new Date(Date.now() - 28800000).toISOString(),
    canonical: "https://example.com/ai-healthcare-funding",
    preview: "/static/bubble.webp",
    genre: "News"
  }
];

// Generate market stats for a news item
const generateMarketStats = (newsId) => {
  const basePrice = 0.05 + (Math.random() * 0.15); // 5-20 cents base price
  const currentPrice = Math.max(0.01, basePrice + (Math.random() * 0.1 - 0.05)); // Add some variation
  
  return {
    current_price: parseFloat(currentPrice.toFixed(4)),
    volume: parseFloat((1000 + Math.random() * 9000).toFixed(2)),
    user_count: Math.floor(10 + Math.random() * 90),
    market_cap: parseFloat((currentPrice * (10000 + Math.random() * 90000)).toFixed(2)),
    total_shares: Math.floor(10000 + Math.random() * 90000),
    stats: {
      sentiment: {
        long: Math.floor(50 + Math.random() * 30),
        short: Math.floor(20 + Math.random() * 30)
      }
    }
  };
};

// Generate related news for a news item
const generateRelatedNews = (currentNewsId) => {
  // Return other news items except the current one
  return sampleNews
    .filter(news => news.id !== currentNewsId)
    .map(news => ({
      id: news.id,
      title: news.title,
      summary: news.summary,
      source: news.source,
      pub_time: news.pub_time
    }));
};

// Generate order book data
const generateOrderBook = () => {
  const bids = [];
  const asks = [];
  
  // Generate bids (buy orders) - start at 0.01 lower than current price
  const basePrice = 0.05 + (Math.random() * 0.05);
  for (let i = 1; i <= 5; i++) {
    bids.push({
      price: parseFloat((basePrice - (i * 0.01)).toFixed(4)),
      volume: Math.floor(5 + Math.random() * 45)
    });
  }
  
  // Generate asks (sell orders) - start at 0.01 higher than current price
  for (let i = 1; i <= 5; i++) {
    asks.push({
      price: parseFloat((basePrice + (i * 0.01)).toFixed(4)),
      volume: Math.floor(5 + Math.random() * 45)
    });
  }
  
  return { bids, asks };
};

// Function to intercept fetch calls to news endpoints
function interceptFetch() {
  const originalFetch = window.fetch;
  
  window.fetch = async function(url, options) {
    // Only intercept if news simulation is enabled
    if (!enableNewsSimulation) {
      return originalFetch(url, options);
    }
    
    // Convert URL object to string if needed
    const urlString = url instanceof Request ? url.url : url.toString();
    
    // Check if this is a news endpoint
    if (urlString.includes('/news/')) {
      console.log('News simulator intercepting:', urlString);
      
      // Extract news ID from URL
      const matches = urlString.match(/\/news\/([^\/]+)/);
      const newsId = matches ? matches[1] : null;
      
      // Handle specific news item request
      if (newsId && !urlString.includes('/related')) {
        // Find the news item in our sample data or generate one
        const newsItem = sampleNews.find(item => item.id === newsId) || {
          id: newsId,
          title: `Generated Article ${newsId}`,
          summary: "This is an automatically generated article for development purposes.",
          content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam euismod, nisl eget aliquam ultricies, nunc nisl aliquet nunc, quis aliquam nisl nunc quis nisl.",
          source: "Development News",
          source_id: "devnews",
          author: "Dev Team",
          pub_time: new Date().toISOString(),
          canonical: "https://example.com/article",
          preview: "/static/3d.webp",
          genre: "Miscellaneous"
        };
        
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              status: 200,
              json: () => Promise.resolve(newsItem),
              text: () => Promise.resolve(JSON.stringify(newsItem))
            });
          }, 300); // Simulate network delay
        });
      }
      
      // Handle related news request
      else if (newsId && urlString.includes('/related')) {
        const relatedArticles = generateRelatedNews(newsId);
        
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              status: 200,
              json: () => Promise.resolve(relatedArticles),
              text: () => Promise.resolve(JSON.stringify(relatedArticles))
            });
          }, 300);
        });
      }
      
      // Handle news list request
      else if (urlString.endsWith('/news') || urlString.endsWith('/news/')) {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              status: 200,
              json: () => Promise.resolve(sampleNews),
              text: () => Promise.resolve(JSON.stringify(sampleNews))
            });
          }, 300);
        });
      }
    }
    
    // Handle market stats request
    else if (urlString.includes('/market/') && urlString.includes('/stats')) {
      const matches = urlString.match(/\/market\/([^\/]+)\/stats/);
      const newsId = matches ? matches[1] : 'unknown';
      const stats = generateMarketStats(newsId);
      
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(stats),
            text: () => Promise.resolve(JSON.stringify(stats))
          });
        }, 200);
      });
    }
    
    // Handle order book request
    else if (urlString.includes('/market/') && urlString.includes('/orderbook')) {
      const orderBook = generateOrderBook();
      
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(orderBook),
            text: () => Promise.resolve(JSON.stringify(orderBook))
          });
        }, 200);
      });
    }
    
    // For all other requests, use the original fetch
    return originalFetch(url, options);
  };
  
  console.log('News simulator has intercepted fetch API for /news/ endpoints');
}

// Set up the interception if in development mode
if (enableNewsSimulation) {
  interceptFetch();
}

// Export sample data generation functions for use in components
export const createSampleNews = (newsId) => {
  return sampleNews.find(item => item.id === newsId) || {
    id: newsId || `news-${Date.now()}`,
    title: "Sample Article for Development",
    summary: "This is a sample article generated for development purposes when API calls fail.",
    content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    source: "Development Environment",
    source_id: "dev",
    author: "Dev Team",
    pub_time: new Date().toISOString(),
    canonical: "https://example.com/sample",
    preview: "/static/3d.webp",
    genre: "Miscellaneous"
  };
};

export const createSampleMarketStats = () => {
  return generateMarketStats();
};

export const createSampleRelatedNews = () => {
  return sampleNews.slice(0, 3).map(news => ({
    id: news.id,
    title: news.title,
    summary: news.summary,
    source: news.source,
    pub_time: news.pub_time
  }));
};

export const createSampleOrderBook = () => {
  return generateOrderBook();
};

export default {
  createSampleNews,
  createSampleMarketStats,
  createSampleRelatedNews,
  createSampleOrderBook
};