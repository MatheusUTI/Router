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

// We have TWO performFullSync blocks now.
// Let's find the FIRST one, and the SECOND one.
// The first one is the new one we inserted.
// The second one is the old one.

const firstIdx = content.indexOf('const performFullSync = async');
const secondIdx = content.indexOf('const performFullSync = async', firstIdx + 10);
const nextFuncIdx = content.indexOf('const checkPreRomaneiosCloud = async () => {');

// Just remove everything from firstIdx to nextFuncIdx, and insert our new logic
const newContent = content.substring(0, firstIdx) + newPerformSync + "\n\n  " + content.substring(nextFuncIdx);

fs.writeFileSync('src/components/roteirizacao/RoteirizacaoView.tsx', newContent);
