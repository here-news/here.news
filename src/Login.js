import React, { useState, useEffect, useRef } from 'react';
import { useUser } from './UserContext';

const Login = () => {
    const { publicKey, setPublicKey, isModalOpen, closeModal } = useUser();
    const [privateKey, setPrivateKey] = useState('');
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
        <div>
            {isModalOpen && (
                <div className="modal">
                    <div className="modal-content">
                        <span className="close" onClick={closeModal}>&times;</span>
                        <h2>Your secret key</h2>
                        <input
                            type="text"
                            placeholder="Enter your secret key"
                            value={privateKey}
                            onChange={(e) => setPrivateKey(e.target.value)}
                        />
                        <button onClick={handleLogin}>Login</button>
                        <button onClick={generateKeyPair}>Generate New Key Pair</button>
                        {tempPublicKey && (
                            <div>
                                <div id="avatarChoice">
                                    <img src={avatarUrlLarge} alt="Public Key Avatar"/>
                                </div> 
                                <span>* You can change to your avatar later</span>
                                <div>Public Key: {tempPublicKey}</div>
                                {/*<div>Private Key: {privateKey}</div> */}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Login;
