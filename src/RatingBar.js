import React from 'react';
import './RatingBar.css';

const RatingBar = ({ positive, negative, displayNumber = false }) => {
  const total = positive + negative;
  const positiveRatio = (positive / total) * 10;
  const negativeRatio = (negative / total) * 10;
  const thickness = Math.log10(total) + 1;  
  const amp = 2;

return (
    <div className="rating-bar-container">
        <div className="rating-bar" title={`Positive: ${positive}, Negative: ${negative}; Your comments will affect this rating.`}>
            <div className="positive" style={{ flex: positiveRatio, height: `${thickness * amp}px` }}></div>
            {displayNumber && (<span className='rating-text'> {positive} / {negative}  </span> )}
            <div className="negative" style={{ flex: negativeRatio, height: `${thickness * amp}px`  }}></div>
        </div>
    </div>
);
};

export default RatingBar;
