const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf-8');

// Update Interface
code = code.replace(/adminRole: string;/, "adminRole: string;\n  authMode?: 'ONLINE' | 'OFFLINE_CACHED';");

// Update destructuring
code = code.replace(/adminRole,/, "adminRole,\n  authMode,");

// Add badge
const adminInfoBlock = `<p className="text-xs font-semibold text-on-surface truncate">{adminName}</p>`;
const newAdminInfoBlock = `<p className="text-xs font-semibold text-on-surface truncate flex items-center gap-1">
                  {adminName}
                  {authMode === 'OFFLINE_CACHED' && (
                    <span className="material-symbols-outlined text-[12px] text-orange-500" title="Sessão Local (Modo Offline)">cloud_off</span>
                  )}
                </p>`;
code = code.replace(adminInfoBlock, newAdminInfoBlock);

fs.writeFileSync('src/components/Sidebar.tsx', code);
