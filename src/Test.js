import React from 'react';
import Header from "./Header";
import RatingBar from './RatingBar';
import Comments from './Comments';

const Test = () => {
    return (
        <div>
            <Header />  
            <div className='story-container'> 
                <h1> Ransomware Attacks Continue to Pose a Significant Threat</h1>
                <RatingBar positive={723 } negative={22} displayNumber={true} />
                <span> Ransomware attacks continue to pose a significant threat, with the Akira ransomware gang having extorted approximately $42 million from more than 250 victims. The gang targeted vulnerable Cisco VPNs in a campaign last year, impacting a wide range of businesses and critical infrastructure entities in North America, Europe, and Australia. The Akira gang gains initial access to organizations through a virtual private network (VPN) service without multifactor authentication (MFA) configured, primarily exploiting known vulnerabilities in Cisco systems. Once inside, they abuse the functions of domain controllers by creating new domain accounts to establish persistence. Akira utilizes a sophisticated hybrid encryption scheme, combining a ChaCha20 stream cipher with an RSA public-key cryptosystem for speed and secure key exchange. The group has been observed deploying two ransomware variants on different system architectures. The Cybersecurity and Infrastructure Security Agency (CISA) has issued an advisory that includes a list of tools used by Akira, indicators of compromise, and a list of MITRE ATT&CK tactics and techniques. CISA recommends implementing a recovery plan, requiring multifactor authentication, staying up to date on patches, and segmenting networks as mitigations against Akira ransomware attacks.        </span>
                <Comments newsId={"0572b215"} />
            </div>
        </div>
    );
};

export default Test;
