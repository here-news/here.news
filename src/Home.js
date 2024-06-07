import React, { useEffect, useState } from 'react';
import { useUser, UserProvider } from './UserContext';
import Header from './Header';
import serviceUrl from './config';

const Home = () => {
    const { publicKey, userInfo } = useUser() || {};
    const [loading, setLoading] = useState(true);
    const [topStories, setTopStories] = useState([]);
    // locad top stories from serviceurl /topstories
    
    useEffect(() => {
        fetch(`${serviceUrl}/topstories?range=1h`)
        .then(response => response.json())
        .then(data => {
            setTopStories(data);
            setLoading(false);
        })
        .catch(error => {
            setTopStories([]);
            console.error('Error fetching top stories:', error);
            setLoading(false);
        });
    }, []);

/**
 * 
{
"title": "Boeing's Starliner to Launch on Third Attempt, Carrying Astronauts to the ISS",
"story": "Boeing and NASA are set to launch the Starliner spacecraft on its third attempt on June 5th. The launch, scheduled for 10:52 am (1452 GMT) from the Cape Canaveral Space Force Station in Florida, aims to validate Boeing's spacecraft for ferrying astronauts to the International Space Station (ISS) under NASA's Commercial Crew Program. The mission represents a crucial step towards establishing routine crewed operations for Boeing's Starliner spacecraft. The astronauts on board, Barry 'Butch' Wilmore and Sunita 'Suni' Williams, have been training for several years and will spend over 24 hours traveling to the ISS. \n\nThis launch comes after several previous attempts were aborted due to technical issues, including a faulty power supply source, a buzzy valve on the rocket, a software bug, and flammable electrical tape in the cabin. The most recent scrub occurred on June 1, just minutes before liftoff, when the ground launch sequencer failed to load properly. Previous attempts in May were aborted due to a faulty oxygen relief valve and a helium leak in the service module. These technical problems have since been fixed, and Boeing is hopeful for a successful launch this time. \n\nIf successful, the Starliner capsule will dock with the orbiting research outpost around 250 miles above Earth. Wilmore and Williams are scheduled to remain at the station for roughly a week before returning to Earth via the Starliner for a parachute and airbag-assisted landing in the US southwestern desert. The spacecraft is also carrying a new pump for the astronauts' urine-to-water recycling system. \n\nBoeing's Starliner program has faced numerous challenges since NASA awarded the company $4.2 billion in 2014 to develop a spacecraft capable of transporting astronauts to and from the ISS. A successful crewed test flight is crucial for Boeing to demonstrate the Starliner's ability to safely transport astronauts and secure a larger share of NASA's business. Depending on the outcome, Starliner is booked to fly at least six more crewed missions to the ISS for NASA. [e2e0d3f9] [003aed98]",
"theme": "Advancements in Space Exploration",
"aboutness": "Boeing's Starliner Crewed Mission to the ISS",
"tags": [
"Boeing",
"Starliner",
"spacecraft",
"liftoff",
"International Space Station",
"NASA"
],
"taxonomy": [
"Space",
"Technology"
],
"refs": [
"e2e0d3f9",
"003aed98"
],
"uuid": "e0ba734d",
"value": 0.18,
"version": 0.97,
"last_updated": "2024-06-05T07:20:59.307000",
"changes": "Updated launch details and technical issues",
"created_at": "2023-10-30T03:36:35.497000",
"latest_note_id": "1933fc29e75b8eec2b7e1732771d94cac7c2d5d25e99e9f17e8c9966aa94b89c",
"nostr_key": "bda0e44e2c24f3d1747c2e89913b3635e52b0c4a54a85dd63331a2ef56a01e27",
"preview": "https://media.sudouest.fr/20003020/1200x-1/20240603155513-1581412.jpg"
},
 * 
 * 
 */

    return (
        <>
        <Header/>
        <div className="container mt-4">
            <div className="card">
                <div className="card-body">
                                <h1>the news you can trust as it's from you, and the community.</h1>
                                <p>Let's begin the journey together...</p>

                                <div> 
                                    <h2>Top Stories</h2>
                                    {loading ? (
                                        <div>Loading...</div>
                                    ) : (
                                        <div>
                                            <ul>
                                                {topStories.map(story => (
                                                    <li key={story.uuid}>
                                                        <a href={`/story/${story.uuid}`}>{story.title}</a>
                                                    </li>
                                                ))} 
                                            </ul>
                                        </div>
                                    )}

                                </div>
                </div>
            </div>
        </div>
        </>
    );
};

export default Home;