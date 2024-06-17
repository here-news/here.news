import React, { useState, useEffect, useRef } from 'react';
import { useUser } from './UserContext';
import serviceUrl from './config';
import './Login.css';

const Login = () => {
    const { publicKey, setPublicKey, isModalOpen, closeModal } = useUser();
    const [privateKey, setPrivateKey] = useState('');
    const [name, setName] = useState('');
    const [registrationSuccess, setRegistrationSuccess] = useState(false);
    const [loginError, setLoginError] = useState('');

    const [tempPublicKey, setTempPublicKey] = useState('');

    const [avatarUrlSmall, setAvatarUrlSmall] = useState('');
    const [avatarUrlLarge, setAvatarUrlLarge] = useState('');

    const svgRef = useRef(null);

    useEffect(() => {
        const loadCryptoFunctions = async () => {
            if (!window.nobleSecp256k1) {
                window.nobleSecp256k1 = await import('https://cdn.jsdelivr.net/npm/noble-secp256k1@latest/+esm');
            }
            const nostrTools = await import('https://cdn.jsdelivr.net/gh/here-news/nostrjs@v0.0.4/src/nostr.js');
            const svgTool = await import('https://cdn.jsdelivr.net/gh/here-news/nostrjs@v0.0.4/src/key2svg.js');

            window.generateNostrKeyPair = nostrTools.generateNostrKeyPair;
            window.derivePublicKey = nostrTools.derivePublicKey;
            window.generateSVG = svgTool.generateSVG;

            createEmptySvg();

        };

        loadCryptoFunctions();
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
            if (typeof window.generateSVG === 'function') {
                await window.generateSVG(publicKey, svgRef.current);
                convertSvgToImage(svgRef.current, 32, setAvatarUrlSmall);
                convertSvgToImage(svgRef.current, 160, setAvatarUrlLarge);
            }
        }
    };

    const generateKeyPair = async () => {
        const { privateKey, publicKey } = await window.generateNostrKeyPair();
        setPrivateKey(privateKey);
        setTempPublicKey(publicKey);
        generateAvatar(publicKey);
    };

    const registerUser = async () => {
        const user = {
            "public_key": tempPublicKey,
            "name":name
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
        }
    };

    const handleLogin = async () => {
        const derivedPublicKey = await window.derivePublicKey(privateKey);
        setPublicKey(derivedPublicKey);
        localStorage.setItem('publicKey', derivedPublicKey);
        localStorage.setItem('privateKey', privateKey);
        console.log('public key', derivedPublicKey)
        localStorage.setItem('avatarUrlSmall', avatarUrlSmall);
        console.log('Keys stored', derivedPublicKey, privateKey, avatarUrlSmall);
        closeModal();
    };

    return (
        <>
        {isModalOpen && (
            <div className="modal">
                <div className="modal-content">
                    <span className="close" onClick={closeModal}>&times;</span>
                    {!registrationSuccess ? (
                        <div>
                            <h2>Register</h2>
                            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
                            <button onClick={generateKeyPair}>Generate Key Pair</button>
                            {tempPublicKey && (
                                <div>
                                    <div id="avatarChoice">
                                        <img src={avatarUrlLarge} alt="Public Key Avatar"/>
                                    </div> 
                                    <p>Public Key: {tempPublicKey}</p>
                                    <p>Private Key: {privateKey} (Note it NOW!)</p>
                                    <button onClick={registerUser}>Register</button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div>
                            <h2>Login</h2>
                            <input type="text" placeholder="Enter your private key" value={privateKey} onChange={(e) => setPrivateKey(e.target.value)} />
                            <button onClick={handleLogin}>Login</button>
                            {loginError && <p className="error">{loginError}</p>}
                        </div>
                    )}
                </div>
            </div>
        )}
    </>
    );
};

export default Login;
