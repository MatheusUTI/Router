import 'fake-indexeddb/auto';
import assert from 'assert';
import { webcrypto } from 'crypto';

// Polyfill Web Crypto for Node.js
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto as any;
}

import { db } from '../../src/infrastructure/localdb/db';
import { LocalAuthService } from '../../src/application/services/LocalAuthService';

async function runTests() {
  console.log('--- Starting LOCAL-AUTH-001 Tests ---');

  await db.local_auth.clear();

  const mockUser = {
    username: 'operador',
    name: 'Operador Teste',
    role: 'Operador',
    is_master: false,
    unid: 'SPO'
  };

  const password = 'securepassword123';

  console.log('1. User authenticates online (provisioning offline auth)');
  await LocalAuthService.provisionOfflineAuth('operador', password, mockUser);

  const authRecord = await db.local_auth.get('operador');
  assert.ok(authRecord, 'Offline authorization record should exist');
  assert.strictEqual(authRecord.username, 'operador');
  assert.strictEqual(authRecord.userProfile.name, 'Operador Teste');
  assert.ok(authRecord.salt, 'Salt should be generated');
  assert.ok(authRecord.verifier, 'Verifier should be generated');
  
  // ensure no plaintext password
  const recordStr = JSON.stringify(authRecord);
  assert.ok(!recordStr.includes(password), 'Plaintext password must NOT be stored');

  console.log('✓ Provisioning successful');

  console.log('2. Offline Authentication - Valid credentials');
  const validUser = await LocalAuthService.attemptOfflineAuth('operador', password);
  assert.ok(validUser, 'Offline auth should succeed with valid credentials');
  assert.strictEqual(validUser?.name, 'Operador Teste', 'RBAC/Profile should be preserved');
  console.log('✓ Offline authentication successful');

  console.log('3. Offline Authentication - Invalid credentials');
  const invalidUser = await LocalAuthService.attemptOfflineAuth('operador', 'wrongpassword');
  assert.ok(!invalidUser, 'Offline auth should fail with invalid credentials');
  console.log('✓ Invalid credentials rejected');

  console.log('4. Offline Authentication - Unknown user');
  const unknownUser = await LocalAuthService.attemptOfflineAuth('hacker', 'password');
  assert.ok(!unknownUser, 'Unknown user should be rejected');
  console.log('✓ Unknown user rejected');

  console.log('5. Expiration Policy Test');
  // force expiration
  const expiredDate = new Date();
  expiredDate.setDate(expiredDate.getDate() - 1);
  await db.local_auth.update('operador', { expiresAt: expiredDate.toISOString() });

  const expiredUser = await LocalAuthService.attemptOfflineAuth('operador', password);
  assert.ok(!expiredUser, 'Expired offline auth should be rejected');
  console.log('✓ Expiration policy enforced');

  console.log('======================================================');
  console.log('ALL LOCAL-AUTH-001 TESTS PASSED! 🚀');
  console.log('======================================================');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
