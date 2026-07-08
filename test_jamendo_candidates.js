const axios = require('axios');

// Candidates found from search
const CLIENT_IDS = [
    'b6747d04',
    'c7668145',
    '3dce8b55',
    '9c9413d5', // Randomly found in other docs often
    '56d30c95'
];

async function test() {
    console.log("--- Testing Jamendo Candidate IDs ---");

    for (const id of CLIENT_IDS) {
        try {
            console.log(`Testing ID: ${id}...`);
            const res = await axios.get('https://api.jamendo.com/v3.0/tracks/', {
                params: {
                    client_id: id,
                    limit: 1,
                    format: 'json'
                },
                timeout: 3000
            });

            if (res.data?.results) {
                console.log(`SUCCESS! ID ${id} works.`);
                console.log("Sample:", res.data.results[0].name);
                return; // Stop at first working one
            }
        } catch (e) {
            const status = e.response ? e.response.status : 'Timeout/Error';
            const msg = e.response?.data?.headers?.error_message || e.message;
            console.log(`Failed (${id}): ${status} - ${msg}`);
        }
    }
}

test();
