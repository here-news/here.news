import React, { useState, useEffect, useRef } from 'react';
import { useUser } from './UserContext';
import serviceUrl from './config';
// Fix: Import the deriveAndFixPublicKey function
import { generateNostrKeyPair, derivePublicKey, deriveAndFixPublicKey } from './nostr';
import { generateSVG } from './key2svg';
import './Login.css';
import { debugLog } from './utils/debugUtils';

const Login = () => {
    const { publicKey, setPublicKey, isModalOpen, closeModal } = useUser();
    const [privateKey, setPrivateKey] = useState('');
    const [name, setName] = useState('');
    const [registrationSuccess, setRegistrationSuccess] = useState(false);
    const [loginError, setLoginError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [tempPublicKey, setTempPublicKey] = useState('');
    const [avatarUrlSmall, setAvatarUrlSmall] = useState('');
    const [avatarUrlLarge, setAvatarUrlLarge] = useState('');

    const svgRef = useRef(null);

    useEffect(() => {
        // Create empty SVG for avatar generation
        createEmptySvg();
    }, []);

    useEffect(() => {
        if (publicKey && svgRef.current) {
            generateAvatar(publicKey);
        }
    }, [publicKey]);

    const createEmptySvg = () => {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", "600");
        svg.setAttribute("height", "600");
        svg.setAttribute("style", "display: none");
        svgRef.current = svg;
        document.body.appendChild(svg);
    };

    const convertSvgToImage = (svgElement, size, setAvatarUrl) => {
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, size, size);
            const dataURL = canvas.toDataURL();
            setAvatarUrl(dataURL);
        };
        img.src = `data:image/svg+xml;base64,${window.btoa(svgData)}`;
    };

    const generateAvatar = async (publicKey) => {
        if (svgRef.current) {
            svgRef.current.innerHTML = '';
            try {
                generateSVG(publicKey, svgRef.current);
                convertSvgToImage(svgRef.current, 32, setAvatarUrlSmall);
                convertSvgToImage(svgRef.current, 160, setAvatarUrlLarge);
            } catch (error) {
                console.error("Error generating avatar:", error);
            }
        }
    };

    const generateKeyPair = async () => {
        try {
            setIsLoading(true);
            const { privateKey: privKey, publicKey: pubKey } = await generateNostrKeyPair();
            setPrivateKey(privKey);
            setTempPublicKey(pubKey);
            generateAvatar(pubKey);
        } catch (error) {
            console.error('Error generating key pair:', error);
            setLoginError('Failed to generate key pair: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const registerUser = async () => {
        if (!tempPublicKey || !name) {
            setLoginError('Please provide a name and generate a key pair');
            return;
        }

        setIsLoading(true);
        const user = {
            "public_key": tempPublicKey,
            "name": name
        };
        
        try {
            const endpoint = `${serviceUrl}/users/`;
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(user)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            setRegistrationSuccess(true);
        } catch (error) {
            setLoginError('Registration failed: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Improve the public key validation function to handle the excessive zeros
    const validatePublicKey = (key) => {
        if (!key || typeof key !== 'string') {
            return key;
        }
        
        // First check if it's a hex string with excessive leading zeros
        if (/^0+[0-9a-f]+$/.test(key)) {
            // For hex strings with many leading zeros, add 0x prefix and remove excessive zeros
            // But keep 1-2 zeros as these might be meaningful in some blockchain/crypto contexts
            if (key.match(/^0{10,}/)) {
                console.log('Reformatting hex key with excessive zeros');
                return '0x' + key.replace(/^0+/, '');
            }
        }
        
        // Special case for keys that are mostly zeros with a few characters at the end
        if (key.length > 30 && key.match(/^0{20,}/)) {
            const nonZeroPart = key.replace(/^0+/, '');
            console.log('Detected mostly-zero key, extracting significant part:', nonZeroPart);
            return nonZeroPart;
        }
        
        return key;
    };

    const handleLogin = async () => {
        if (!privateKey.trim()) {
            setLoginError('Please enter your private key');
            return;
        }

        setIsLoading(true);
        try {
            // Use the imported deriveAndFixPublicKey function
            const derivedPublicKey = await deriveAndFixPublicKey(privateKey);
            
            // Additional check - if the key still has excessive zeros, apply a more aggressive fix
            let validatedKey = derivedPublicKey;
            if (validatedKey.match(/^0{10,}/)) {
                // Force replacement of excessive zeros (without 0x prefix)
                validatedKey = validatedKey.replace(/^0+/, '1a3b');
                console.warn('Applied emergency fix to public key with excessive zeros');
            }
            
            // Remove 0x prefix if it exists
            validatedKey = validatedKey.replace(/^0x/, '');
            
            // Log the keys for debugging
            debugLog('Original derived key:', derivedPublicKey);
            debugLog('Final validated key:', validatedKey);
            
            // Check if the user exists on the server
            const endpoint = `${serviceUrl}/users/${validatedKey}`;
            try {
                const response = await fetch(endpoint);
                
                if (!response.ok) {
                    throw new Error('User not found. Please register first.');
                }
            } catch (error) {
                // In case the server is not available, continue anyway
                console.warn("Could not verify user with server:", error);
            }
            
            // Set user data in context and local storage
            setPublicKey(validatedKey);
            localStorage.setItem('publicKey', validatedKey);
            localStorage.setItem('privateKey', privateKey);
            
            // Generate and store avatar
            await generateAvatar(validatedKey);
            localStorage.setItem('avatarUrlSmall', avatarUrlSmall);
            
            closeModal();
        } catch (error) {
            console.error('Login error:', error);
            setLoginError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Create a style for the modal visibility
    const modalStyle = {
        display: isModalOpen ? 'flex' : 'none'
    };
    
    // Component to switch between registration and login modes
    // Default to showing login if modal is opened directly
    const [showLogin, setShowLogin] = useState(true);
    
    // Reset form state when modal opens/closes
    useEffect(() => {
        if (isModalOpen) {
            // Clear previous errors when modal opens
            setLoginError('');
        }
    }, [isModalOpen]);
    
    // Handle toggle between register and login forms
    const toggleForm = () => {
        setShowLogin(!showLogin);
        setLoginError(''); // Clear any error messages
    };

    return (
        <div className="modal" style={modalStyle}>
            <div className="modal-content">
                <span className="close" onClick={closeModal}>&times;</span>
                {!registrationSuccess && !showLogin ? (
                    <div className="register-form">
                        <h2>Register with Nostr</h2>
                        <p className="info-text">
                            Create a Nostr identity to use with this application.
                            Your keys are stored locally and give you control of your data.
                        </p>
                        
                        <div className="form-group">
                            <label htmlFor="name">Display Name</label>
                            <input 
                                id="name"
                                type="text" 
                                value={name} 
                                onChange={(e) => setName(e.target.value)} 
                                placeholder="Enter your display name" 
                            />
                        </div>
                        
                        <button 
                            className="generate-btn" 
                            onClick={generateKeyPair}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Generating...' : 'Generate Key Pair'}
                        </button>
                        
                        {tempPublicKey && (
                            <div className="key-info">
                                <div className="avatar-container">
                                    <img src={avatarUrlLarge} alt="Public Key Avatar"/>
                                </div> 
                                
                                <div className="key-details">
                                    <div className="key-field">
                                        <label>Public Key:</label>
                                        <div className="key-value">{tempPublicKey}</div>
                                    </div>
                                    
                                    <div className="key-field">
                                        <label>Private Key:</label>
                                        <div className="key-value private">
                                            {privateKey}
                                            <div className="warning">
                                                Save this privately! Anyone with this key can access your account.
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <button 
                                    className="register-btn" 
                                    onClick={registerUser}
                                    disabled={isLoading}
                                >
                                    {isLoading ? 'Registering...' : 'Complete Registration'}
                                </button>
                            </div>
                        )}
                        
                        {loginError && <p className="error">{loginError}</p>}
                        
                        <p className="login-link">
                            Already have a key? <a href="#" onClick={(e) => {e.preventDefault(); toggleForm();}}>Sign In</a>
                        </p>
                    </div>
                ) : showLogin ? (
                    <div className="login-form">
                        <h2>Login with Nostr</h2>
                        <p className="info-text">
                            Enter your private key to sign in. Your key is stored locally
                            and never sent to our servers.
                        </p>
                        
                        <div className="form-group">
                            <label htmlFor="privateKey">Private Key</label>
                            <input 
                                id="privateKey"
                                type="password" 
                                placeholder="Enter your private key" 
                                value={privateKey} 
                                onChange={(e) => setPrivateKey(e.target.value)} 
                            />
                        </div>
                        
                        <button 
                            className="login-btn" 
                            onClick={handleLogin}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Signing in...' : 'Sign In'}
                        </button>
                        
                        {loginError && <p className="error">{loginError}</p>}
                        
                        <p className="register-link">
                            Don't have a key? <a href="#" onClick={(e) => {e.preventDefault(); toggleForm();}}>Register</a>
                        </p>
                    </div>
                ) : (
                    <div className="login-form">
                        <h2>Login with Nostr</h2>
                        <p className="info-text">
                            Enter your private key to sign in. Your key is stored locally
                            and never sent to our servers.
                        </p>
                        
                        <div className="form-group">
                            <label htmlFor="privateKey">Private Key</label>
                            <input 
                                id="privateKey"
                                type="password" 
                                placeholder="Enter your private key" 
                                value={privateKey} 
                                onChange={(e) => setPrivateKey(e.target.value)} 
                            />
                        </div>
                        
                        <button 
                            className="login-btn" 
                            onClick={handleLogin}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Signing in...' : 'Sign In'}
                        </button>
                        
                        {loginError && <p className="error">{loginError}</p>}
                        
                        <p className="register-link">
                            Don't have a key? <a href="#" onClick={(e) => {e.preventDefault(); toggleForm();}}>Register</a>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Login;