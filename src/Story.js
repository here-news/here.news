import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import serviceUrl from './config';
import Header from './Header';
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
      });
  }, [storyId]);

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
        });
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
                [{localRef}]
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
             [{localRef}]
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
    <Header/>
    <div className="story-container">
    {story ? (
      <>
      <h1>{story.title}</h1>
      <ButtonFollow storyId={story.uuid}/>
      <div className="story-content">
        {story && story.story && renderStoryText(story.story)}
        {hoverRef && (
          <div className="popup-news-card" style={{  top: `${popupPosition.y}px`, left: `${popupPosition.x}px` }}>
            <NewsCard news={newsItems[hoverRef]} />
          </div>
        )}
      </div>
      </>
      ) : 'Loading...'
      }
    </div>
    </>
  );
};

export default Story;
