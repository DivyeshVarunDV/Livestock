const http = require('http');

const API_URL = 'http://localhost:3001';

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING E2E TESTS ---');

  // 1. LOGIN
  const loginRes = await request('POST', '/auth/login', { email: 'admin@livestocare.local', password: 'Admin@12345' });
  if (loginRes.status !== 200 && loginRes.status !== 201) {
    console.error('Login Failed:', loginRes);
    return;
  }
  const token = loginRes.data.access_token || loginRes.data.token;
  console.log('1. Login:', token ? 'SUCCESS' : 'FAILED');

  // 2. GET ANIMAL & FARM
  const animalsRes = await request('GET', '/animals', null, token);
  const animal = animalsRes.data[0];
  console.log('2. Fetched Animal:', animal.tagNumber);

  const farmsRes = await request('GET', '/farms', null, token);
  const farm1 = farmsRes.data[0];
  const farm2 = farmsRes.data[1]; // for ownership transfer

  // 3. MILK COLLECTION
  const collectionRes = await request('POST', '/milk-collections', {
    farmId: farm1.id,
    animalId: animal.id,
    date: new Date().toISOString(),
    quantity: 10,
    collectionCenter: 'Center A',
    batchId: 'BATCH_123'
  }, token);
  console.log('3. Milk Collection Status:', collectionRes.status);
  const collectionId = collectionRes.data.id;

  // 4. MILK TEST (FAIL)
  const testRes = await request('POST', '/milk-tests', {
    batchId: 'BATCH_123',
    date: new Date().toISOString(),
    type: 'ANTIBIOTIC_RESIDUE',
    result: 'FAIL',
    location: 'Lab A',
    recordedByName: 'Dr. Admin'
  }, token);
  console.log('4. Milk Test (FAIL) Created:', testRes.status === 201 ? 'SUCCESS' : 'FAILED');

  // 5. CHECK AUTOMATED VIOLATION
  const violationsRes = await request('GET', '/violations', null, token);
  const violation = violationsRes.data.find(v => v.collectionId === collectionId || v.type === 'FAILED_MILK_TEST');
  console.log('5. Violation auto-created:', violation ? 'SUCCESS' : 'FAILED');

  // 6. OWNERSHIP TRANSFER
  if (farm2) {
    const transferRes = await request('POST', '/ownership-transfers', {
      animalId: animal.id,
      currentOwnerId: farm1.ownerId,
      newOwnerId: farm2.ownerId,
      reason: 'Sale'
    }, token);
    const transferId = transferRes.data.id;
    console.log('6. Ownership Transfer requested:', transferId ? 'SUCCESS' : 'FAILED');

    // Approve transfer
    const approveRes = await request('PUT', `/ownership-transfers/${transferId}`, {
      status: 'APPROVED'
    }, token);
    console.log('7. Transfer Approved:', approveRes.status === 200 ? 'SUCCESS' : 'FAILED');

    // Check animal farmId
    const updatedAnimalRes = await request('GET', `/animals/${animal.id}`, null, token);
    console.log('8. Animal Farm updated automatically:', updatedAnimalRes.data.farmId === farm2.id ? 'SUCCESS' : 'FAILED');
  } else {
    console.log('Skipping Ownership Transfer test (Need at least 2 farms).');
  }

  console.log('--- E2E TESTS COMPLETED ---');
}

runTests();
