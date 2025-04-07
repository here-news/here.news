import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import NewsCard from './components/NewsCard';
import NewsFullScreen from './components/NewsFullScreen';
import MiniPriceChart from './components/MiniPriceChart';

// Mobile specific implementation
const NewsColossalMobile = ({ news, handleCardClick }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [fullScreenNews, setFullScreenNews] = useState(null);
  const [touchStartY, setTouchStartY] = useState(0);
  const [touchEndY, setTouchEndY] = useState(0);
  const [touchStartX, setTouchStartX] = useState(0);
  const [isCardContentScrolling, setIsCardContentScrolling] = useState(false);
  const [isSwiping, setIsSwiping] = useState(false);
  const cardRefs = useRef([]);
  const prevActiveIndexRef = useRef(activeIndex);

  // Provide haptic feedback
  const provideHapticFeedback = () => {
    if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(50);
  };

  // Genre background helper function for mobile cards
  const getGenreBackground = (genre) => {
    const genreMap = {
      'science': 'linear-gradient(135deg, #4a148c 0%, #7c43bd 100%)',
      'technology': 'linear-gradient(135deg, #4a148c 0%, #7c43bd 100%)',
      'science-technology': 'linear-gradient(135deg, #4a148c 0%, #7c43bd 100%)',
      'environment': 'linear-gradient(135deg, #1b5e20 0%, #4caf50 100%)',
      'economy': 'linear-gradient(135deg, #0d47a1 0%, #2196f3 100%)',
      'finance': 'linear-gradient(135deg, #0d47a1 0%, #2196f3 100%)',
      'health': 'linear-gradient(135deg, #b71c1c 0%, #f44336 100%)',
      'health-technology': 'linear-gradient(135deg, #b71c1c 0%, #f44336 100%)',
      'archaeology': 'linear-gradient(135deg, #795548 0%, #a1887f 100%)',
      'history': 'linear-gradient(135deg, #795548 0%, #a1887f 100%)',
      'politics': 'linear-gradient(135deg, #880e4f 0%, #e91e63 100%)',
      'culture': 'linear-gradient(135deg, #e65100 0%, #ff9800 100%)',
      'sports': 'linear-gradient(135deg, #006064 0%, #00bcd4 100%)',
      'entertainment': 'linear-gradient(135deg, #4a148c 0%, #9c27b0 100%)',
      'news': 'linear-gradient(135deg, #bf360c 0%, #ff5722 100%)'
    };
    
    const normalizedGenre = (genre || 'news').toLowerCase().replace(/\s+|&/g, '-');
    return genreMap[normalizedGenre] || 'linear-gradient(135deg, #37474f 0%, #78909c 100%)';
  };

  // Handle active card changes
  useEffect(() => {
    const activeCardContent = document.querySelector('.news-card.active .card-content');
    if (activeCardContent) activeCardContent.scrollTop = 0;
    
    const activeCard = document.querySelector('.news-card.active');
    if (activeCard) {
      activeCard.style.position = 'fixed';
      activeCard.style.top = '60px';
      activeCard.style.left = '0';
      activeCard.style.right = '0';
      activeCard.style.width = '100%';
      activeCard.style.height = 'calc(100vh - 60px)';
      activeCard.style.transform = 'translateY(0)';
      activeCard.style.zIndex = '1600';
      activeCard.style.opacity = '1';
      activeCard.style.visibility = 'visible';
    }
    
    if (activeIndex === 0) {
      const firstCard = document.querySelector('.news-card:first-child');
      if (firstCard) {
        firstCard.style.position = 'fixed';
        firstCard.style.top = '60px';
        firstCard.style.zIndex = firstCard.classList.contains('active') ? '1600' : '1500';
      }
    }
    
    if (prevActiveIndexRef.current !== activeIndex) {
      provideHapticFeedback();
    }
    
    prevActiveIndexRef.current = activeIndex;
  }, [activeIndex]);

  // Touch handling
  const handleTouchStart = (e) => {
    setTouchStartY(e.touches[0].clientY);
    setTouchStartX(e.touches[0].clientX);
    setIsSwiping(false);
    
    const target = e.target;
    const isInteractive = 
      target.closest('.global-trading-actions') ||
      target.closest('button') ||
      target.closest('a') ||
      target.closest('input');
    
    setIsCardContentScrolling(isInteractive);
  };

  const handleTouchMove = (e) => {
    const touchY = e.touches[0].clientY;
    const touchX = e.touches[0].clientX;
    const deltaY = touchY - touchStartY;
    const deltaX = touchX - touchStartX;
    
    if (isCardContentScrolling) return;
    
    const cardContent = document.querySelector('.news-card.active .card-content');
    const isAtTop = !cardContent || cardContent.scrollTop <= 0;
    const isAtBottom = !cardContent || 
      (cardContent.scrollHeight - cardContent.scrollTop <= cardContent.clientHeight + 5);
    
    const canSwipe = 
      (deltaY > 0 && isAtTop) || 
      (deltaY < 0 && isAtBottom) ||
      Math.abs(deltaY) > 40;
    
    if (Math.abs(deltaY) > Math.abs(deltaX) && canSwipe) {
      try { e.preventDefault(); } catch (error) { /* expected with passive listeners */ }
      
      if (!isSwiping) {
        setIsSwiping(true);
        
        if (deltaY > 0 && activeIndex > 0) {
          const prevCard = document.querySelector(`.news-card:nth-child(${activeIndex})`);
          if (prevCard) {
            prevCard.style.visibility = 'visible';
            prevCard.style.opacity = '0.6';
            prevCard.style.transform = 'translateY(-98%)';
            prevCard.style.transition = 'none';
            prevCard.style.position = 'fixed';
            prevCard.style.top = '60px';
            prevCard.style.left = '0';
            prevCard.style.right = '0';
            prevCard.style.width = '100%';
            prevCard.style.height = 'calc(100vh - 60px)';
          }
        } else if (deltaY < 0 && activeIndex < news.length - 1) {
          const nextCard = document.querySelector(`.news-card:nth-child(${activeIndex + 2})`);
          if (nextCard) {
            nextCard.style.visibility = 'visible';
            nextCard.style.opacity = '0.6';
            nextCard.style.transform = 'translateY(98%)';
            nextCard.style.transition = 'none';
            nextCard.style.position = 'fixed';
            nextCard.style.top = '60px';
            nextCard.style.left = '0';
            nextCard.style.right = '0';
            nextCard.style.width = '100%';
            nextCard.style.height = 'calc(100vh - 60px)';
          }
        }
      }
      
      const activeCard = document.querySelector('.news-card.active');
      if (activeCard) {
        const resistance = 0.3;
        const translateY = deltaY * resistance;
        activeCard.style.transform = `translateY(${translateY}px)`;
        activeCard.style.position = 'fixed';
        activeCard.style.top = '60px';
        
        if (deltaY > 0 && activeIndex > 0) {
          const prevCard = document.querySelector(`.news-card:nth-child(${activeIndex})`);
          if (prevCard) {
            const prevTranslateY = -98 + (deltaY * resistance * 0.5);
            prevCard.style.transform = `translateY(${prevTranslateY}%)`;
            prevCard.style.position = 'fixed';
            prevCard.style.top = '60px';
          }
        } else if (deltaY < 0 && activeIndex < news.length - 1) {
          const nextCard = document.querySelector(`.news-card:nth-child(${activeIndex + 2})`);
          if (nextCard) {
            const nextTranslateY = 98 + (deltaY * resistance * 0.5);
            nextCard.style.transform = `translateY(${nextTranslateY}%)`;
            nextCard.style.position = 'fixed';
            nextCard.style.top = '60px';
          }
        }
      }
      
      setTouchEndY(touchY);
    }
  };

  const handleTouchEnd = () => {
    const activeCard = document.querySelector('.news-card.active');
    if (activeCard) activeCard.style.transform = '';
    
    if (isSwiping) {
      const swipeDistance = touchEndY - touchStartY;
      const minSwipeDistance = 40;
      
      if (Math.abs(swipeDistance) > minSwipeDistance) {
        provideHapticFeedback();
        
        const allCards = document.querySelectorAll('.news-card');
        allCards.forEach(card => card.classList.add('transitioning'));
        
        if (swipeDistance > 0 && activeIndex > 0) {
          setActiveIndex(activeIndex - 1);
        } else if (swipeDistance < 0 && activeIndex < news.length - 1) {
          setActiveIndex(activeIndex + 1);
        } else if (activeCard) {
          activeCard.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
          activeCard.style.transform = 'translateY(0)';
          activeCard.style.position = 'fixed';
          activeCard.style.top = '60px';
        }
        
        setTimeout(() => {
          allCards.forEach(card => card.classList.remove('transitioning'));
        }, 400);
      }
    }
    
    setIsSwiping(false);
    setIsCardContentScrolling(false);
    setTouchStartY(0);
    setTouchEndY(0);
  };

  // Trading position handler
  const handleGlobalPosition = (position) => {
    const activeNews = news[activeIndex];
    if (!activeNews) return;
    
    if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(50);
    alert(`${position.toUpperCase()} position placed on "${activeNews.title}" at $${activeNews.current_value}`);
  };

  return (
    <>
      <div className="news-header-mobile">
        <div className="logo">
          <img src="/static/logo.svg" alt="Here News" height="30" />
        </div>
        <h1 style={{fontSize: '18px', margin: '0 auto', fontWeight: 'bold'}}>
          HERE.NEWS
        </h1>
        <div style={{width: '30px'}}></div>
      </div>
      
      <div
        className="news-carousel mobile"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{touchAction: 'none', paddingTop: '0'}} 
      >
        {news.map((item, index) => {
          // Set up card style and positioning
          const relativePosition = index - activeIndex;
          const cardStyle = {
            transform: relativePosition === 0 ? 'translateY(0)' : 
                      relativePosition === -1 ? 'translateY(-98%)' :
                      relativePosition === 1 ? 'translateY(98%)' :
                      relativePosition < 0 ? 'translateY(-120%)' : 'translateY(120%)',
            zIndex: relativePosition === 0 ? 1600 :
                   relativePosition === -1 || relativePosition === 1 ? 1500 : 1400,
            opacity: relativePosition === 0 ? 1 :
                    relativePosition === -1 || relativePosition === 1 ? 0.6 : 0,
            visibility: relativePosition >= -1 && relativePosition <= 1 ? 'visible' : 'hidden',
            position: 'fixed',
            top: '60px',
            left: 0,
            right: 0,
            width: '100%',
            height: 'calc(100vh - 60px)',
            margin: 0,
            padding: 0,
            borderRadius: 0,
            background: getGenreBackground(item.genre),
            transition: isSwiping ? 'none' : 'transform 0.4s cubic-bezier(0.33, 1, 0.68, 1), opacity 0.4s ease',
            pointerEvents: relativePosition === 0 ? 'auto' : 'none',
            display: 'flex',
            flexDirection: 'column'
          };
          
          const isActive = index === activeIndex;
          const setCardRef = (el) => { cardRefs.current[index] = el; };
          
          return (
            <NewsCard 
              key={item.uuid}
              ref={setCardRef}
              news={item}
              isActive={isActive}
              onClick={(uuid) => setFullScreenNews(news.find(n => n.uuid === uuid))}
              style={cardStyle}
              isMobile={true}
            >
              {index === activeIndex && (
                <div className="swipe-indicators">
                  {index > 0 && <div className="swipe-indicator swipe-up"><span>↑</span></div>}
                  {index < news.length - 1 && <div className="swipe-indicator swipe-down"><span>↓</span></div>}
                </div>
              )}
            </NewsCard>
          );
        })}
      </div>
      
      {news.length > 0 && ReactDOM.createPortal(
        <div className="global-trading-actions">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div className="price-display">
              <span className="price-label">Price</span>
              <span className="price-value">${news[activeIndex]?.current_value || '0.00'}</span>
            </div>
            <MiniPriceChart 
              priceHistory={news[activeIndex]?.price_history} 
              percentChange={news[activeIndex]?.percent_change_24h}
              width={50}
              height={24}
            />
          </div>
          <div className="trading-buttons-container">
            <button className="trading-button long" onClick={() => handleGlobalPosition('long')}>
              LONG
            </button>
            <button className="trading-button short" onClick={() => handleGlobalPosition('short')}>
              SHORT
            </button>
          </div>
        </div>,
        document.body
      )}
      
      {fullScreenNews && (
        <NewsFullScreen 
          news={fullScreenNews} 
          onClose={() => setFullScreenNews(null)}
          isMobile={true} 
        />
      )}
    </>
  );
};

export default NewsColossalMobile;
