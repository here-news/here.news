import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import EventCard from './EventCard';
import NewsCard from './NewsCard';
import serviceUrl from './config';
import Header from './Header';
import FollowButton from './ButtonFollow';

const Story = () => {
  const [story, setStory] = useState(null);
  const [events, setEvents] = useState([]);
  const [newsItems, setNewsItems] = useState([]);
  const { storyId } = useParams();

  useEffect(() => {
    fetch(`${serviceUrl}/story/${storyId}`)
      .then(response => response.json())
      .then(data => {
        setStory(data);
        return data.refs;
      })
      .then(refs => {
        const newsPromises = refs.map(ref =>
          fetch(`${serviceUrl}/news/${ref}`).then(response => response.json())
        );
        return Promise.all(newsPromises);
      })
      .then(setNewsItems);

    fetch(`${serviceUrl}/story/${storyId}/events`)
      .then(response => response.json())
      .then(setEvents);
  }, [storyId]);

  const changeLanguage = (language) => {
    localStorage.setItem('preferredLanguage', language);
    document.getElementById('languageDropdown').textContent = language;
  };

  const requestTranslation = () => {
    alert("Please contact us to sponsor a translation into another language!");
  };

  const rotateImages = () => {
    const images = document.querySelectorAll('#imageStack img');
    const totalImages = images.length;
    const activeImage = document.querySelector('#imageStack img.active');
    let activeIndex = Array.from(images).indexOf(activeImage);

    activeImage.classList.remove('active');
    const nextImageIndex = (activeIndex + 1) % totalImages;
    images[nextImageIndex].classList.add('active');
  };

  const showSendButton = () => {
    const input = document.querySelector('.form-control');
    const sendButton = document.getElementById('send-button');
    if (input.value.trim() !== '') {
      sendButton.style.display = 'block';
    } else {
      sendButton.style.display = 'none';
    }
  };

  if (!story) {
    return <div>Loading...</div>;
  }

  return (
      <>
        <Header/>

        <div className="container mt-4">
          <div className="card">
            <div className="card-body">
            <span id="published-date">{story.last_updated}</span>
              <div className="card-header">
                <h2 className="card-title">{story.title}</h2>
                <FollowButton storyId={story.uuid} type="story" icon="👀" initialCount={story.followers} />
              </div>

              <div className="card-subtitle mb-2 text-muted">
                <span id="uuid" uuid={story.uuid} style={{ display: 'none' }}></span>
              </div>
              <span className="version">
                    <b>v{story.version}</b>
                    <a title="whole tree" href={`/tree/${story.uuid}`}>🌳</a>
              </span>&nbsp;
                  {story.version < story.latest_version && (
                    <a className="bd-highlight" id="latest-version-link" title={`newer: v${story.latest_version}`} href={`/story/${story.uuid}?ver=${story.latest_version}`}>Latest version available</a>
                  )}
                  <div className="dropdown">
                    <button className="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" id="languageDropdown" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                      English
                    </button>
                    <div className="dropdown-menu" aria-labelledby="languageDropdown">
                      <a className="dropdown-item" href="#" onClick={() => changeLanguage('English')}>English</a>
                      <a className="dropdown-item" href="#" onClick={() => changeLanguage('Español')}>Español</a>
                      <a className="dropdown-item" href="#" onClick={() => changeLanguage('Français')}>Français</a>
                      <a className="dropdown-item" href="#" onClick={() => changeLanguage('Deutsch')}>Deutsch</a>
                      <div className="dropdown-divider"></div>
                      <a className="dropdown-item" href="#" onClick={requestTranslation}>Other...</a>
                    </div>
                  </div>



              <div className="card-body" id="story_body">
                <p className="card-text" style={{ whiteSpace: 'pre-line' }} dangerouslySetInnerHTML={{ __html: story.story.substring(0, 600) + "..." }}></p>
              </div>
              {story.earlier_version && (
                <div className="card-footer">
                  <a href={`/story/${story.uuid}?ver={story.earlier_version}`}>Earlier version: v{story.earlier_version}</a>
                </div>
              )}


              <div className="news-references">

                <h3>References</h3>
                <div className="row">
                  {newsItems.map(news => (
                    <div className="" key={news.id}>
                      <NewsCard news={news} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="container mt-4">
                <div className="event-feed">
                  <h3>Event Feed</h3>
                  <div id="events-container">
                    {events.map(event => (
                      <EventCard key={event.id} event={event} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="container mt-4">
                <div className="disclaimer">
                  <strong>Disclaimer:</strong> The story curated or synthesized by the AI agents may not always be accurate or complete. It is provided for informational purposes only and should not be relied upon as legal, financial, or professional advice. Please use your own discretion.
                </div>
              </div>
              <footer className="footer bg-light mt-4">
                <div className="container text-center text-md-left">
                  <p className="text-muted mb-0">Powered by Newstr&trade; AI Journalism System.</p>
                  <p className="text-muted">(cc)2023 Newstr, Here.news. Some Rights Reserved.</p>
                </div>
              </footer>
            </div>
          </div>
        </div>
      </>
  );
};

export default Story;
