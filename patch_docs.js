const fs = require('fs');

// Update CHANGELOG
let changelog = fs.readFileSync('docs/08_CHANGELOG.md', 'utf-8');
const changelogEntry = `
## [Unreleased] - LOCAL-AUTH-001 (Controlled Offline Authentication)
### Added
- Created \`LocalAuthService\` to provision and verify offline authorization using the Web Crypto API (PBKDF2 with SHA-256).
- Added \`local_auth\` table to \`RotaLocalDatabase\` (schema version 13) to persist offline credentials.
- Test coverage for expiration policies, credential invalidation, unknown users, and robust RBAC offline caching.

### Changed
- \`LoginView.tsx\` updated to never allow automatic query-based offline fallback.
- Explicit invalid online credentials NEVER trigger offline fallback. Only network errors trigger the offline protocol.
- The UI properly distinguishes an 'ONLINE' session from an 'OFFLINE_CACHED' session in the Sidebar profile badge.
`;
changelog = changelog.replace('## [Unreleased]', changelogEntry + '\n## [Unreleased]');
fs.writeFileSync('docs/08_CHANGELOG.md', changelog);

// Update CURRENT STATE
let currentState = fs.readFileSync('docs/03_CURRENT_STATE.md', 'utf-8');
const stateUpdate = `
### Controlled Offline Authentication (LOCAL-AUTH-001)
- **Architecture**: The app relies primarily on Supabase Auth via a dedicated backend endpoint \`/api/auth/login\`.
- **Local Fallback**: Successful online authentication provisions a derived credential (PBKDF2+Salt, no plaintext passwords). If a network outage occurs during the next login, the user can authenticate locally using the offline verifier.
- **RBAC**: Operational units and roles are preserved during offline mode.
- **Security Check**: Invalid authoritative credentials explicitly reject access without trying offline fallback.
`;
currentState = currentState.replace('## Known Deficits', stateUpdate + '\n\n## Known Deficits');
fs.writeFileSync('docs/03_CURRENT_STATE.md', currentState);

// Update NEXT TASK
let nextTask = fs.readFileSync('docs/04_NEXT_TASK.md', 'utf-8');
nextTask = nextTask.replace(/# Próxima Tarefa: `LOCAL-AUTH-001` ou `SYNC-ARCH-001`/g, '# Próxima Tarefa: `SYNC-ARCH-001`');
nextTask = nextTask.replace(/A expansão Local-First foi completada com sucesso. Os fluxos operacionais centrais são offline-first. O próximo passo é empacotar a sincronização em um Worker \(SYNC-ARCH-001\) ou suportar autenticação offline \(LOCAL-AUTH-001\)\./g, 'A autenticação offline segura foi implementada. O próximo passo vital é o `SYNC-ARCH-001` para extrair o enfileiramento de processamento em background Web Worker, aliviando o main thread.');
fs.writeFileSync('docs/04_NEXT_TASK.md', nextTask);

