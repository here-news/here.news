import React from 'react';
import './RatingBar.css';

const RatingBar = ({ positive, negative, displayNumber = false, tartget="#"}) => {
  const total = positive + negative;
  const positiveRatio = (positive / total) * 10;
  const negativeRatio = (negative / total) * 10;
  const thickness = Math.log10(total) + 1;  
  const amp = 2;

return (
    <div className="rating-bar-container" title={`Positive: ${positive}, Negative: ${negative}; Your comments will affect this rating.`}>
        <div className="rating-bar" >
            <div className="positive" style={{ flex: positiveRatio, height: `${thickness * amp}px` }}></div>
            {displayNumber && (<span className='rating-text'> <a href={tartget}>{positive} / {negative} </a></span> )}
            <div className="negative" style={{ flex: negativeRatio, height: `${thickness * amp}px`  }}></div>
        </div>
    </div>
);
};

export default RatingBar;
