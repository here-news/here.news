/**
 * Here.news Temporary "Under Construction" Homepage
 * 
 * A minimal "Coming Soon" page for the initial version of the site
 */

import React from 'react';
import { Container } from 'react-bootstrap';
import './bootstrap.min.css';
import './TemporaryHome.css';
import Footer from './Footer';

const TemporaryHome = () => {
  return (
    <div className="temporary-home">
      <Container className="text-center">
        <div className="coming-soon-content">
          <img 
            src="/static/hn2_logo.svg" 
            alt="Here.news Logo" 
            className="img-fluid mb-4" 
          />
          <h1 className="mb-4">Coming Soon</h1>
          <p className="lead">
            The next evolution of here.news is under construction.
          </p>
        </div>
      </Container>
      <Footer />
    </div>
  );
};

export default TemporaryHome;