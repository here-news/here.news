import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Header from './Header';
import NewsCard from './NewsCard';
import serviceUrl from './config';
import './Story.module.css';

const Story = () => {
  const { storyId } = useParams();
  const [story, setStory] = useState(null);
  const [newsItems, setNewsItems] = useState({});
  const [hoverRef, setHoverRef] = useState(null);
  const [refMapping, setRefMapping] = useState({});
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [displayRefs, setDisplayRefs] = useState(new Set()); // Track refs to display as embedded

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
    for (let i = 0; i < Math.min(4, refs.length); i++) {
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
    const { clientX, clientY } = event;
    setPopupPosition({ x: clientX, y: clientY });
    setHoverRef(ref);
  };

  const handleMouseLeave = () => {
    setHoverRef(null);
  };
  const renderStoryText = (text) => {
    const regex = /\[([a-f0-9]{8})\]/g;
    return text.split('\n').map((paragraph, pIndex) => {
      const parts = [];
      let refsShown = 0;
  
      // First pass: render embedded news cards before the paragraph
      paragraph.split(regex).forEach((part, index) => {
        if (newsItems[part] && displayRefs.has(part)) {
          parts.push(
            <React.Fragment key={`news-${index}`}>
              <NewsCard news={newsItems[part]} className={refsShown % 2 === 1 ? 'float-left' : 'float-right'} />
            </React.Fragment>
          );
          refsShown++;
        }
      });
  
      // Second pass: build the paragraph with text and hoverable references
      paragraph.split(regex).forEach((part, index) => {
        if (newsItems[part]) {
          const localRef = refMapping[part];
          if (!displayRefs.has(part)) {
            parts.push(
              <a key={`link-${index}`} href="#" onMouseEnter={(e) => handleMouseEnter(e, part)} onMouseLeave={handleMouseLeave} style={{ color: 'blue', textDecoration: 'underline' }}>
                [{localRef}]
              </a>
            );
          } else {
            // Append local reference links for embedded cards
            parts.push(<span key={`ref-${index}`}>[{localRef}]</span>);
          }
        } else {
          // Append regular text parts
          parts.push(<span key={`text-${index}`}>{part}</span>);
        }
      });
  
      return <div key={pIndex} className="paragraph">{parts}<br/></div>;
    });
  };
  

  return (
    <>
    <Header/>
    <div className="story-container">
      <h1>{story ? story.title : 'Loading...'}</h1>
      <div className="story-content">
        {story && story.story && renderStoryText(story.story)}
        {hoverRef && (
          <div className="popup-news-card" style={{ position: 'absolute', top: `${popupPosition.y}px`, left: `${popupPosition.x}px` }}>
            <NewsCard news={newsItems[hoverRef]} />
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default Story;
