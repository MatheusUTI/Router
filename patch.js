const fs = require('fs');
const content = fs.readFileSync('src/components/roteirizacao/RoteirizacaoView.tsx', 'utf8');

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
  };`;

// replace from `const performFullSync = async (active = true, showToast = true) => {`
// to the closing `  };` of that function.

const startIdx = content.indexOf('const performFullSync = async (active = true, showToast = true) => {');
const nextFuncIdx = content.indexOf('const checkPreRomaneiosCloud = async () => {');

const endIdx = content.lastIndexOf('};', nextFuncIdx) + 2;

const newContent = content.substring(0, startIdx) + newPerformSync + "\n\n  " + content.substring(nextFuncIdx);

fs.writeFileSync('src/components/roteirizacao/RoteirizacaoView.tsx', newContent);
