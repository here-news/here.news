import React, { useState, useRef, useEffect, useMemo, useCallback, Component } from 'react';
import ReactDOM from 'react-dom';
import NewsCard from './components/NewsCard';
import './NewsCard.css'; // Import the card-specific CSS

// Error Boundary to prevent the entire application from crashing
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
      errorCount: 0,
      lastErrorTime: null,
      // Keep track of when component was mounted for debugging
      mountTime: Date.now()
    };
  }

  static getDerivedStateFromError(error) {
    return { 
      hasError: true, 
      error,
      errorCount: 1,
      lastErrorTime: Date.now()
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error for debugging
    console.error("NewsColossalDesktop error:", error, errorInfo);
    
    // Update state with error details for recovery logic
    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1,
      lastErrorTime: Date.now()
    }));
    
    // Log to analytics or monitoring services if available
    if (window.onerror) {
      window.onerror(
        `NewsColossalDesktop Error: ${error.message}`,
        null, // filename - not applicable
        null, // line number - not applicable
        null, // column number - not applicable
        error // actual error object
      );
    }
  }
  
  // Try to recover automatically after a short delay
  componentDidUpdate(prevProps, prevState) {
    if (this.state.hasError && !prevState.hasError) {
      // Set a timer to auto-recover after 5 seconds
      this.recoveryTimer = setTimeout(() => {
        this.handleRecover();
      }, 5000);
    }
  }
  
  componentWillUnmount() {
    // Clean up any timers
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
    }
  }
  
  // Method to reset the error state and recover
  handleRecover = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-container" style={{ 
          padding: "20px", 
          color: "#721c24", 
          backgroundColor: "#f8d7da", 
          borderRadius: "5px", 
          marginBottom: "20px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          maxWidth: "800px",
          margin: "20px auto"
        }}>
          <h3>Something went wrong with the news display</h3>
          <p>We're experiencing a temporary issue loading the news content.</p>
          <p>Error: {this.state.error?.message || "Unknown error"}</p>
          <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
            <button 
              onClick={this.handleRecover} 
              style={{ 
                padding: "8px 16px", 
                background: "#007bff", 
                color: "white", 
                border: "none", 
                borderRadius: "4px", 
                cursor: "pointer" 
              }}
            >
              Try Again
            </button>
            <button 
              onClick={() => window.location.reload()} 
              style={{ 
                padding: "8px 16px", 
                background: "#dc3545", 
                color: "white", 
                border: "none", 
                borderRadius: "4px", 
                cursor: "pointer" 
              }}
            >
              Reload Page
            </button>
          </div>
          <p style={{ fontSize: "12px", color: "#666", marginTop: "15px" }}>
            The page will automatically try to recover in a few seconds...
          </p>
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
  // Component lifecycle tracking
  const [componentState, setComponentState] = useState({
    isInitialized: false,
    hasError: false,
    lastRenderTime: Date.now(),
    renderCount: 0
  });
  
  // Basic state
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [changedItems, setChangedItems] = useState(new Set());
  
  // Refs
  const containerRef = useRef(null);
  const previousNewsRef = useRef([]);
  
  // Track component performance and lifecycle
  useEffect(() => {
    // Reset scroll position of container when component mounts
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
    
    // Mark as initialized on first render
    if (!componentState.isInitialized) {
      setComponentState(prev => ({
        ...prev,
        isInitialized: true,
        lastRenderTime: Date.now()
      }));
    }
    
    // Update render count on each render
    setComponentState(prev => ({
      ...prev,
      renderCount: prev.renderCount + 1,
      lastRenderTime: Date.now()
    }));
    
    return () => {
      // Final state update for diagnostics
      console.log(`NewsColossalDesktop unmounted after ${componentState.renderCount} renders`);
    };
  }, []);
  
  // Error handling
  useEffect(() => {
    const handleError = (event) => {
      console.error("Runtime error caught:", event.error);
      
      // Mark component as having an error
      setComponentState(prev => ({
        ...prev,
        hasError: true,
        errorMessage: event.error?.message || "Unknown error"
      }));
    };
    
    // Global error handler
    window.addEventListener('error', handleError);
    
    return () => {
      window.removeEventListener('error', handleError);
    };
  }, []);

  // Filter news with belief ratio above threshold (0.5)
  const filteredNews = useMemo(() => {
    return news.filter(item => {
      // Use yes_price, belief_ratio, or current_value (in order of preference)
      const beliefMetric = 
        parseFloat(item.yes_price) || 
        parseFloat(item.belief_ratio) || 
        parseFloat(item.current_value) || 
        0.5;
      return beliefMetric >= 0.01; // Keep all items with any positive value
    });
  }, [news]);
  
  // Sort news by trending metrics (use volume for trending tab)
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
    
    // Log available sorting metrics for debugging
    if (uniqueItems.length > 0) {
      const sampleItem = uniqueItems[0];
      console.log('Available sorting metrics:', {
        has_trending_score: 'trending_score' in sampleItem,
        has_normalized_volume: 'normalized_volume' in sampleItem,
        has_total_volume: 'total_volume' in sampleItem,
        has_market_cap: 'market_cap' in sampleItem,
        trending_score: sampleItem.trending_score,
        sample_uuid: sampleItem.uuid?.substring(0, 8)
      });
    }
    
    // Priority for sorting:
    // 1. trending_score (from our enhanced trending algorithm)
    // 2. normalized_volume (also from trending algorithm)
    // 3. total_volume (raw trading volume)
    // 4. belief_ratio (only as last resort)
    return uniqueItems.sort((a, b) => {
      // PRIMARY SORT: By trending_score (from the enhanced algorithm)
      const aTrendingScore = typeof a.trending_score === 'number' ? a.trending_score : null;
      const bTrendingScore = typeof b.trending_score === 'number' ? b.trending_score : null;
      
      // If both items have a trending_score, use that for comparison
      if (aTrendingScore !== null && bTrendingScore !== null) {
        return bTrendingScore - aTrendingScore; // Higher score first
      }
      
      // SECONDARY SORT: By normalized_volume (also from trending algorithm)
      const aNormVolume = typeof a.normalized_volume === 'number' ? a.normalized_volume : null;
      const bNormVolume = typeof b.normalized_volume === 'number' ? b.normalized_volume : null;
      
      if (aNormVolume !== null && bNormVolume !== null) {
        return bNormVolume - aNormVolume; // Higher volume first
      }
      
      // TERTIARY SORT: By total_volume (raw trading data)
      const aVolume = parseFloat(a.total_volume) || 0;
      const bVolume = parseFloat(b.total_volume) || 0;
      if (aVolume !== bVolume) return bVolume - aVolume;
      
      // FALLBACK: By belief_ratio (only as last resort)
      const aBelief = parseFloat(a.belief_ratio) || parseFloat(a.yes_price) || 0.5;
      const bBelief = parseFloat(b.belief_ratio) || parseFloat(b.yes_price) || 0.5;
      return bBelief - aBelief;
    });
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
    // Guard against running if we don't have a container
    if (!containerRef.current) return;
    
    // Create stable reference to the container
    const container = containerRef.current;
    let scrollCount = 0;
    let scrollTimer = null;
    let throttleTimer = null;
    let isMounted = true; // Flag to track if component is still mounted
    
    const handleScroll = () => {
      if (!isMounted || !container) return;
      
      try {
        const currentScrollTop = container.scrollTop;
        
        // Show search bar after scrolling down a bit
        if (currentScrollTop > scrollLeft && isMounted) {
          scrollCount++;
          
          if (scrollCount >= 10 && !showBottomSearch && isMounted) {
            setShowBottomSearch(true);
          }
        }
        
        // Check for infinite scroll trigger
        const { scrollHeight, scrollTop, clientHeight } = container;
        const scrollThreshold = 500; // Load more when user is within 500px of bottom
        
        if (scrollHeight - scrollTop - clientHeight < scrollThreshold && 
            !isLoadingMore && hasMore && isMounted) {
          // Use a debounce to prevent multiple rapid calls when scrolling
          if (scrollTimer) {
            clearTimeout(scrollTimer);
            scrollTimer = null;
          }
          
          scrollTimer = setTimeout(() => {
            if (isMounted) {
              loadMoreNews();
            }
          }, 300); // 300ms debounce
        }
        
        if (isMounted) {
          setScrollLeft(currentScrollTop);
        }
      } catch (error) {
        console.error("Error in scroll handler:", error);
      }
    };
    
    // Add throttling to reduce excessive calls on fast scrolling
    let isThrottled = false;
    const throttledScroll = () => {
      if (!isThrottled && isMounted) {
        handleScroll();
        isThrottled = true;
        
        // Reset throttle after 100ms
        if (throttleTimer) {
          clearTimeout(throttleTimer);
        }
        
        throttleTimer = setTimeout(() => { 
          isThrottled = false;
          throttleTimer = null;
        }, 100);
      }
    };
    
    // Use passive listener for better performance
    container.addEventListener('scroll', throttledScroll, { passive: true });
    
    // Comprehensive cleanup function
    return () => {
      isMounted = false; // Mark component as unmounted
      
      // Clean up all timers
      if (scrollTimer) {
        clearTimeout(scrollTimer);
        scrollTimer = null;
      }
      
      if (throttleTimer) {
        clearTimeout(throttleTimer);
        throttleTimer = null;
      }
      
      // Remove event listener
      container.removeEventListener('scroll', throttledScroll);
    };
  }, [scrollLeft, showBottomSearch, isLoadingMore, loadMoreNews, setShowBottomSearch, hasMore]);

  // Remove simulation effects that randomly update belief ratios
  // The /homepage/trending endpoint now provides real trading data

  // Mouse events for desktop with useCallback for stable references
  const handleMouseDown = useCallback((e) => {
    e.preventDefault(); // Prevent text selection during drag
    setIsDragging(true);
    setStartX(e.pageX);
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    
    try {
      const x = e.pageX;
      const distance = x - startX;
      
      if (Math.abs(distance) > 50) {
        if (distance > 0 && activeIndex > 0) {
          setActiveIndex(prev => Math.max(0, prev - 1));
        } else if (distance < 0 && activeIndex < sortedNews.length - 1) {
          setActiveIndex(prev => Math.min(sortedNews.length - 1, prev + 1));
        }
        setIsDragging(false);
      }
    } catch (error) {
      console.error("Mouse move error:", error);
      setIsDragging(false);
    }
  }, [isDragging, startX, activeIndex, sortedNews.length]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add handlers with useEffect for better cleanup - use a ref to track component mounted state
  const isMountedRef = useRef(true);
  
  useEffect(() => {
    // Set mounted flag
    isMountedRef.current = true;
    
    // Stable function that checks mounted state before updating state
    const safeMouseUpHandler = (e) => {
      if (isMountedRef.current) {
        setIsDragging(false);
      }
    };
    
    // Use passive listeners for better performance
    document.addEventListener('mouseup', safeMouseUpHandler, { passive: true });
    document.addEventListener('mouseleave', safeMouseUpHandler, { passive: true });
    
    return () => {
      // Mark component as unmounted
      isMountedRef.current = false;
      
      // Clean up event listeners
      document.removeEventListener('mouseup', safeMouseUpHandler);
      document.removeEventListener('mouseleave', safeMouseUpHandler);
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
          // Skip rendering cards with invalid data
          if (!item || !item.uuid) {
            console.warn('Skipped rendering card with invalid data', item);
            return null;
          }
          
          try {
            // Determine if this is a featured card
            const isFeatured = featuredNews.has(item.uuid);
            const beliefRatio = parseFloat(item.belief_ratio || 0.5);
            
            // Add specific classes for featured items and animations
            const isActive = index === activeIndex;
            const hasChanged = changedItems.has(item.uuid);
            const cardClasses = `${isFeatured ? 'featured' : ''} ${hasChanged ? 'belief-changed' : ''}`;
            
            // Safe handler for card clicks with error handling
            const handleCardItemClick = (uuid) => {
              try {
                if (handleCardClick) {
                  handleCardClick(uuid);
                }
              } catch (error) {
                console.error("Error handling card click:", error);
              }
            };
            
            return (
              <NewsCard 
                key={item.uuid}
                news={item}
                isActive={isActive}
                onClick={handleCardItemClick}
                isMobile={false}
                extraClasses={cardClasses}
              />
            );
          } catch (error) {
            console.error("Error rendering news card:", error, item);
            return null;
          }
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
      
      {isLoadingMore && (
        <div className="loading-more-indicator">
          <div className="loading-more-spinner"></div>
        </div>
      )}
      
      {hasMore && news.length > 0 && !isLoadingMore && (
        <div className="show-more-container">
          <button 
            className="show-more-button" 
            onClick={loadMoreNews}
            aria-label={`Load more news items (${sortedNews.length} of ${totalCount} loaded)`}
          >
            Show More News ({sortedNews.length} of {totalCount} loaded)
          </button>
        </div>
      )}
      
      {totalCount > 0 && (
        <div className="results-count">
          Showing {sortedNews.length} of {totalCount} news items
          {hasMore && !isLoadingMore && 
            <span className="scroll-hint"> - Scroll down to load more</span>
          }
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