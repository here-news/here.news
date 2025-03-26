import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from './UserContext';
import serviceUrl from './config';
import Header from './Header';
import './Profile.css';

const Profile = () => {
    const { section = 'profile' } = useParams(); // Default to 'profile' if no section is specified
    const navigate = useNavigate();
    const { userInfo, loading, error } = useUser();

    useEffect(() => {
        if (!loading && !userInfo) {
            navigate('/');
        }
    }, [loading, userInfo, navigate]);

    const handleNavigation = (section) => {
        navigate(`/profile/${section}`);
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    if (!userInfo) {
        return null; // Avoid rendering the rest of the component if userInfo is not available
    }

    return (
        <>
            <Header />
            <div className="container mt-4">
                <div className="card">
                    <div className="card-body">
                        <div className="profile-container">
                            <div className="sidebar">
                                <ul>
                                    <li className={section === 'profile' ? 'active' : ''} onClick={() => handleNavigation('profile')}>Profile</li>
                                    <li className={section === 'wallet' ? 'active' : ''} onClick={() => handleNavigation('wallet')}>Wallet & Portfolio ✨</li>
                                    <li className={section === 'activities' ? 'active' : ''} onClick={() => handleNavigation('activities')}>Activities</li>
                                    <li className={section === 'settings' ? 'active' : ''} onClick={() => handleNavigation('settings')}>Settings</li>
                                </ul>
                            </div>
                            <div className="main-content">
                                {section === 'profile' && (
                                    <div>
                                        <h2>Profile</h2>
                                        <div>
                                            <img className="avatar-login" src={userInfo.avatar || `${serviceUrl}/avatar/${userInfo.public_key}?format=png&sz=32`} alt="Profile" />
                                            <p>ID: {userInfo.public_key}</p>
                                            <p>Name: {userInfo.name}</p>
                                            <p>Email: {userInfo.email}</p>
                                            {/* Add a form to update profile details */}
                                        </div>
                                    </div>
                                )}
                                {section === 'wallet' && (
                                    <div>
                                        <h2>Wallet</h2>
                                        <hr></hr>
                                        <h3>Balance: <b>{userInfo.balance} </b>USD</h3> <span>(* spice is the fuel to locomize all activities in community)</span>
                                        <hr></hr><h3>Transaction History</h3>
                                        <ul>
                                            {/* {userInfo.transactions.map((transaction, index) => (
                                                <li key={index}>{transaction.description}: {transaction.amount} ✨</li>
                                            ))} */}
                                        </ul>
                                    </div>
                                )}
                                {section === 'activities' && (
                                    <div>
                                        <h2>Activities</h2>
                                        {/* Display stories the user has engaged with */}
                                    </div>
                                )}
                                {section === 'settings' && (
                                    <div>
                                        <h2>Settings</h2>
                                        {/* Display user settings and privacy options */}
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
