/**
 * Diagnostic: find "当班实际车间" field - round 2
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const KC = require('./services/kingdeeService');
const client = KC.fromEnv();

(async () => {
  await client.loginByAppSecret();

  // Explore GetFormDesignInfo response more
  console.log('=== GetFormDesignInfo raw preview ===');
  try {
    const meta = await client.getFormMeta('SFC_OperationReport');
    const data = meta.data;
    console.log('Type:', typeof data);
    if (typeof data === 'string') {
      console.log('Preview (first 2000 chars):', data.slice(0, 2000));
    }
  } catch (e) {
    console.error('GetFormDesignInfo error:', e.message);
  }

  // Field probing - much wider net
  console.log('\n=== Field probing (round 2) ===');
  const FILTER = "FDate >= '2026-05-01' AND FDate <= '2026-05-07'";
  const BASE_FIELDS = ['FDate', 'FWorkShopID', 'F_FD_Machine', 'FQuaQty'];

  // Try many more field name variants
  const moreFields = [
    // Actual/Duty/Shift workshop variants
    'F_FD_ActualWorkshopID',
    'F_FD_DutyWorkshop',
    'F_FD_DutyWorkshopID',
    'F_FD_ShiftWorkshopID',
    'F_FD_OnDutyWorkshop',
    'F_FD_WorkShiftDept',
    'F_FD_ActualDeptID',
    'F_FD_ProductDept',
    // Common Chinese Kingdee patterns
    'F_FD_SJWorkshop',
    'F_FD_RealWorkshopID',
    'F_FD_CurrentDept',
    'F_FD_WorkShop_Actual',
    'F_FD_WorkshopShift',
    'F_FD_DeptActual',
    'F_FD_DeptShift',
    // Without F_FD prefix
    'FActualDeptID',
    'FDutyWorkshopID',
    'FOnDutyWorkshopID',
    'FShiftDeptID',
    // More probes
    'FWorkshopID2',
    'FWorkshopID_2',
    'FActualWorkShop',
    'FDutyWorkShopID',
    'FRealWorkShop',
    // Other department-related fields
    'FReceiveDeptID',
    'FProvinceOrgId',
    'FBaseCurrId',
    'FBaseUnitId',
    'FWorkShopId',
    'FWorkShopNumber',
    // Probe from memory of common names
    'FStockOrgId',
    'FSaleOrgId',
    'FPurchaseOrgId',
    'FProductOrgId',
    'FProduceDeptId',
    'FWorkshop',
    'FWorkShopActual',
    // F_FD patterns with numbers
    'F_FD_0012',
    'F_FD_0013',
    'F_FD_0014',
    'F_FD_0015',
  ];

  // First let's find all F_FD_ fields that exist by trying sequential numbers
  console.log('\n=== F_FD_ field scan (sequential) ===');
  for (let i = 1; i <= 50; i++) {
    const fieldName = 'F_FD_' + String(i).padStart(4, '0');
    try {
      const r = await client.executeBillQuery('SFC_OperationReport', {
        fieldKeys: [...BASE_FIELDS, fieldName],
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
        const nonEmpty = vals.filter(v => v !== undefined && v !== null && v !== '' && v !== 0 && v !== '0');
        if (nonEmpty.length > 0) {
          console.log(fieldName + ' =>', vals.join(', '));
        }
      }
    } catch (e) {
      // Field doesn't exist
    }
  }

  // Try each probe field
  for (const pf of moreFields) {
    try {
      const r = await client.executeBillQuery('SFC_OperationReport', {
        fieldKeys: [...BASE_FIELDS, pf],
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
          console.log(pf + ' =>', vals.join(', '));
        }
      }
    } catch (e) {
      // skip
    }
  }

  // Also try to use query with SelectTop or with different API approach to explore the table structure
  console.log('\n=== Table structure via 0-row query ===');
  try {
    // Query with 0 limit to just get headers/structure
    const r = await client.executeBillQuery('SFC_OperationReport', {
      fieldKeys: ['FDate', 'FWorkShopID', 'FQuaQty'],
      limit: 1,
      offset: 0,
      filter: "FDate = '2026-05-01'",
      orderString: '',
      skipDateFilter: false,
    });
    let rows = r.data;
    if (rows && typeof rows === 'object' && !Array.isArray(rows) && Array.isArray(rows.Result)) {
      rows = rows.Result;
    }
    if (Array.isArray(rows) && rows.length > 1) {
      // Check if first row is a header
      const header = rows[0];
      if (Array.isArray(header)) {
        console.log('Row 0 (header?):', JSON.stringify(header));
        console.log('Row 1 (data?):', JSON.stringify(rows[1]));
      }
    }
  } catch (e) {
    console.error('Structure query failed:', e.message);
  }

  console.log('\n=== Done ===');
})();
