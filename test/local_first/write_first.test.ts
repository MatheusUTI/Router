import 'fake-indexeddb/auto';
import assert from 'assert';
import { db } from '../../src/infrastructure/localdb/db';
import { VehicleRepository } from '../../src/infrastructure/localdb/repositories/vehicleRepository';
import { DriverRepository } from '../../src/infrastructure/localdb/repositories/driverRepository';
import { AuditLogRepository } from '../../src/infrastructure/localdb/repositories/auditLogRepository';
import { Vehicle, DriverScore } from '../../src/types';

async function runTests() {
  console.log('--- Starting LOCAL-DATA-002 Write-First Tests ---');

  await db.vehicles.clear();
  await db.drivers.clear();
  await db.audit_logs.clear();
  await db.sync_queue.clear();

  // Test Vehicle
  const vehicle: Vehicle = {
    id: 'ABC1234',
    driverName: 'John Doe',
    capacity: '1000',
    type: 'VUC',
    status: 'Disponível' as any
  };

  const vId = await VehicleRepository.put(vehicle);
  assert.strictEqual(vId, 'ABC1234', 'Vehicle ID should match');

  const localVehicle = await db.vehicles.get('ABC1234');
  assert.ok(localVehicle, 'Vehicle should be in local DB');
  assert.strictEqual(localVehicle?.driverName, 'John Doe');

  let pending = await db.sync_queue.toArray();
  assert.strictEqual(pending.length, 1, 'Should have 1 item in sync queue');
  assert.strictEqual(pending[0].entity, 'vehicle');
  console.log('✓ Vehicle Write-First passed');

  // Test Driver
  await db.sync_queue.clear();
  const driver = {
    id: 'D001',
    name: 'Jane Doe',
    phone: '11999999999',
    score: 100,
    avatar: '',
    bestRoute: '',
    status: 'Excelente',
    vehicle: 'ABC1234',
    avgTime: 0,
    efficiency: 100,
    errorRate: 0,
    successRate: 100
  } as DriverScore;

  const dId = await DriverRepository.put(driver);
  assert.strictEqual(dId, 'D001');

  const localDriver = await db.drivers.get('D001');
  assert.ok(localDriver);
  assert.strictEqual(localDriver?.name, 'Jane Doe');

  pending = await db.sync_queue.toArray();
  assert.strictEqual(pending.length, 1, 'Should have 1 item in sync queue');
  assert.strictEqual(pending[0].entity, 'driver');
  console.log('✓ Driver Write-First passed');

  // Test AuditLog
  await db.sync_queue.clear();
  const logId = await AuditLogRepository.log({
    user: 'admin',
    isMaster: true,
    entityType: 'test',
    entityId: '123',
    action: 'CREATE',
    description: 'Test log'
  });

  assert.ok(logId);

  const localLog = await db.audit_logs.get(logId);
  assert.ok(localLog);
  assert.strictEqual(localLog?.description, 'Test log');

  pending = await db.sync_queue.toArray();
  assert.strictEqual(pending.length, 1, 'Should have 1 item in sync queue');
  assert.strictEqual(pending[0].entity, 'audit_log');
  console.log('✓ AuditLog Write-First passed');

  console.log('======================================================');
  console.log('ALL LOCAL-DATA-002 WRITE-FIRST TESTS PASSED! 🚀');
  console.log('======================================================');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
