import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useUser } from './UserContext';
import serviceUrl from './config';
import Header from './Header';
import { apiRequest } from './services/api';
import './Profile.css';

// Set to true for development debugging, false for production
const DEBUG_MODE = false;

// Helper function to conditionally log messages
const debugLog = (...args) => {
    if (DEBUG_MODE) console.log(...args);
};

// Helper function to format currency values
const formatCurrency = (value) => {
    const numValue = Number(value);
    if (isNaN(numValue)) return '$0.00';
    
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(numValue);
};

// Enhanced loading spinner component
const LoadingSpinner = ({ message = "Loading..." }) => {
    return (
        <div className="loading-container">
            <div className="loading-animation">
                <div></div>
                <div></div>
                <div></div>
                <div></div>
            </div>
            <div className="loading-text">{message}</div>
        </div>
    );
};

// Skeleton loading component for position items
const SkeletonPositions = ({ count = 3 }) => {
    return (
        <div>
            <div className="position-list-header">
                <div className="position-title">Market</div>
                <div className="position-shares">Shares</div>
                <div className="position-value">Value</div>
            </div>
            
            {Array(count).fill().map((_, index) => (
                <div className="skeleton-position" key={index}>
                    <div className="skeleton-title skeleton-item"></div>
                    <div className="skeleton-shares skeleton-item"></div>
                    <div className="skeleton-value skeleton-item"></div>
                </div>
            ))}
        </div>
    );
};

