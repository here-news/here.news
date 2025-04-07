/**
 * Here.news React Frontend
 * 
 * Copyright (c) 2024 Here.news
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */


import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { UserProvider } from './UserContext';
import NewsDetail from './NewsDetail'; // New separate component for news details
import Profile from './Profile';
import Home from './Home';

// Custom component to handle body class based on route
const RouteBasedBodyClass = () => {
  const location = useLocation();
  
  useEffect(() => {
    // If we're on the news detail page or story page, remove the fixed-layout class
    // to allow scrolling
    if (location.pathname.startsWith('/news/') || location.pathname.startsWith('/story/')) {
      document.body.classList.remove('fixed-layout');
    } else {
      document.body.classList.add('fixed-layout');
    }
    
    // Cleanup function to ensure we reset the body class when component unmounts
    return () => {
      document.body.classList.add('fixed-layout');
    };
  }, [location]);
  
  return null;
};

const App = () => {
  return (
    <UserProvider>
      <Router>
        <RouteBasedBodyClass />
        <Routes>
          <Route path="/profile/:section" element={<Profile />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/news/:uuid" element={<NewsDetail />} />
          <Route path="/" element={<Home />} />
          {/* Add other routes as needed */}
        </Routes>
      </Router>
    </UserProvider>
  );
};

export default App;
