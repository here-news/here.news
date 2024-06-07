import React, { useState } from 'react';
import { useUser } from './UserContext';
import { useNavigate } from 'react-router-dom';

import Login from './Login';

const ProfileWidget = () => {
    const { publicKey, userInfo, setPublicKey, openModal, shortenPublicKey  } = useUser();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const navigate = useNavigate();

    const toggleDropdown = () => {
        setIsDropdownOpen(!isDropdownOpen);
    };
    const gotoProfile = (section) => () => {
        navigate(`/profile/${section}`);
    };
    const handleLogout = () => {
        setPublicKey('');
        localStorage.removeItem('publicKey');
        localStorage.removeItem('privateKey');
    };
    const avatarUrl = userInfo && userInfo.avatar ? userInfo.avatar : localStorage.getItem('avatarUrlSmall');


    return (
        <div className="user-profile">
            {!publicKey ? (
                <button onClick={openModal}>
                    Login / Register
                </button>
            ) : (
                <div className="user-info">
                    <div className="user-details">
                        <span>✨ {userInfo ? userInfo.balance : 0}</span>
                    </div> &nbsp;&nbsp;
                    <div onClick={toggleDropdown} className="avatarLogin">
                    <img src={avatarUrl} alt={shortenPublicKey(publicKey, 3)} />
                        <span>{userInfo && userInfo.name? userInfo.name : shortenPublicKey(publicKey, 3) }</span>
                        {isDropdownOpen && (
                            <div className="profile-menu">
                            <span onClick={gotoProfile('')}>Profile</span><br/>
                            <span onClick={gotoProfile('spices')}>Spices</span><br/>
                            <span onClick={gotoProfile('stories')}>Stories</span><br/>
                            <span onClick={gotoProfile('settings')}>Settings</span><hr/>
                            <span onClick={handleLogout}>Logout</span><br/>

                            </div>
                        )}
                    </div>
                </div>
            )}
            <Login />
        </div>
    );
};

export default ProfileWidget;