const Profile = () => {
    const { tab = 'profile' } = useParams();
    const section = tab;
    const navigate = useNavigate();
    const { userInfo, loading, error, updateUserBalance } = useUser();
    const [isDepositing, setIsDepositing] = useState(false);
    const [localBalance, setLocalBalance] = useState(0);
    const [hasLocalBalance, setHasLocalBalance] = useState(false);
    const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
    
    // Portfolio data state
    const [portfolioData, setPortfolioData] = useState(null);
    const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(false);
    const [portfolioError, setPortfolioError] = useState(null);
    
    // Activities state
    const [activities, setActivities] = useState([]);
    const [isLoadingActivities, setIsLoadingActivities] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMoreActivities, setHasMoreActivities] = useState(true);
    
    // Cache timeouts and references for optimization
    const portfolioCacheTimeRef = useRef(0);
    const CACHE_TTL = 30000; // 30 seconds cache TTL
    const activitiesTimeoutRef = useRef(null);
    const portfolioTimeoutRef = useRef(null);

    // Function to show a notification
    const showNotification = (message, type = 'success') => {
        setNotification({ show: true, message, type });
        setTimeout(() => {
            setNotification({ show: false, message: '', type: 'success' });
        }, 5000);
    };

    useEffect(() => {
        if (!loading && !userInfo) {
            navigate('/');
        }
    }, [loading, userInfo, navigate]);

    // Log the current section to help with debugging
    useEffect(() => {
        debugLog('Current profile section:', section);
    }, [section]);

    const handleNavigation = (section) => {
        navigate(`/profile/${section}`);
    };

    // Function to handle deposit
    const handleDeposit = async () => {
        if (!userInfo) {
            console.error("Cannot deposit: User info not available");
            showNotification("User information not available. Please try logging in again.", "error");
            return;
        }
        
        // Get public key from userInfo
        const userPublicKey = userInfo.public_key || userInfo.publicKey || null;
        
        if (!userPublicKey) {
            console.error("Cannot deposit: User public key not available");
            showNotification("Your account information is incomplete. Please try logging in again.", "error");
            return;
        }

        try {
            setIsDepositing(true);
            
            // Use apiRequest for deposit with explicit amount
            const depositAmount = 10;
            debugLog(`Making deposit request for $${depositAmount}`);
            
            const response = await apiRequest(`${serviceUrl}/me/deposit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    amount: depositAmount
                })
            }, true); // Mark as protected for JWT
            
            await response.json();
            
            // Simple approach - always refresh balance after deposit
            await refreshUserProfile();
            showNotification(`Successfully deposited $${depositAmount}`, "success");
            
            // Invalidate portfolio cache to force refresh
            portfolioCacheTimeRef.current = 0;
            
            // Refresh portfolio data if in wallet section
            if (section === 'wallet') {
                fetchPortfolioData();
            }
            
        } catch (error) {
            console.error("Error during deposit:", error);
            showNotification("An error occurred while processing your deposit.", "error");
        } finally {
            setIsDepositing(false);
        }
    };

    // Format balance as a proper number - prioritize local balance, then quote_balance
    const formattedBalance = useMemo(() => {
        if (hasLocalBalance && localBalance !== null) {
            debugLog("Using local balance:", localBalance);
            const parsedBalance = Number(localBalance);
            if (!isNaN(parsedBalance)) {
                return parsedBalance;
            }
            return 0;
        }
        
        if (!userInfo) return 0;
        
        if (userInfo.quote_balance !== undefined) {
            const balanceNum = Number(userInfo.quote_balance);
            if (!isNaN(balanceNum)) {
                return balanceNum;
            }
        }
        
        if (userInfo.balance !== undefined) {
            const balanceNum = Number(userInfo.balance);
            if (!isNaN(balanceNum)) {
                return balanceNum;
            }
        }
        
        return 0;
    }, [userInfo, localBalance, hasLocalBalance]);

    // Memoized function to refresh user profile data
    const refreshUserProfile = useCallback(async () => {
        if (!userInfo || !userInfo.public_key) return;
        
        try {
            // Use apiRequest with JWT authentication for fetching balance
            const response = await apiRequest(`${serviceUrl}/me/balance`, {
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate'
                }
            }, true);
            
            const data = await response.json();
            
            if (data && data.quote_balance !== undefined) {
                const numBalance = Number(data.quote_balance);
                
                if (!isNaN(numBalance)) {
                    setLocalBalance(numBalance);
                    setHasLocalBalance(true);
                    
                    if (updateUserBalance) {
                        updateUserBalance(numBalance);
                    }
                    showNotification("Balance updated successfully.", "success");
                } else {
                    console.error("Balance is not a number:", data.quote_balance);
                    showNotification("Couldn't parse your current balance.", "warning");
                }
            } else {
                console.error("No valid balance found in balance response:", data);
                showNotification("Couldn't retrieve your current balance.", "warning");
            }
        } catch (error) {
            console.error("Failed to refresh profile:", error);
            showNotification("Failed to update balance information.", "error");
        }
    }, [userInfo, updateUserBalance]);
    
    // Fetch portfolio data with caching
    const fetchPortfolioData = useCallback(async (forceRefresh = false) => {
        if (!userInfo || !userInfo.public_key) return;
        
        const now = Date.now();
        
        // Check if we have cached data that's still valid
        if (!forceRefresh && portfolioData && (now - portfolioCacheTimeRef.current) < CACHE_TTL) {
            debugLog("Using cached portfolio data");
            return;
        }
        
        setIsLoadingPortfolio(true);
        setPortfolioError(null);
        
        try {
            const response = await apiRequest(`${serviceUrl}/me/portfolio`, {
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate'
                }
            }, true);
            
            if (response.ok) {
                const data = await response.json();
                setPortfolioData(data);
                portfolioCacheTimeRef.current = now;
                
                // Update user balance with the value from portfolio data
                if (data.cash_balance !== undefined && updateUserBalance) {
                    updateUserBalance(data.cash_balance);
                    setLocalBalance(data.cash_balance);
                    setHasLocalBalance(true);
                }
            } else {
                setPortfolioError("Failed to fetch portfolio data");
                console.error("Failed to fetch portfolio data:", response.status);
            }
        } catch (error) {
            setPortfolioError("Error: " + error.message);
            console.error("Error fetching portfolio data:", error);
        } finally {
            setIsLoadingPortfolio(false);
        }
    }, [userInfo, portfolioData, updateUserBalance]);
    
    // Fetch user activities with caching and debouncing
    const fetchUserActivities = useCallback(async (page = 1, forceRefresh = false) => {
        if (!userInfo || !userInfo.public_key) return;
        
        // Clear any pending activity fetch timeout
        if (activitiesTimeoutRef.current) {
            clearTimeout(activitiesTimeoutRef.current);
        }
        
        // If this isn't a force refresh, set a small timeout to debounce multiple calls
        if (!forceRefresh && page === 1) {
            activitiesTimeoutRef.current = setTimeout(() => {
                fetchUserActivities(page, true);
            }, 300);
            return;
        }
        
        setIsLoadingActivities(true);
        
        try {
            const response = await apiRequest(`${serviceUrl}/me/trades?limit=10&page=${page}`, {
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate'
                }
            }, true);
            
            if (response.ok) {
                const data = await response.json();
                
                // If we got less than 10 items, we're at the end
                if (data.length < 10) {
                    setHasMoreActivities(false);
                }
                
                // On page 1, replace activities, otherwise append
                if (page === 1) {
                    setActivities(data);
                } else {
                    setActivities(prev => [...prev, ...data]);
                }
            } else {
                console.error("Failed to fetch user activities:", response.status);
            }
        } catch (error) {
            console.error("Error fetching user activities:", error);
        } finally {
            setIsLoadingActivities(false);
        }
    }, [userInfo]);
    
    // Load more activities
    const loadMoreActivities = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchUserActivities(nextPage, true);
    };
    
    // Refresh data when tabs change, with optimizations
    useEffect(() => {
        // Clear any pending timeouts when changing sections
        if (portfolioTimeoutRef.current) {
            clearTimeout(portfolioTimeoutRef.current);
        }
        
        if (activitiesTimeoutRef.current) {
            clearTimeout(activitiesTimeoutRef.current);
        }
        
        if (section === 'wallet') {
            debugLog("Wallet section loaded, checking portfolio data");
            
            // If we already have cached data, delay the refresh
            if (portfolioData && (Date.now() - portfolioCacheTimeRef.current) < CACHE_TTL) {
                // Schedule a refresh in the background after a delay
                portfolioTimeoutRef.current = setTimeout(() => {
                    fetchPortfolioData(true);
                }, 2000);
            } else {
                // No cached data or cache expired, fetch immediately
                fetchPortfolioData(true);
            }
        } else if (section === 'activities') {
            debugLog("Activities section loaded, fetching user activities");
            setPage(1); // Reset to page 1
            setHasMoreActivities(true); // Reset pagination
            fetchUserActivities(1); // Fetch page 1
        }
        
        // Cleanup function to clear timeouts
        return () => {
            if (portfolioTimeoutRef.current) {
                clearTimeout(portfolioTimeoutRef.current);
            }
            
            if (activitiesTimeoutRef.current) {
                clearTimeout(activitiesTimeoutRef.current);
            }
        };
    }, [section, fetchPortfolioData, fetchUserActivities, portfolioData]);

    // Return early for loading and error states
    if (loading) return <div className="container mt-4"><LoadingSpinner message="Loading user data..." /></div>;
    if (error) return <div className="container mt-4">Error: {error}</div>;
    if (!userInfo) return null;

    return (
        <>
            <Header />
            
            {/* Notification component */}
            {notification.show && (
                <div className={`notification-toast ${notification.type}`}>
                    <div className="notification-content">
                        <p>{notification.message}</p>
                        <button 
                            className="notification-close" 
                            onClick={() => setNotification({ show: false, message: '', type: 'success' })}
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}
            
            <div className="container mt-4">
                <div className="card">
                    <div className="card-body">
                        <div className="profile-container">
                            <div className="sidebar">
                                <ul>
                                    <li className={section === 'profile' ? 'active' : ''} onClick={() => handleNavigation('profile')}>Profile</li>
                                    <li className={section === 'wallet' ? 'active' : ''} onClick={() => handleNavigation('wallet')}>
                                        Wallet & Portfolio <span role="img" aria-label="sparkles">✨</span>
                                    </li>
                                    <li className={section === 'activities' ? 'active' : ''} onClick={() => handleNavigation('activities')}>Activities</li>
                                    <li className={section === 'settings' ? 'active' : ''} onClick={() => handleNavigation('settings')}>Settings</li>
                                </ul>
                            </div>
                            <div className="main-content">
                                {section === 'profile' && (
                                    <div className="fade-in">
                                        <h2>Profile</h2>
                                        <div className="user-profile-info">
                                            <img className="avatar-profile" src={userInfo.avatar || `${serviceUrl}/avatar/${userInfo.public_key}?format=png&sz=64`} alt="Profile" />
                                            <div className="profile-details">
                                                <div className="profile-field">
                                                    <span className="field-label">User ID:</span>
                                                    <span className="field-value">{userInfo.public_key}</span>
                                                </div>
                                                <div className="profile-field">
                                                    <span className="field-label">Username:</span>
                                                    <span className="field-value">{userInfo.name || 'Not set'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {section === 'wallet' && (
                                    <div className="fade-in">
                                        <h2>Wallet & Portfolio</h2>
                                        
                                        {/* Account Summary Section */}
                                        <div className="account-summary">
                                            <div className="summary-header">
                                                <h3>Account Summary</h3>
                                                <button 
                                                    className="btn btn-outline-secondary refresh-btn" 
                                                    onClick={() => fetchPortfolioData(true)}
                                                    disabled={isLoadingPortfolio}
                                                >
                                                    {isLoadingPortfolio ? 'Refreshing...' : 'Refresh'}
                                                </button>
                                            </div>
                                            
                                            {portfolioError && (
                                                <div className="alert alert-danger">
                                                    {portfolioError}
                                                </div>
                                            )}
                                            
                                            {isLoadingPortfolio && !portfolioData ? (
                                                <LoadingSpinner message="Loading account summary..." />
                                            ) : (
                                                <>
                                                    <div className="account-value-breakdown">
                                                        <div className="value-card available-cash">
                                                            <div className="value-card-label">Available Cash</div>
                                                            <div className="value-card-amount">
                                                                {formatCurrency(portfolioData?.cash_balance || formattedBalance)}
                                                            </div>
                                                        </div>
                                                        <div className="value-card portfolio-value">
                                                            <div className="value-card-label">Portfolio Value</div>
                                                            <div className="value-card-amount">
                                                                {formatCurrency(portfolioData?.portfolio_value || 0)}
                                                            </div>
                                                        </div>
                                                        <div className="value-card total-value">
                                                            <div className="value-card-label">Total Value</div>
                                                            <div className="value-card-amount">
                                                                {formatCurrency(portfolioData?.total_value || formattedBalance)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    {portfolioData && portfolioData.total_value > 0 && (
                                                        <div className="value-distribution">
                                                            <div 
                                                                className="cash-portion"
                                                                style={{ width: `${Math.max(10, (portfolioData.cash_balance / portfolioData.total_value) * 100)}%` }}
                                                            >
                                                                Cash
                                                            </div>
                                                            <div 
                                                                className="portfolio-portion"
                                                                style={{ width: `${Math.max(10, (portfolioData.portfolio_value / portfolioData.total_value) * 100)}%` }}
                                                            >
                                                                Portfolio
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                            
                                            <div className="wallet-actions mt-3">
                                                <button 
                                                    className="btn btn-primary" 
                                                    onClick={handleDeposit} 
                                                    disabled={isDepositing}
                                                >
                                                    {isDepositing ? 'Processing...' : 'Deposit $10'}
                                                </button>
                                            </div>
                                        </div>
                                        
                                        {/* Portfolio Holdings Section */}
                                        <div className="portfolio-holdings mt-4">
                                            <h3>Market Positions</h3>
                                            
                                            {isLoadingPortfolio && !portfolioData ? (
                                                <SkeletonPositions count={3} />
                                            ) : portfolioData && portfolioData.positions && portfolioData.positions.length > 0 ? (
                                                <div className="position-list">
                                                    <div className="position-list-header">
                                                        <div className="position-title">Market</div>
                                                        <div className="position-shares">Shares</div>
                                                        <div className="position-value">Value</div>
                                                    </div>
                                                    
                                                    {portfolioData.positions.map((position, index) => (
                                                        <div className="position-item" key={index}>
                                                            <div className="position-title">
                                                                <Link to={`/news/${position.news_id}`}>
                                                                    {position.title || position.news_id}
                                                                </Link>
                                                            </div>
                                                            <div className="position-shares">
                                                                {position.yes_shares > 0 && (
                                                                    <div className="yes-shares">
                                                                        <span className="badge bg-success">YES: {position.yes_shares}</span>
                                                                    </div>
                                                                )}
                                                                {position.no_shares > 0 && (
                                                                    <div className="no-shares">
                                                                        <span className="badge bg-danger">NO: {position.no_shares}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="position-value">
                                                                {formatCurrency(position.total_value)}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="no-positions">
                                                    <p>You don't have any positions yet.</p>
                                                    <p>Start investing in markets to build your portfolio!</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {section === 'activities' && (
                                    <div className="fade-in">
                                        <h2>Activities</h2>
                                        
                                        {isLoadingActivities && page === 1 && activities.length === 0 ? (
                                            <LoadingSpinner message="Loading your activity history..." />
                                        ) : activities.length > 0 ? (
                                            <div className="activity-list">
                                                {activities.map((activity, index) => (
                                                    <div className="activity-item" key={index}>
                                                        <div className="activity-header">
                                                            <span className="activity-type">
                                                                {activity.side === 'buy' ? 'Bought' : 'Sold'}
                                                            </span>
                                                            <span className="activity-date">
                                                                {new Date(activity.created_at).toLocaleString()}
                                                            </span>
                                                        </div>
                                                        <div className="activity-content">
                                                            <p>
                                                                {activity.volume} shares at {formatCurrency(activity.price)} per share
                                                                {activity.news_id && (
                                                                    <Link to={`/news/${activity.news_id}`} className="activity-link">
                                                                        View Market
                                                                    </Link>
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                                
                                                {isLoadingActivities && page > 1 ? (
                                                    <div className="loading-more">
                                                        <LoadingSpinner message="Loading more activities..." />
                                                    </div>
                                                ) : hasMoreActivities && (
                                                    <button 
                                                        className="btn btn-outline-primary load-more" 
                                                        onClick={loadMoreActivities}
                                                    >
                                                        Load More
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="no-activities">
                                                <p>No activities found.</p>
                                                <p>Start participating in markets to see your activities here!</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {section === 'settings' && (
                                    <div className="fade-in">
                                        <h2>Settings</h2>
                                        <p className="settings-message">
                                            Settings configuration options will be available in a future update.
                                        </p>
                                        
                                        {/* Placeholder settings sections */}
                                        <div className="settings-section">
                                            <h3>Notification Preferences</h3>
                                            <p className="placeholder-text">Notification settings will be available soon.</p>
                                        </div>
                                        
                                        <div className="settings-section">
                                            <h3>Profile Privacy</h3>
                                            <p className="placeholder-text">Privacy controls will be available soon.</p>
                                        </div>
                                        
                                        <div className="settings-section">
                                            <h3>Display Options</h3>
                                            <p className="placeholder-text">Display customization will be available soon.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Profile;
