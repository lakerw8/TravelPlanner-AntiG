const http = require('http');

const TRIP_ID = '3d16ea03-0bb5-449a-8d50-9bee5a6df3a5';

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            body: JSON.parse(data),
          });
        } catch {
          resolve({
            status: res.statusCode,
            body: data,
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  try {
    console.log('--- TEST 1: GET Trip ---');
    const tripRes = await makeRequest('GET', `/api/trips/${TRIP_ID}`);
    console.log('GET Trip Status:', tripRes.status);
    console.log('Itinerary Days Count:', tripRes.body?.itinerary?.length);
    console.log('Lists Count:', tripRes.body?.lists?.length);
    console.log('Places Count:', Object.keys(tripRes.body?.places || {}).length);

    console.log('\n--- TEST 2: POST Place ---');
    const testPlace = {
      googlePlaceId: 'test-place-id-' + Date.now(),
      name: 'Test Place ' + Date.now(),
      address: '123 Main St',
      type: 'restaurant',
      rating: 4.5,
      lat: 35.6,
      lng: 139.7,
    };
    const placeRes = await makeRequest('POST', `/api/trips/${TRIP_ID}/places`, testPlace);
    console.log('POST Place Status:', placeRes.status);
    console.log('POST Place Body:', placeRes.body);

    if (placeRes.status === 200 && placeRes.body?.id) {
      console.log('\n--- TEST 3: POST Itinerary Item ---');
      const itinPayload = {
        dayIndex: 0,
        item: {
          placeId: placeRes.body.id,
          startTime: '',
        },
      };
      const itinRes = await makeRequest('POST', `/api/trips/${TRIP_ID}/itinerary`, itinPayload);
      console.log('POST Itinerary Status:', itinRes.status);
      console.log('POST Itinerary Body:', itinRes.body);
    }
  } catch (err) {
    console.error('Test run failed:', err);
  }
}

runTests();
