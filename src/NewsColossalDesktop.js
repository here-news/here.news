import React, { useState, useRef, useEffect, useMemo, useCallback, Component } from 'react';
import ReactDOM from 'react-dom';
import NewsCard from './components/NewsCard';
import NewsFullScreen from './components/NewsFullScreen';
import './NewsCard.css'; // Import the card-specific CSS

// Error Boundary to prevent the entire application from crashing
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("NewsColossalDesktop error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-container" style={{ padding: "20px", color: "#721c24", backgroundColor: "#f8d7da", borderRadius: "5px", marginBottom: "20px" }}>
          <h3>Something went wrong with the news display.</h3>
          <p>Try refreshing the page. If the issue persists, please contact support.</p>
          <button onClick={() => window.location.reload()} style={{ padding: "8px 16px", background: "#dc3545", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Desktop specific implementation
const NewsColossalDesktop = ({ 
  news, 
  handleCardClick, 
  showBottomSearch, 
  setShowBottomSearch,
  searchQuery,
  handleSearchChange,
  isLoadingMore,
  loadMoreNews,
  hasMore,
  totalCount,
  setNews = null
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [fullScreenNews, setFullScreenNews] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [changedItems, setChangedItems] = useState(new Set());
  const containerRef = useRef(null);
  const previousNewsRef = useRef([]);

  // Filter news with belief ratio above threshold (0.5)
  const filteredNews = useMemo(() => {
    return news.filter(item => parseFloat(item.belief_ratio || 0.5) >= 0.5);
  }, [news]);
  
  // Sort news by belief ratio (descending)
  const sortedNews = useMemo(() => {
    // First make sure each item has a unique key
    const uniqueItems = [];
    const uuidSet = new Set();
    
    for (const item of filteredNews) {
      // Only add items with unique UUIDs
      if (!item.uuid || uuidSet.has(item.uuid)) {
        // If no UUID or duplicate, generate a new one
        item.uuid = `${item.uuid || ''}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      }
      
      uuidSet.add(item.uuid);
      uniqueItems.push(item);
    }
    
    // Sort by belief ratio (descending)
    return uniqueItems.sort((a, b) => 
      parseFloat(b.belief_ratio || 0.5) - parseFloat(a.belief_ratio || 0.5)
    );
  }, [filteredNews]);

  // Find featured news item (only the first one)
  const featuredNews = useMemo(() => {
    const featured = new Set();
    if (sortedNews.length > 0) {
      // Only the top item with highest belief ratio is featured
      featured.add(sortedNews[0].uuid);
    }
    return featured;
  }, [sortedNews]);

  // Track scroll for infinite loading and bottom search
  useEffect(() => {
    if (containerRef.current) {
      let scrollCount = 0;
      
      const handleScroll = () => {
        const currentScrollTop = containerRef.current.scrollTop;
        if (currentScrollTop > scrollLeft) {
          scrollCount++;
          
          if (scrollCount >= 10 && !showBottomSearch) {
            setShowBottomSearch(true);
          }
          
          const { scrollHeight, scrollTop, clientHeight } = containerRef.current;
          if (scrollHeight - scrollTop - clientHeight < 500 && !isLoadingMore && hasMore) {
            loadMoreNews();
          }
        }
        
        setScrollLeft(currentScrollTop);
      };
      
      containerRef.current.addEventListener('scroll', handleScroll);
      
      return () => {
        if (containerRef.current) {
          containerRef.current.removeEventListener('scroll', handleScroll);
        }
      };
    }
  }, [scrollLeft, showBottomSearch, isLoadingMore, loadMoreNews, setShowBottomSearch, hasMore]);

  // Split the WebSocket simulation into two effects:
  // 1. Initial assignment of belief ratios
  useEffect(() => {
    if (news.length === 0) return;

    // Create a copy of the news array that we can modify
    const newsWithBeliefRatios = news.map(item => {
      // If it doesn't have a belief ratio, assign a random one
      if (!item.belief_ratio) {
        const initialRatio = Math.random() < 0.8 ? 
          (Math.random() * 0.5 + 0.5) : // 80% chance of value between 0.5-1.0
          (Math.random() * 0.5);        // 20% chance of value between 0.0-0.5
        
        return {
          ...item,
          belief_ratio: initialRatio.toFixed(2)
        };
      }
      return item;
    });
    
    // Update the news array with our modified copy only if we added belief ratios
    if (newsWithBeliefRatios.some((item, idx) => 
        !news[idx].belief_ratio && item.belief_ratio)) {
      setNews([...newsWithBeliefRatios]);
    }
  }, [news, setNews]);
  
  // 2. Periodic updates to simulate WebSocket
  useEffect(() => {
    // Only start simulation if we have news items and setNews is available
    if (!news || news.length < 3 || !setNews) return;
    
    let mounted = true;
    let animationTimeoutId = null;
    
    const updateInterval = setInterval(() => {
      if (!mounted) return;
      
      try {
        // Create a new copy of the news array to avoid mutation
        const updatedNews = JSON.parse(JSON.stringify(news)); // Deep clone to avoid reference issues
        const updatedIds = new Set();
        
        // Update 1-3 random items
        const numToUpdate = Math.floor(Math.random() * 3) + 1;
        
        for (let i = 0; i < numToUpdate; i++) {
          const randomIndex = Math.floor(Math.random() * updatedNews.length);
          if (randomIndex >= updatedNews.length) continue;
          
          const newsItem = updatedNews[randomIndex];
          if (!newsItem || !newsItem.uuid) continue;
          
          // Get current belief ratio and calculate a new one
          const currentRatio = parseFloat(newsItem.belief_ratio || 0.5);
          const change = (Math.random() * 0.2) - 0.1; // Between -0.1 and +0.1
          let newRatio = Math.max(0.1, Math.min(1.0, currentRatio + change));
          newRatio = Math.round(newRatio * 100) / 100; // Round to 2 decimal places
          
          // Create a new object with the updated ratio
          updatedNews[randomIndex] = {
            ...newsItem,
            belief_ratio: newRatio.toFixed(2)
          };
          
          // Track this item as changed for animation
          updatedIds.add(newsItem.uuid);
        }
        
        // Update the news array and changed items set
        if (mounted) {
          setNews(updatedNews);
          setChangedItems(updatedIds);
          
          // Clear the animation flags after a delay
          // First clear any existing timeout to prevent memory leaks
          if (animationTimeoutId) {
            clearTimeout(animationTimeoutId);
          }
          
          animationTimeoutId = setTimeout(() => {
            if (mounted) {
              setChangedItems(new Set());
            }
          }, 1000);
        }
      } catch (error) {
        console.error("Error updating news items:", error);
      }
    }, 10000); // Update every 10 seconds
    
    return () => {
      mounted = false;
      clearInterval(updateInterval);
      
      // Clean up any pending animation timeout
      if (animationTimeoutId) {
        clearTimeout(animationTimeoutId);
      }
    };
  }, [news, setNews]);

  // Mouse events for desktop with useCallback for stable references
  const handleMouseDown = useCallback((e) => {
    setIsDragging(true);
    setStartX(e.pageX);
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    
    const x = e.pageX;
    const distance = x - startX;
    
    if (Math.abs(distance) > 50) {
      if (distance > 0 && activeIndex > 0) {
        setActiveIndex(prev => prev - 1);
      } else if (distance < 0 && activeIndex < sortedNews.length - 1) {
        setActiveIndex(prev => prev + 1);
      }
      setIsDragging(false);
    }
  }, [isDragging, startX, activeIndex, sortedNews.length]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add handlers with useEffect for better cleanup
  useEffect(() => {
    // Create stable reference to handler function
    const mouseUpHandler = () => setIsDragging(false);
    
    // Use the document for event handlers to ensure they work even when cursor moves too quickly
    document.addEventListener('mouseup', mouseUpHandler);
    document.addEventListener('mouseleave', mouseUpHandler);
    
    return () => {
      document.removeEventListener('mouseup', mouseUpHandler);
      document.removeEventListener('mouseleave', mouseUpHandler);
    };
  }, []);

  return (
    <>
      <div 
        ref={containerRef}
        className="publication-grid"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
      >
        {sortedNews.map((item, index) => {
          // Determine if this is a featured card
          const isFeatured = featuredNews.has(item.uuid);
          const beliefRatio = parseFloat(item.belief_ratio || 0.5);
          
          // Add specific classes for featured items and animations
          const isActive = index === activeIndex;
          const hasChanged = changedItems.has(item.uuid);
          const cardClasses = `${isFeatured ? 'featured' : ''} ${hasChanged ? 'belief-changed' : ''}`;
          
          return (
            <NewsCard 
              key={item.uuid}
              news={item}
              isActive={isActive}
              onClick={(uuid) => {
                setFullScreenNews(news.find(n => n.uuid === uuid));
                handleCardClick(uuid);
              }}
              isMobile={false}
              extraClasses={cardClasses}
            />
          );
        })}
      </div>
      
      <div className={`bottom-search-container ${showBottomSearch ? 'visible' : ''}`}>
        <div className="bottom-search-bar">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search news..."
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      {fullScreenNews && ReactDOM.createPortal(
        <NewsFullScreen 
          news={fullScreenNews} 
          onClose={() => setFullScreenNews(null)}
          isMobile={false} 
        />,
        document.body
      )}
      
      {isLoadingMore && (
        <div className="loading-more-indicator">
          <div className="loading-more-spinner"></div>
        </div>
      )}
      
      {hasMore && news.length > 0 && !isLoadingMore && (
        <div className="show-more-container">
          <button className="show-more-button" onClick={loadMoreNews}>
            Show More News
          </button>
        </div>
      )}
      
      {totalCount > 0 && (
        <div className="results-count">
          Showing {sortedNews.length} of {totalCount} news items
        </div>
      )}
    </>
  );
};

// Wrap the component in the error boundary
const NewsColossalDesktopWithErrorBoundary = (props) => (
  <ErrorBoundary>
    <NewsColossalDesktop {...props} />
  </ErrorBoundary>
);

export default NewsColossalDesktopWithErrorBoundary;