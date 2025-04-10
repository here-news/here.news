import React, { useState, useRef, useEffect, useMemo, useCallback, Component } from 'react';
import ReactDOM from 'react-dom';
import NewsCard from './components/NewsCard';
import NewsFullScreen from './components/NewsFullScreen';
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
  const [fullScreenNews, setFullScreenNews] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [changedItems, setChangedItems] = useState(new Set());
  
  // Refs
  const containerRef = useRef(null);
  const previousNewsRef = useRef([]);
  
  // Track component performance and lifecycle
  useEffect(() => {
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
  
  // Create a ref to safely track the current news array
  const newsRef = useRef(news);
  
  // Update the ref whenever news changes
  useEffect(() => {
    newsRef.current = news;
  }, [news]);
  
  // 2. Periodic updates to simulate WebSocket
  useEffect(() => {
    // Only start simulation if setNews is available
    if (!setNews) return;
    
    let isMounted = true;
    let animationTimeoutId = null;
    let updateIntervalId = null;
    
    const updateNewsData = () => {
      if (!isMounted) return;
      
      // Get current news from ref to avoid stale closures
      const currentNews = newsRef.current;
      
      // Skip if we don't have enough news items
      if (!currentNews || currentNews.length < 3) return;
      
      try {
        // Create a new copy of the news array to avoid mutation
        // Use a more stable deep clone method
        const updatedNews = currentNews.map(item => ({...item}));
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
          const change = (Math.random() * 0.1) - 0.05; // Between -0.05 and +0.05 (smaller change to reduce instability)
          let newRatio = Math.max(0.1, Math.min(1.0, currentRatio + change));
          newRatio = Math.round(newRatio * 100) / 100; // Round to 2 decimal places
          
          // Only update if there's an actual change
          if (newRatio !== currentRatio) {
            // Create a new object with the updated ratio
            updatedNews[randomIndex] = {
              ...newsItem,
              belief_ratio: newRatio.toFixed(2)
            };
            
            // Track this item as changed for animation
            updatedIds.add(newsItem.uuid);
          }
        }
        
        // Only update state if there are actual changes
        if (updatedIds.size > 0 && isMounted) {
          // Use functional update to avoid closure issues with stale state
          setNews(prevNews => {
            // Apply our updates to the current state
            const currentNews = [...prevNews];
            updatedIds.forEach(uuid => {
              const index = currentNews.findIndex(item => item.uuid === uuid);
              if (index !== -1) {
                const matchingUpdatedItem = updatedNews.find(item => item.uuid === uuid);
                if (matchingUpdatedItem) {
                  currentNews[index] = {...matchingUpdatedItem};
                }
              }
            });
            return currentNews;
          });
          
          // Set animation state if component is still mounted
          if (isMounted) {
            setChangedItems(new Set(updatedIds));
            
            // Clear the animation flags after a delay
            if (animationTimeoutId) {
              clearTimeout(animationTimeoutId);
              animationTimeoutId = null;
            }
            
            animationTimeoutId = setTimeout(() => {
              if (isMounted) {
                setChangedItems(new Set());
              }
            }, 1000);
          }
        }
      } catch (error) {
        console.error("Error updating news items:", error);
      }
    };
    
    // Use less frequent updates to reduce potential for state update issues
    updateIntervalId = setInterval(updateNewsData, 15000); // Update every 15 seconds
    
    return () => {
      isMounted = false;
      
      if (updateIntervalId) {
        clearInterval(updateIntervalId);
        updateIntervalId = null;
      }
      
      if (animationTimeoutId) {
        clearTimeout(animationTimeoutId);
        animationTimeoutId = null;
      }
    };
  }, [setNews]); // Only depend on setNews, not news to avoid excessive re-renders

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
                const fullScreenItem = news.find(n => n.uuid === uuid);
                if (fullScreenItem) {
                  setFullScreenNews(fullScreenItem);
                }
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