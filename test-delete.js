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
    const lists = tripRes.body?.lists || [];
    console.log('Lists:', lists);

    if (lists.length === 0) {
      console.log('No lists found to test delete.');
      return;
    }

    const testList = lists[0];
    const placeId = testList.placeIds[0];

    if (!placeId) {
      console.log('List exists but has no places. Let us POST a place to it.');
      const testPlace = {
        googlePlaceId: 'test-del-place-' + Date.now(),
        name: 'Delete Test Place',
        address: '123 Main St',
        type: 'restaurant',
        rating: 4.5,
        lat: 35.6,
        lng: 139.7,
      };
      const placeRes = await makeRequest('POST', `/api/trips/${TRIP_ID}/places`, testPlace);
      console.log('POST Place to trip status:', placeRes.status);
      
      const listPostRes = await makeRequest('POST', `/api/trips/${TRIP_ID}/lists/${testList.id}`, { placeId: placeRes.body.id });
      console.log('POST place to list status:', listPostRes.status);
      
      // Let's run delete now
      console.log('\n--- TEST 2: DELETE place from list ---');
      const delRes = await makeRequest('DELETE', `/api/trips/${TRIP_ID}/lists/${testList.id}?placeId=${encodeURIComponent(placeRes.body.id)}`);
      console.log('DELETE status:', delRes.status);
      console.log('DELETE body:', delRes.body);
    } else {
      console.log('\n--- TEST 2: DELETE place from list ---');
      console.log(`Deleting place ${placeId} from list ${testList.id}`);
      const delRes = await makeRequest('DELETE', `/api/trips/${TRIP_ID}/lists/${testList.id}?placeId=${encodeURIComponent(placeId)}`);
      console.log('DELETE status:', delRes.status);
      console.log('DELETE body:', delRes.body);
    }
  } catch (err) {
    console.error('Test run failed:', err);
  }
}

runTests();
