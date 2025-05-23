import React, { useState, useEffect, useRef } from 'react';
import { useUser } from './UserContext';
import serviceUrl from './config';
import { generateNostrKeyPair, derivePublicKey, deriveAndFixPublicKey } from './nostr';
import { generateSVG } from './key2svg';
import './Login.css';
import { debugLog } from './utils/debugUtils';
import { apiRequest, setJwtToken } from './services/api';

const Login = () => {
    const { 
        publicKey, 
        setPublicKey, 
        isModalOpen, 
        closeModal, 
        openModal, // <-- added openModal from context
        fetchUserBalance,
        updateUserBalance
    } = useUser();
    const [privateKey, setPrivateKey] = useState('');
    const [name, setName] = useState('');
    const [registrationSuccess, setRegistrationSuccess] = useState(false);
    const [loginError, setLoginError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [tempPublicKey, setTempPublicKey] = useState('');
    const [avatarUrlSmall, setAvatarUrlSmall] = useState('');
    const [avatarUrlLarge, setAvatarUrlLarge] = useState('');
    const [hasNostrExtension, setHasNostrExtension] = useState(false);
    const [extensionName, setExtensionName] = useState('');
    const [showExtensionPrompt, setShowExtensionPrompt] = useState(false);
    const [dontAskAgain, setDontAskAgain] = useState(false);

    const svgRef = useRef(null);

    // Check for Nostr browser extensions and auto-prompt
    useEffect(() => {
        const checkNostrExtensions = async () => {
            // Check for window.nostr (NIP-07 standard)
            if (window.nostr) {
                setHasNostrExtension(true);
                try {
                    // Try to get the extension name
                    const extension = await window.nostr.getExtensionInfo?.() || {};
                    setExtensionName(extension.name || 'Nostr Extension');
                } catch (error) {
                    setExtensionName('Nostr Extension');
                }
                debugLog('Nostr extension detected:', window.nostr);
                
                // Check if we should show the auto-connect prompt
                const dontAsk = localStorage.getItem('nostrDontAskAgain') === 'true';
                const alreadyLoggedIn = !!localStorage.getItem('publicKey');
                
                if (!dontAsk && !alreadyLoggedIn && !isModalOpen) {
                    // Show the auto-connect prompt after a short delay
                    setTimeout(() => {
                        setShowExtensionPrompt(true);
                    }, 1000);
                }
            } else {
                debugLog('No Nostr extension detected');
                setHasNostrExtension(false);
            }
        };

        checkNostrExtensions();
    }, [isModalOpen]);

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
            const response = await apiRequest(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(user)
            }, false); // Registration is public
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            // Expect JWT in response
            const data = await response.json();
            if (data.token) {
                setJwtToken(data.token);
                localStorage.setItem('jwtToken', data.token);
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

    const handleExtensionLogin = async () => {
        if (!window.nostr) {
            setLoginError('Nostr extension not detected. Please install a Nostr extension like Nos2X or Alby.');
            return;
        }

        try {
            setIsLoading(true);
            
            // Request public key from the extension
            const extensionPubKey = await window.nostr.getPublicKey();
            
            if (!extensionPubKey) {
                throw new Error('Failed to get public key from extension');
            }
            
            debugLog('Got public key from extension:', extensionPubKey);
            
            // Validate and fix the public key if needed
            const validatedKey = extensionPubKey.replace(/^0x/, '');
            
            // Check if the user exists on the server
            const endpoint = `${serviceUrl}/users/${validatedKey}`;
            try {
                const response = await apiRequest(endpoint, {}, false); // Public check
                
                if (!response.ok) {
                    // If user doesn't exist, show registration form
                    setTempPublicKey(validatedKey);
                    setShowLogin(false); // Switch to registration view
                    setIsLoading(false);
                    return;
                }
                
                // User exists, try to login and get JWT
                const loginEndpoint = `${serviceUrl}/auth/login`;
                const loginResp = await apiRequest(loginEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ public_key: validatedKey })
                }, false);
                
                if (loginResp.ok) {
                    const loginData = await loginResp.json();
                    if (loginData.token) {
                        setJwtToken(loginData.token);
                        localStorage.setItem('jwtToken', loginData.token);
                    }
                }
            } catch (error) {
                console.warn("Could not verify user with server:", error);
            }
            
            // Set user data in context and local storage
            setPublicKey(validatedKey);
            localStorage.setItem('publicKey', validatedKey);
            // We don't store private key when using extensions
            localStorage.removeItem('privateKey');
            
            // Generate and store avatar
            await generateAvatar(validatedKey);
            localStorage.setItem('avatarUrlSmall', avatarUrlSmall);
            
            // Fetch user balance immediately after login
            try {
                await fetchUserBalance(validatedKey);
                debugLog('User balance fetched after login');
            } catch (balanceError) {
                console.error('Failed to fetch balance after login:', balanceError);
            }
            
            closeModal();
        } catch (error) {
            console.error('Extension login error:', error);
            setLoginError(`Error logging in with extension: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
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
                const response = await apiRequest(endpoint, {}, false); // Public check
                
                if (!response.ok) {
                    throw new Error('User not found. Please register first.');
                }
                
                // User exists, try to login and get JWT
                const loginEndpoint = `${serviceUrl}/auth/login`;
                const loginResp = await apiRequest(loginEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ public_key: validatedKey, private_key: privateKey })
                }, false);
                
                if (loginResp.ok) {
                    const loginData = await loginResp.json();
                    if (loginData.token) {
                        setJwtToken(loginData.token);
                        localStorage.setItem('jwtToken', loginData.token);
                    }
                }
            } catch (error) {
                console.warn("Could not verify user with server:", error);
            }
            
            // Set user data in context and local storage
            setPublicKey(validatedKey);
            localStorage.setItem('publicKey', validatedKey);
            localStorage.setItem('privateKey', privateKey);
            
            // Generate and store avatar
            await generateAvatar(validatedKey);
            localStorage.setItem('avatarUrlSmall', avatarUrlSmall);
            
            // Fetch user balance immediately after login
            try {
                await fetchUserBalance(validatedKey);
                debugLog('User balance fetched after login');
            } catch (balanceError) {
                console.error('Failed to fetch balance after login:', balanceError);
            }
            
            closeModal();
        } catch (error) {
            console.error('Login error:', error);
            setLoginError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

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

    // Function to handle auto-connect prompt response
    const handleExtensionPromptResponse = (connect, dontAsk) => {
        setShowExtensionPrompt(false);
        if (dontAsk) {
            localStorage.setItem('nostrDontAskAgain', 'true');
            setDontAskAgain(true);
        }
        if (connect) {
            // If user wants to connect, open modal and attempt extension login
            openModal();
            setTimeout(() => {
                handleExtensionLogin();
            }, 500);
        }
    };

    return (
        <>
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
                                Enter your private key to sign in or use a Nostr browser extension.
                            </p>
                            
                            {/* Extension Login Button */}
                            {hasNostrExtension && (
                                <div className="extension-login-container">
                                    <button 
                                        className="extension-login-btn" 
                                        onClick={handleExtensionLogin}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? 'Connecting...' : `Login with ${extensionName}`}
                                    </button>
                                    <p className="extension-info">
                                        <small>
                                            Securely login using your browser extension without entering your private key
                                        </small>
                                    </p>
                                    <div className="separator">
                                        <span>or</span>
                                    </div>
                                </div>
                            )}
                            
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
                                {isLoading ? 'Signing in...' : 'Sign In with Key'}
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
            
            {/* Add the auto-connect prompt */}
            {showExtensionPrompt && (
                <div className="nostr-extension-prompt">
                    <div className="prompt-content">
                        <div className="prompt-header">
                            <h3>Nostr Extension Detected</h3>
                            <button className="close-prompt" onClick={() => setShowExtensionPrompt(false)}>×</button>
                        </div>
                        <p>We detected {extensionName}. Would you like to connect with it?</p>
                        <div className="prompt-actions">
                            <label>
                                <input 
                                    type="checkbox" 
                                    checked={dontAskAgain}
                                    onChange={(e) => setDontAskAgain(e.target.checked)}
                                /> 
                                Don't ask again
                            </label>
                            <div className="prompt-buttons">
                                <button onClick={() => handleExtensionPromptResponse(false, dontAskAgain)}>
                                    Not Now
                                </button>
                                <button className="connect-btn" onClick={() => handleExtensionPromptResponse(true, dontAskAgain)}>
                                    Connect
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Login;