const fs = require('fs');
let content = fs.readFileSync('src/components/roteirizacao/RoteirizacaoView.tsx', 'utf8');

const regex = /^[ \t]*const performFullSync = async \([^)]*\) => \{[\s\S]*?\n[ \t]*\};\n/gm;

// replace all occurrences with empty string
let cleaned = content.replace(regex, '');

// now insert exactly ONE occurrence right before `const checkPreRomaneiosCloud = async () => {`
const newPerformSync = `  const performFullSync = async (active = true, showToast = true) => {
    const companyCode = adminUser?.unid || 'SPO';
    const username = adminUser?.username || 'admin';
    const adminUserName = adminUser?.name || '';
    const isAdminMaster = !!adminUser?.is_master;
    
    setIsSyncingPlan(true);

    try {
      const result = await routingPlanService.performFullSync(
        companyCode,
        username,
        planningDate,
        activeRoutingPlan?.id,
        isAdminMaster,
        adminUserName
      );
      
      setOnlineStatus(result.isOnline);
      if (!result.isOnline && showToast) {
        setToastMessage('⚠️ Supabase offline. Trabalhando localmente.');
        setTimeout(() => setToastMessage(null), 3000);
      }
      
      if (active) {
        setActiveUsersList(result.activeUsers);
        setActiveUsersCount(result.activeUsers.length);
        if (result.activePlan) setActiveRoutingPlan(result.activePlan);
        setRoutePlanningItems(result.items);
      }
    } catch (err) {
      console.error('[Roteirizacao] Erro sincronizando plano:', err);
      if (showToast) {
        setToastMessage('❌ Erro de conexão ao sincronizar mesa.');
        setTimeout(() => setToastMessage(null), 3000);
      }
    } finally {
      setIsSyncingPlan(false);
    }
  };\n\n`;

const target = '  const checkPreRomaneiosCloud = async () => {';
cleaned = cleaned.replace(target, newPerformSync + target);

fs.writeFileSync('src/components/roteirizacao/RoteirizacaoView.tsx', cleaned);
