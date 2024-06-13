/**
 * Here.news React Frontend
 * 
 * Copyright (c) 2024 Here.news
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */


import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Story from './Story'; // Ensure the correct path to your Story component
import News from './News';
import Profile from './Profile';
import Home from './Home';
import { UserProvider } from './UserContext';

const App = () => {
  return (
    <UserProvider>
      <Router>
        <Routes>
          <Route path="/story/:storyId" element={<Story />} />
          <Route path="/profile/:section" element={<Profile />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/news/:uuid" element={<News />} />
          <Route path="/" element={<Home />} />
          {/* Add other routes as needed */}
        </Routes>
      </Router>
    </UserProvider>
  );
};

export default App;
