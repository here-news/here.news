import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from './UserContext';
import serviceUrl from './config';
import Header from './Header';

const Profile = () => {
    const { section = 'profile' } = useParams(); // Default to 'profile' if no section is specified
    const navigate = useNavigate();
    const { userInfo, loading, error } = useUser();

    useEffect(() => {
        console.log('Profile section:', section);
    }, [section]);

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
        // go to homepage and login
        navigate('/');

    }

    return (
        <>
            <Header/>
        
            <div className="container mt-4">
            <div className="card">
                <div className="card-body">
                <div className="profile-container">
                    <div className="sidebar">
                        <ul>
                            <li className={section === 'profile' ? 'active' : ''} onClick={() => handleNavigation('profile')}>Profile</li>
                            <li className={section === 'spices' ? 'active' : ''} onClick={() => handleNavigation('spices')}>Spices ✨</li>
                            <li className={section === 'stories' ? 'active' : ''} onClick={() => handleNavigation('stories')}>Stories</li>
                            <li className={section === 'settings' ? 'active' : ''} onClick={() => handleNavigation('settings')}>Settings</li>
                        </ul>
                    </div>
                    <div className="main-content">
                        {section === 'profile' && (
                            <div>
                                <h2>Profile</h2>
                                <div>
                                    <img class="avatar-login" src={userInfo.avatar || serviceUrl+ '/avatar/' + userInfo.public_key + "?format=png&sz=32"} alt="Profile" />
                                    <p>Name: {userInfo.name}</p>
                                    <p>Email: {userInfo.email}</p>
                                    {/* Add a form to update profile details */}
                                </div>
                            </div>
                        )}
                        {section === 'spices' && (
                            <div>
                                <h2>Spices ✨</h2>
                                <hr></hr> 
                                <h3>Balance: <b>{userInfo.balance} </b>spices</h3> <span>(* spice is the fuel to locomize all activities in community)</span>
                                <hr></hr><h3>Transaction History</h3>
                                <ul>
                                    {/* {userInfo.transactions.map((transaction, index) => (
                                        <li key={index}>{transaction.description}: {transaction.amount} ✨</li>
                                    ))} */}
                                </ul>
                            </div>
                        )}
                        {section === 'stories' && (
                            <div>
                                <h2>Stories</h2>
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
