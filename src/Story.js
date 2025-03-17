import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import serviceUrl from './config';
import Header from './Header';
import Footer from './Footer';
import NewsCard from './NewsCard';
import ButtonFollow from './ButtonFollow';
import './Story.css';

const Story = () => {
  const { storyId } = useParams();
  const [story, setStory] = useState(null);
  const [newsItems, setNewsItems] = useState({});
  const [hoverRef, setHoverRef] = useState(null);
  const [refMapping, setRefMapping] = useState({});
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [displayRefs, setDisplayRefs] = useState(new Set()); // Track refs to display as embedded
  const [hoveredRef, setHoveredRef] = useState(null);
  const [relatedStories, setRelatedStories] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Handle window resize for responsive design
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetch(`${serviceUrl}/story/${storyId}`)
      .then(response => response.json())
      .then(data => {
        setStory(data);
        if (data.refs) {
          initializeRefMapping(data.refs);
          fetchNewsItems(data.refs);
          initializeDisplayRefs(data.refs);
        }
      })
  }, [storyId]);


  const fetchRelatedStories = (id) => {
    fetch(`${serviceUrl}/related/${id}`)
      .then(response => response.json())
      .then(data => setRelatedStories(data));
  };


  const initializeRefMapping = (refs) => {
    const map = {};
    refs.forEach((ref, index) => map[ref] = index + 1); // Map HEX to local index
    setRefMapping(map);
  };

  const initializeDisplayRefs = (refs) => {
    const displaySet = new Set();
    for (let i = 0; i < Math.min(3, refs.length); i++) {
      displaySet.add(refs[i]);
    }
    setDisplayRefs(displaySet);
  };

  const fetchNewsItems = (refs) => {
    refs.forEach(ref => {
      fetch(`${serviceUrl}/news/${ref}`)
        .then(response => response.json())
        .then(news => {
          setNewsItems(prev => ({ ...prev, [ref]: news })); // Store news items by HEX ref
        })
        .then(() => fetchRelatedStories(storyId));
    });
  };

  const handleMouseEnter = (event, ref) => {
    const offsetX = 5;
    const offsetY = -15;
    let { clientX, clientY } = event;
    
    // Check if the popup would go off the right edge of the screen
    if (clientX + offsetX + 300 > window.innerWidth) { // Assuming 300px is the width of the popup
      clientX = window.innerWidth - 300 - offsetX;
    }
  
    // Adjust for vertical position similarly if needed
    if (clientY + offsetY + 300 > window.innerHeight) { // Assuming 300px is the height of the popup
      clientY = window.innerHeight - 300 - offsetY;
    }
  
    setPopupPosition({ x: clientX + offsetX, y: clientY + offsetY });
    setHoverRef(ref);
  };
  

  const handleMouseLeave = () => {
    setHoverRef(null);
  };
  
  const renderStoryText = (text) => {
    const regex = /\[([a-f0-9]{8})\]/g;
    let embeddedCardCount = 0;  // Local variable to track the count of embedded news cards
    const displayedRefs = new Set();
    
    return text.split('\n').map((paragraph, pIndex) => {
      const parts = [];
  
      // First pass: render embedded news cards before the paragraph
      paragraph.split(regex).forEach((part, index) => {
        if (newsItems[part] && displayRefs.has(part) && !displayedRefs.has(part)) {
          const className = embeddedCardCount % 2 === 0 ? 'float-left' : 'float-right';

          const newsCard = (
            <NewsCard
              key={`news-${index}`}
              news={newsItems[part]}
              className={className}
              highlight={hoveredRef === part}
              />
            );
          parts.push(newsCard);
          embeddedCardCount++;  
          displayedRefs.add(part);  // Add this ref to the set of displayed news cards
        }
      });
  
      // Second pass: build the paragraph with text and hoverable references
      paragraph.split(regex).forEach((part, index) => {
        if (newsItems[part]) {
          const newsItem = newsItems[part];
          const localRef = refMapping[part];
          if (!displayRefs.has(part)) {
            parts.push(
              <a key={`link-${index}`} href={`/news/${newsItem.uuid}`} onMouseEnter={(e) => handleMouseEnter(e, part)} onMouseLeave={handleMouseLeave} style={{ color: 'blue', textDecoration: 'underline' }}>
                <sup>[{localRef}]</sup>
              </a>
            );
          } else {
            // Append local reference links for embedded cards
            parts.push(
              <a key={`ref-${index}`}
              href={`/news/${newsItem.uuid}`}
              onMouseEnter={() => setHoveredRef(part)}
              onMouseLeave={() => setHoveredRef(null)}
              style={{ color: 'blue', textDecoration: 'underline', fontWeight: hoveredRef === part ? 'bold' : 'normal' }}>
             <sup>[{localRef}]</sup>
           </a>
            );
          }
        } else {
          // Append regular text parts
          parts.push(<span key={`text-${index}`}>{part}</span>);
        }
      });
  
      return <div key={pIndex} className="paragraph">{parts}</div>;
    });
  };
  

  return (
    <>
    <Header />
    <div className="story-container">
    {story ? (
      <>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <h1 style={{ marginRight: '10px' }}>{story.title}</h1>
        <ButtonFollow id="story-follow" storyId={story.uuid}/>
      </div>

      <div className="story-content">
        {story && story.story && renderStoryText(story.story)}
        {hoverRef && (
          <div className="popup-news-card" style={{  top: `${popupPosition.y}px`, left: `${popupPosition.x}px` }}>
            <NewsCard news={newsItems[hoverRef]} />
          </div>
        )}
      </div>
      <div>
        <h5>Tags:</h5>
        {story.tags && story.tags.map((tag, index) => (
          <a key={index} href={`/tag/${tag.trim()}`} style={{ marginRight: '5px' }}>{tag.trim()}</a>
        ))}
      </div>
      <div id="relatives" className="card-footer text-muted">
        <h5>Related Stories</h5>
        <div id="relativeGrid" className="row">
          {relatedStories.length ? (
            relatedStories.map((relative) => (
              <div key={relative.uuid} className="col-lg-3 col-md-4 col-sm-6 col-12 mb-3">
                <div className="card h-100">
                  <a href={`/story/${relative.uuid}`}>
                    <img className="card-img-top" src={relative.preview || '/static/plainnews.png'} onError={(e) => e.target.src = '/static/bubble.webp'} alt={relative.title} loading="lazy" />
                  </a>
                  <div className="card-body">
                    <a href={`/story/${relative.uuid}`}>
                      <span className="card-title"><b>{relative.title}</b></span>
                    </a>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <span>Finding related stories...</span>
          )}
        </div>
    </div>
      </>
      ) : 'Loading...'
      }
    </div>
    <Footer isMobile={isMobile} />
    </>
  );
};

export default Story;
