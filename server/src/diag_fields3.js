/**
 * Diagnostic: find "当班实际车间" field - round 3, wider scan
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const KC = require('./services/kingdeeService');
const client = KC.fromEnv();

(async () => {
  await client.loginByAppSecret();

  const FILTER = "FDate >= '2026-05-01' AND FDate <= '2026-05-07'";
  const BASE = ['FDate', 'FWorkShopID', 'F_FD_Machine', 'FQuaQty'];

  // Massive field name probe
  const massiveProbe = [
    // YJY_ prefix (already seen: F_YJY_loadTimes, F_YJY_equipSpeed, F_YJY_OEE)
    'F_YJY_ActualWorkshop',
    'F_YJY_ActualWorkshopID',
    'F_YJY_DutyWorkshop',
    'F_YJY_DutyWorkshopID',
    'F_YJY_ShiftWorkshop',
    'F_YJY_ShiftWorkshopID',
    'F_YJY_OnDutyWorkshop',
    'F_YJY_WorkshopActual',
    'F_YJY_ActualDept',
    'F_YJY_DutyDept',
    'F_YJY_ShiftDept',
    'F_YJY_WorkDept',
    // F_FD_ variants we haven't tried
    'F_FD_DutyDept',
    'F_FD_ShiftDept',
    'F_FD_OnDutyDept',
    'F_FD_ActualDept',
    'F_FD_RealDept',
    'F_FD_ActualWS',
    'F_FD_DutyWS',
    'F_FD_WSActual',
    // Short variants
    'FActualWS',
    'FDutyWS',
    'FShiftWS',
    'FRealWS',
    // Full Chinese pinyin
    'F_FD_DangBan',
    'F_FD_DangBanSJ',
    'F_FD_DangBanCheJian',
    'F_FD_SJCheJian',
    'F_FD_ShiJiCheJian',
    'F_FD_DangBanWorkshop',
    // Other common naming
    'F_FD_PrdWorkshop',
    'F_FD_PrdDept',
    'F_FD_WorkshopShift',
    'F_FD_WorkshopActual',
    'F_FD_DeptActual',
    'F_FD_DeptShift',
    'F_FD_Workshop2',
    'F_FD_Dept2',
    'F_FD_Dept_2',
    'F_FD_Workshop_Actual',
    'F_FD_Dept_Actual',
    // Standard field probes
    'FDepartment',
    'FDepartmentID',
    'FOrgDeptID',
    'FDeptNumber',
    'FFactoryDept',
    'FPrdDeptID',
    'FRelDeptID',
    'FShDeptID',
    'FCJDeptID',
    'FScDeptID',
    'FWorkShop',
    'FWorkShopNumber',
    'FWorkShopName',
    'FWorkShopId2',
    'FWorkShopId_A',
    // Dot notation probes (inline resolution)
    'F_FD_Machine.FNumber',
    'FWorkShopID.FName',
    'FWorkShopID.FNumber',
    // Common suffix patterns
    'F_FD_Machine2',
    'F_FD_Workshop',
    'F_FD_WorkshopID',
    'F_FD_Dept',
    'F_FD_DeptID',
  ];

  for (const pf of massiveProbe) {
    try {
      const r = await client.executeBillQuery('SFC_OperationReport', {
        fieldKeys: [...BASE, pf],
        limit: 3,
        offset: 0,
        filter: FILTER,
        orderString: '',
        skipDateFilter: false,
      });
      let rows = r.data;
      if (rows && typeof rows === 'object' && !Array.isArray(rows) && Array.isArray(rows.Result)) {
        rows = rows.Result;
      }
      if (Array.isArray(rows) && rows.length > 0) {
        const vals = rows.slice(0, 3).map(row => Array.isArray(row) ? row[4] : '?');
        if (vals.some(v => v !== undefined && v !== null && v !== '' && v !== 0 && v !== '0')) {
          console.log(pf, '=>', vals.join(', '));
        }
      }
    } catch (e) {
      // Field doesn't exist, skip
    }
  }

  // Also try to query with actual department name inline resolution
  console.log('\n=== FWorkShopID inline resolution ===');
  try {
    const r = await client.executeBillQuery('SFC_OperationReport', {
      fieldKeys: ['FDate', 'FWorkShopID', 'FWorkShopID.FName', 'FQuaQty'],
      limit: 5,
      offset: 0,
      filter: FILTER,
      orderString: '',
      skipDateFilter: false,
    });
    let rows = r.data;
    if (rows && typeof rows === 'object' && !Array.isArray(rows) && Array.isArray(rows.Result)) {
      rows = rows.Result;
    }
    if (Array.isArray(rows)) {
      for (const row of rows.slice(0, 5)) {
        if (Array.isArray(row)) {
          console.log('FWorkShopID.FName =', row[2], 'for workshop', row[1]);
        }
      }
    }
  } catch (e) {
    console.error('FWorkShopID.FName failed:', e.message);
  }

  console.log('\n=== Done ===');
})();
