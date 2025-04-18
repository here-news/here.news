import React, { useState, useEffect } from 'react';
import { useUser } from './UserContext';
import serviceUrl from './config';
import './Comments.css';

const Comments = ({ 
  entityId, 
  userSharesCount = 0,
  hasPosition = false,
  // Add new props to get the YES/NO breakdown directly from parent
  yesShares = 0, 
  noShares = 0,
  positionType = null // Optional explicit position type from parent
}) => {
  const { publicKey, openModal } = useUser();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [userPosition, setUserPosition] = useState(null);
  const [positionFilter, setPositionFilter] = useState(null);
  const [includeWithoutShares, setIncludeWithoutShares] = useState(false);
  const [sortBy, setSortBy] = useState('created_at');
  const [tipAmount, setTipAmount] = useState({});
  const [positionError, setPositionError] = useState(null);

  // Use position information passed from parent if available
  useEffect(() => {
    if (hasPosition && userSharesCount > 0) {
      // Check if we have explicit yes/no shares breakdown from props
      const hasShareBreakdown = yesShares > 0 || noShares > 0;
      
      if (hasShareBreakdown) {
        // We have specific YES/NO breakdown from parent component
        
        // Determine if this is a mixed position
        const isMixed = yesShares > 0 && noShares > 0;
        
        if (isMixed) {
          // Create a proper mixed position object
          let dominantType;
          let direction;
          let netShares = 0;
          
          if (yesShares > noShares) {
            dominantType = "YES";
            direction = "lean_yes";
            netShares = yesShares - noShares;
          } else if (noShares > yesShares) {
            dominantType = "NO"; 
            direction = "lean_no";
            netShares = noShares - yesShares;
          } else {
            dominantType = "NEUTRAL";
            direction = "neutral";
            netShares = 0;
          }
          
          const mixedPosition = {
            id: `synthetic-mixed-${entityId}-${publicKey}`,
            position_type: dominantType,
            shares: userSharesCount, // Total shares for count display
            net_shares: netShares, // Net difference for stance calculation
            yes_shares: yesShares,
            no_shares: noShares,
            is_mixed: true,
            direction: direction
          };
          
          setUserPosition(mixedPosition);
        } else {
          // Pure position - either all YES or all NO
          const purePositionType = yesShares > 0 ? "YES" : "NO";
          const pureShares = yesShares > 0 ? yesShares : noShares;
          
          const purePosition = {
            id: `synthetic-${entityId}-${publicKey}`,
            position_type: purePositionType,
            shares: pureShares,
            is_mixed: false
          };
          
          setUserPosition(purePosition);
        }
      } else if (positionType) {
        // We have explicit position type but no breakdown
        const syntheticPosition = {
          id: `synthetic-${entityId}-${publicKey}`,
          position_type: positionType,
          shares: userSharesCount,
          is_mixed: false
        };
        
        setUserPosition(syntheticPosition);
      } else {
        // Fallback: No breakdown and no explicit type
        // Use an unknown type that will be handled in the display logic
        const syntheticPosition = {
          id: `synthetic-${entityId}-${publicKey}`,
          position_type: "UNKNOWN", // Will be handled in the display logic
          shares: userSharesCount,
          is_mixed: false
        };
        
        setUserPosition(syntheticPosition);
      }
      
      setPositionError(null);
    } else if (!hasPosition && !publicKey) {
      // If user has no position and no public key (not logged in)
      // Just set a clean state without error messages
      setUserPosition(null);
      setPositionError(null);
    }
  }, [entityId, publicKey, userSharesCount, hasPosition, yesShares, noShares, positionType]);

  // Only fetch position if not provided via props
  useEffect(() => {
    // Skip if we already have position info from props
    if (hasPosition && userSharesCount > 0) return;
    // Skip if user is not logged in
    if (!publicKey) return;
    // Skip fetching position if we explicitly know there's no position
    if (hasPosition === false) return;

    // We have positions from props already, so we don't need to fetch them
    // This useEffect is no longer necessary and can be removed
    
    /* Original code removed to eliminate the API request that's causing 404 errors
    // Clear any previous position errors
    setPositionError(null);
    
    fetch(`${serviceUrl}/market/positions/${entityId}/${publicKey}`)
      .then(response => {
        if (!response.ok) {
          if (response.status === 404) {
            // 404 means user doesn't have a position - this is expected for new users
            return null;
          }
          throw new Error(`Position fetch failed with status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (data) {
          // Store the position data
          setUserPosition(data);
        } else {
          // Don't set an error for expected cases (null response from 404)
          // setPositionError("No position data received from server");
        }
      })
      .catch(error => {
        // Only log the error to console, don't show it to users unless it's unexpected
        console.error('Error fetching user position:', error);
        // Only set visible errors for unexpected failures
        if (!error.message.includes("404")) {
          setPositionError(`Failed to fetch position: ${error.message}`);
        }
      });
    */
  }, [entityId, publicKey, hasPosition, userSharesCount]);

  // Force mixed position handling for the specific case of having 3 YES and 1 NO share
  // This effect is no longer needed since we're getting positions data from props
  /*
  useEffect(() => {
    // Check for the specific case where position is showing incorrectly
    if (userPosition && publicKey) {
      // For demo purposes, let's check if this is the position with the issue
      
      fetch(`${serviceUrl}/market/user/${publicKey}/positions`)
        .then(response => response.json())
        .catch(err => []) // Default to empty array on error
        .then(positions => {
          if (!Array.isArray(positions)) return;
          
          // Filter to only positions for this content
          const contentPositions = positions.filter(p => p.news_id === entityId);
          
          // Check manually for the case of mixed YES/NO positions
          let yesSharesCount = 0;
          let noSharesCount = 0;
          
          // Calculate total shares for each position type
          contentPositions.forEach(pos => {
            if (pos.position_type === "YES" && pos.shares) {
              yesSharesCount += pos.shares;
            }
            if (pos.position_type === "NO" && pos.shares) {
              noSharesCount += pos.shares;
            }
          });
          
          // If user has both types of shares, create a mixed position
          if (yesSharesCount > 0 && noSharesCount > 0) {
            
            // Determine the dominant position
            let dominantType = "NEUTRAL";
            let direction = "neutral";
            let netShares = 0;
            
            if (yesSharesCount > noSharesCount) {
              dominantType = "YES";
              direction = "lean_yes";
              netShares = yesSharesCount - noSharesCount; // Net shares in favor of YES
            } else if (noSharesCount > yesSharesCount) {
              dominantType = "NO";
              direction = "lean_no";
              netShares = noSharesCount - yesSharesCount; // Net shares in favor of NO
            }
            
            // Create the mixed position object
            const mixedPosition = {
              ...userPosition,
              is_mixed: true,
              position_type: dominantType,
              yes_shares: yesSharesCount,
              no_shares: noSharesCount,
              shares: netShares, // Net shares showing the actual balance of position
              direction: direction
            };
            
            setUserPosition(mixedPosition);
          }
        });
    }
  }, [entityId, publicKey, userPosition]);
  */

  // Fetch comments with filters - remove includeWithoutShares parameter
  useEffect(() => {
    let url = `${serviceUrl}/news/${entityId}/comments?`;
    
    if (positionFilter) {
      url += `position_type=${positionFilter}&`;
    }
    
    url += `sort_by=${sortBy}`;

    fetch(url)
      .then(response => response.json())
      .then(data => setComments(data))
      .catch(error => console.error('Error fetching comments:', error));
  }, [entityId, positionFilter, sortBy]);

  const handleCommentSubmit = () => {
    if (newComment.trim() === '') return;
    
    // Enhanced position check to handle short positions
    const hasValidPosition = () => {
      if (!userPosition) {
        return false;
      }
      
      // Check for shares field directly (for backward compatibility)
      if (userPosition.shares && userPosition.shares > 0) {
        return true;
      }
      
      // Check for short/long positions explicitly
      if (userPosition.position_type === "YES" || userPosition.position_type === "NO") {
        return true;
      }
      
      // Check for id as a last resort
      if (userPosition.id) {
        return true;
      }
      
      return false;
    };
    
    if (!hasValidPosition()) {
      const errorMessage = "You must have a position in this content to comment!";
      alert(errorMessage);
      return;
    }

    // If we have a valid position but no position type, default to "NO" for short positions
    const positionType = userPosition.position_type || "NO";
    const positionId = userPosition.id || `manual-${entityId}-${publicKey}`;
    
    // Show loading state or disable button here if needed
    
    fetch(`${serviceUrl}/news/${entityId}/comment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: newComment,
        user_id: publicKey,
        position: positionType,
        position_id: positionId
      }),
    })
      .then(response => {
        if (!response.ok) {
          const statusCode = response.status;
          // More specific error messages based on status code
          if (statusCode === 401) {
            throw new Error("Please sign in to comment");
          } else if (statusCode === 403) {
            throw new Error("You need to have a position to comment");
          } else {
            throw new Error(`Error posting comment (${statusCode})`);
          }
        }
        return response.json();
      })
      .then(data => {
        // Successfully posted the comment
        setComments(prevComments => [data, ...prevComments]);
        setNewComment(''); // Clear the input field
      })
      .catch(error => {
        console.error('Error posting comment:', error);
        alert("Error posting comment: " + error.message);
      });
  };

  // Helper function to check for valid position
  function hasValidPosition() {
    // First check if we have position information from props
    if (hasPosition && userSharesCount > 0) {
      return true;
    }
    
    // Otherwise check the position object
    if (!userPosition) return false;
    
    // Check for mixed positions
    if (userPosition.is_mixed) {
      return userPosition.shares > 0;
    }
    
    return (
      (userPosition.shares && userPosition.shares > 0) || 
      userPosition.position_type === "YES" || 
      userPosition.position_type === "NO" || 
      userPosition.id
    );
  }

  const handleTipChange = (commentId, amount) => {
    setTipAmount({
      ...tipAmount,
      [commentId]: amount
    });
  };

  const handleTipSubmit = (commentId) => {
    const amount = parseFloat(tipAmount[commentId]);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid tip amount");
      return;
    }

    fetch(`${serviceUrl}/news/${entityId}/comments/${commentId}/tip`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        comment_id: commentId,
        tipper_id: publicKey,
        amount: amount
      }),
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        // Update the comment with new tips_received value
        setComments(prevComments =>
          prevComments.map(comment =>
            comment.id === commentId ? data : comment
          )
        );
        // Reset the tip amount for this comment
        setTipAmount({
          ...tipAmount,
          [commentId]: ''
        });
      })
      .catch(error => {
        console.error('Error tipping comment:', error);
        alert("Error tipping comment: " + error.message);
      });
  };

  // Modified tip function to use fixed $0.01 tips
  const handleTipComment = (commentId) => {
    // Fixed tip amount of $0.01 with 0.1% fee applied on the backend
    fetch(`${serviceUrl}/news/${entityId}/comments/${commentId}/tip`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        comment_id: commentId,
        tipper_id: publicKey,
        amount: 0.01 // Fixed amount, fee calculated on backend
      }),
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        // Update the comment with new tips_received value
        setComments(prevComments =>
          prevComments.map(comment =>
            comment.id === commentId ? data : comment
          )
        );
      })
      .catch(error => {
        console.error('Error tipping comment:', error);
        alert("Error tipping comment: " + error.message);
      });
  };

  // Position display logic for mixed positions
  const getPositionDisplay = (position) => {
    if (!position) return { badge: "NO", text: "" };
    
    if (position.is_mixed) {
      if (position.direction === "lean_yes") {
        return {
          badge: "YES",
          text: `You lean YES with ${position.yes_shares} YES, ${position.no_shares} NO shares`
        };
      } else if (position.direction === "lean_no") {
        return {
          badge: "NO",
          text: `You lean NO with ${position.no_shares} NO, ${position.yes_shares} YES shares`
        };
      } else {
        return {
          badge: "NEUTRAL",
          text: `You have equal shares: ${position.yes_shares} YES, ${position.no_shares} NO`
        };
      }
    }
    
    // Handle unknown position type (when we don't know if it's YES or NO)
    if (position.position_type === "UNKNOWN") {
      return {
        badge: "MIXED",
        text: `(${position.shares} total shares)`
      };
    }
    
    // Regular position
    return {
      badge: position.position_type || "NO",
      text: ""
    };
  };

  const getPositionBadgeClass = (position) => {
    if (position === "NEUTRAL") return 'position-badge neutral';
    if (position === "MIXED") return 'position-badge mixed';
    return position === 'YES' ? 'position-badge yes' : 'position-badge no';
  };

  const getStakeVisualization = (stakeAmount) => {
    // Simple visualization - size classes based on stake amount
    if (stakeAmount >= 10) return 'large-stake';
    if (stakeAmount >= 5) return 'medium-stake';
    return 'small-stake';
  };

  return (
    <div className="comments-section">
      <a name="comments"></a>
      <h3>Comments</h3>

      {/* Only show position error if it's not a 404 error */}
      {positionError && !positionError.includes("404") && !hasPosition && (
        <div className="position-error" style={{color: 'red', marginBottom: '10px'}}>
          {positionError}
        </div>
      )}

      {/* Comment filters - removed checkbox for users without shares */}
      <div className="comment-filters">
        <div className="position-filters">
          <button 
            className={positionFilter === null ? 'active' : ''}
            onClick={() => setPositionFilter(null)}
          >
            All
          </button>
          <button 
            className={positionFilter === 'YES' ? 'active' : ''}
            onClick={() => setPositionFilter('YES')}
          >
            YES Positions
          </button>
          <button 
            className={positionFilter === 'NO' ? 'active' : ''}
            onClick={() => setPositionFilter('NO')}
          >
            NO Positions
          </button>
        </div>
        
        <div className="sort-options">
          <label>Sort by: </label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="created_at">Recent</option>
            <option value="tips">Most Tipped</option>
            <option value="stake">Highest Stake</option>
          </select>
        </div>
      </div>

      {/* Comment input */}
      <div className="comment-input">
        <textarea
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          placeholder={hasValidPosition() ? "Add a comment..." : "You must have a position to comment"}
          disabled={!hasValidPosition()}
        />
        {(userPosition || hasPosition) && hasValidPosition() && (
          <div className="comment-position-indicator">
            {userPosition?.is_mixed ? (
              <>
                You comment as: <span className={getPositionBadgeClass(getPositionDisplay(userPosition).badge)}>
                  {getPositionDisplay(userPosition).badge}
                </span>
                {userPosition.yes_shares > 0 && userPosition.no_shares > 0 && (
                  <span className="position-details"> 
                    ({userPosition.yes_shares} YES, {userPosition.no_shares} NO shares)
                  </span>
                )}
              </>
            ) : (
              <>
                You comment as: <span className={getPositionBadgeClass(userPosition?.position_type || "NO")}>
                  {userPosition?.position_type || "NO"}
                </span>
                {(userPosition?.shares || userSharesCount > 0) && (
                  <span className="position-details"> ({userPosition?.shares || userSharesCount} shares)</span>
                )}
              </>
            )}
          </div>
        )}
        <button 
          onClick={handleCommentSubmit} 
          disabled={!hasValidPosition() || newComment.trim() === ''}
        >
          Submit
        </button>
      </div>
      
      {/* Comments list */}
      <a name="comments-list"></a>
      <div className="comments-list">
        {comments.map(comment => (
          <div key={comment.id} className={`comment ${!comment.has_shares ? 'no-shares' : ''} ${getStakeVisualization(comment.initial_stake_amount)}`}>
            <div className="comment-header">
              <span className={getPositionBadgeClass(comment.position)}>
                {comment.position}
              </span>
              <span className="stake-amount">
                Stake: {comment.initial_stake_amount}
              </span>
              {!comment.has_shares && (
                <span className="no-shares-badge">No longer holds shares</span>
              )}
            </div>
            <p className="comment-text">{comment.text}</p>
            <div className="comment-actions">
              <div className="tip-section">
                <span className="tips-received">
                  {comment.tips_received > 0 && 
                    <span className="tip-amount">({Math.round(comment.tips_received * 100)}¢)</span>
                  }
                </span>
                
                <button 
                  className="tip-button"
                  onClick={() => handleTipComment(comment.id)}
                  title="Tip one cent"
                >
                  <i className="fa fa-arrow-up"></i>
                </button>
              </div>
            </div>
          </div>
        ))}
        
        {comments.length === 0 && (
          <p className="no-comments">No comments yet. Be the first to comment!</p>
        )}
      </div>
    </div>
  );
};

export default Comments;
