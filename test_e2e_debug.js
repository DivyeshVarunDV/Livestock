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

async function debug() {
  const loginRes = await request('POST', '/auth/login', { email: 'admin@livestocare.local', password: 'Admin@12345' });
  const token = loginRes.data.access_token || loginRes.data.token;

  // Find a cleared animal to test milk collection success
  const animalsRes = await request('GET', '/animals', null, token);
  const clearedAnimal = animalsRes.data.find(a => a.mrlStatus === 'CLEARED');
  
  if (clearedAnimal) {
    console.log('Testing Collection on Cleared Animal:', clearedAnimal.tagNumber);
    const cRes = await request('POST', '/milk-collections', {
      farmId: clearedAnimal.farmId,
      animalId: clearedAnimal.id,
      date: new Date().toISOString(),
      quantity: 50,
      collectionCenter: 'Center B',
      batchId: 'BATCH_CLEARED_123'
    }, token);
    console.log('Collection created:', cRes.status === 201 ? 'YES' : cRes.data);

    const tRes = await request('POST', '/milk-tests', {
      batchId: 'BATCH_CLEARED_123',
      date: new Date().toISOString(),
      type: 'ANTIBIOTIC_RESIDUE',
      result: 'FAIL',
      location: 'Lab B',
      recordedByName: 'Dr. Admin'
    }, token);
    console.log('Test created:', tRes.status === 201 ? 'YES' : tRes.data);

    const vRes = await request('GET', '/violations', null, token);
    const violation = vRes.data.find(v => v.collectionId === cRes.data.id);
    console.log('Violation auto-created:', violation ? 'YES' : 'NO');
  }

  // Debug transfer
  const farmsRes = await request('GET', '/farms', null, token);
  const f1 = farmsRes.data[0];
  const f2 = farmsRes.data[1];
  
  console.log('F1 owner:', f1.ownerId, 'F2 owner:', f2.ownerId);
  const tRes = await request('POST', '/ownership-transfers', {
    animalId: animalsRes.data[0].id,
    currentOwnerId: f1.ownerId,
    newOwnerId: f2.ownerId,
    reason: 'Debug Transfer'
  }, token);

  const tId = tRes.data.id;
  await request('PUT', `/ownership-transfers/${tId}`, { status: 'APPROVED' }, token);
  
  const updatedAnimalRes = await request('GET', `/animals/${animalsRes.data[0].id}`, null, token);
  console.log('Original Farm:', animalsRes.data[0].farmId, 'New Farm:', updatedAnimalRes.data.farmId, 'Expected:', f2.id);
}

debug();
