import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import NewsCard from './components/NewsCard';
import NewsFullScreen from './components/NewsFullScreen';

// Desktop specific implementation
const NewsColossalDesktop = ({ 
  news, 
  handleCardClick, 
  showBottomSearch, 
  setShowBottomSearch,
  searchQuery,
  handleSearchChange,
  isLoadingMore,
  loadMoreNews
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [fullScreenNews, setFullScreenNews] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const containerRef = useRef(null);

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
          if (scrollHeight - scrollTop - clientHeight < 500 && !isLoadingMore) {
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
  }, [scrollLeft, showBottomSearch, isLoadingMore, loadMoreNews, setShowBottomSearch]);

  // Mouse events for desktop
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartX(e.pageX);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const x = e.pageX;
    const distance = x - startX;
    
    if (Math.abs(distance) > 50) {
      if (distance > 0 && activeIndex > 0) {
        setActiveIndex(activeIndex - 1);
      } else if (distance < 0 && activeIndex < news.length - 1) {
        setActiveIndex(activeIndex + 1);
      }
      setIsDragging(false);
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <>
      <div 
        ref={containerRef}
        className="news-carousel desktop"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {news.map((item, index) => {
          let gridPosition = 'grid-item';
          let cardStyle = {};
          
          if (index === news.length - 1) {
            cardStyle.marginBottom = '100px';
          }
          
          const isActive = index === activeIndex;
          
          return (
            <NewsCard 
              key={item.uuid}
              news={item}
              isActive={isActive}
              onClick={(uuid) => {
                setFullScreenNews(news.find(n => n.uuid === uuid));
                handleCardClick(uuid);
              }}
              style={cardStyle}
              isMobile={false}
              gridPosition={gridPosition}
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
      
      {news.length > 0 && !isLoadingMore && (
        <div className="show-more-container">
          <button className="show-more-button" onClick={loadMoreNews}>
            Show More News
          </button>
        </div>
      )}
    </>
  );
};

export default NewsColossalDesktop;
