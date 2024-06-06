import React from 'react';

const RelatedStories = ({ news }) => {
  return (
    <div id="relatives" className="card-footer text-muted">
    <h5>Related Stories</h5>
    <div id="relativeGrid" className="row">
    <span>Finding related stories...</span>
    </div>
    </div>
  );
};

export default RelatedStories;
