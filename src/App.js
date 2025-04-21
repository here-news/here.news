/**
 * Here.news React Frontend
 * 
 * Copyright (c) 2024 Here.news
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */


import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { UserProvider } from './UserContext';
import NewsDetail from './NewsDetail'; // New separate component for news details
import Profile from './Profile';
import Home from './Home';
import TemporaryHome from './TemporaryHome'; // Import the temporary homepage
import { featureFlags } from './config'; // Import feature flags as a named import

// Custom component to handle body class based on route
const RouteBasedBodyClass = () => {
  const location = useLocation();
  
  useEffect(() => {
    // If we're on the news detail page or story page, remove the fixed-layout class
    // to allow scrolling
    if (location.pathname.startsWith('/news/') || location.pathname.startsWith('/story/')) {
      document.body.classList.remove('fixed-layout');
      // Store current scroll position to prevent unwanted behavior when returning to homepage
      document.body.setAttribute('data-scroll-top', '0');
      // Reset scroll to top for news detail page
      window.scrollTo(0, 0);
    } else {
      document.body.classList.add('fixed-layout');
      // Reset body position and scroll
      document.body.style.position = '';
      document.body.style.top = '0px';
      document.body.style.transform = 'none';
      // Reset scroll position when going to fixed layout pages
      window.scrollTo(0, 0);
    }
    
    // Cleanup function to ensure we reset the body class when component unmounts
    return () => {
      // Reset scroll position on route change
      window.scrollTo(0, 0);
    };
  }, [location.pathname]);
  
  return null;
};

// Homepage component that shows the temporary homepage or the regular homepage based on the feature flag
const HomepageSelector = () => {
  return featureFlags.useTemporaryHomepage 
    ? <TemporaryHome /> 
    : <Home />;
};

// Main App component
const App = () => {
  return (
    <Router>
      <UserProvider>
        <RouteBasedBodyClass />
        <Routes>
          <Route path="/" element={<HomepageSelector />} />
          <Route path="/trend" element={<Home />} /> {/* Always show the regular homepage at /trend regardless of the feature flag */}
          <Route path="/news/:uuid" element={<NewsDetail />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/:tab" element={<Profile />} />
        </Routes>
      </UserProvider>
    </Router>
  );
};

export default App;
