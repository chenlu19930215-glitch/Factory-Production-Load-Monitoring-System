/**
 * Diagnostic: find "当班实际车间" - round 5
 * Try different parameter formats + remaining field names
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const KC = require('./services/kingdeeService');
const client = KC.fromEnv();

(async () => {
  await client.loginByAppSecret();

  const FILTER = "FDate >= '2026-05-01' AND FDate <= '2026-05-07'";

  // Strategy 1: Try GetFormDesignInfo with different parameter formats
  console.log('=== GetFormDesignInfo - different formats ===');
  const metaPaths = [
    'Kingdee.BOS.WebApi.ServicesStub.DynamicFormService.GetFormDesignInfo.common.kdsvc',
  ];

  for (const path of metaPaths) {
    // Format A: params directly (no data wrapper)
    try {
      const r = await client._request(path, {
        FormId: 'SFC_OperationReport',
        SubSystemId: '',
        IsDeleteManagement: false,
      });
      const preview = typeof r.data === 'string' ? r.data.slice(0, 500) : JSON.stringify(r.data).slice(0, 500);
      console.log('Format A:', preview);
    } catch (e) {
      console.log('Format A error:', e.message.slice(0, 80));
    }
  }

  // Strategy 2: Try MetadataService endpoints
  console.log('\n=== Metadata endpoints ===');
  const metaEndpoints = [
    'Kingdee.BOS.WebApi.ServicesStub.MetadataService.GetFormMeta.common.kdsvc',
    'Kingdee.BOS.WebApi.ServicesStub.MetadataService.GetFormDesignInfo.common.kdsvc',
    'Kingdee.BOS.WebApi.ServicesStub.MetadataService.GetFieldList.common.kdsvc',
    'Kingdee.BOS.WebApi.ServicesStub.MetadataService.GetFormField.common.kdsvc',
  ];
  for (const ep of metaEndpoints) {
    try {
      const r = await client._request(ep, {
        data: JSON.stringify({ FormId: 'SFC_OperationReport' }),
      });
      const preview = typeof r.data === 'string' ? r.data.slice(0, 300) : JSON.stringify(r.data).slice(0, 300);
      console.log(ep.split('.').pop() + ':', preview);
    } catch (e) {
      console.log(ep.split('.').pop() + ': ERROR', e.message.slice(0, 60));
    }
  }

  // Strategy 3: Field probe - all remaining possibilities
  console.log('\n=== Final field probe batch ===');
  const finalProbe = [
    'FWorkShop',
    'FWorkShopId_Actual',
    'FWorkShopId_Shift',
    'FShiftWorkShop',
    'FReportWorkShop',
    'FReportDept',
    'FActualDeptID',
    'FOnDutyDept',
    'FDutyDeptID',
    'FReceiveDept',
    'FReceiveDeptID',
    'F_FD_Dept_Actual',
    'F_FD_Dept_Duty',
    'F_FD_Dept_Shift',
    'F_FD_WorkShopID2',
    'F_FD_WorkShop2',
    'F_UNW_WorkShop',
    'F_UNW_WorkShopID',
    'F_UNW_ShiftDept',
    'F_UNW_DutyDept',
    'F_UNW_ActualDept',
    'F_YJY_WorkShopID',
    'F_YJY_Dept',
    'F_YJY_DeptID',
    'F_FD_WorkCenter',
    'F_FD_PrdLine',
    'FWorkGroupID',
    'FWorkGroupId',
    // Try Chinese pinyin
    'F_FD_DB',
    'F_FD_DBSJ',
    'F_FD_SJ',
    'F_FD_SJCheJian',
    'F_FD_DangBan',
    'F_FD_ShiJi',
    // F_UNW_ remaining
    'F_UNW_WorkType',
    'F_UNW_loadTimes',
    'F_UNW_OEE',
    'F_UNW_equipSpeed',
  ];

  for (const pf of finalProbe) {
    try {
      const r = await client.executeBillQuery('SFC_OperationReport', {
        fieldKeys: ['FDate', 'FWorkShopID', 'F_FD_Machine', 'FQuaQty', pf],
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
        const hasVal = vals.some(v => v !== undefined && v !== null && v !== '' && v !== 0 && v !== '0');
        if (hasVal) {
          console.log(pf, '=>', vals.join(', '));
        }
      }
    } catch (e) {
      // skip
    }
  }

  // Strategy 4: Try getting ALL base data fields (department-linking) from the form
  console.log('\n=== Query BD_DEPARTMENT to see what links exist ===');
  try {
    // Check if there's any field in SFC that starts with specific prefixes
    for (let i = 0; i <= 30; i++) {
      for (const prefix of ['F_FD_', 'F_YJY_', 'F_UNW_']) {
        const padded = prefix + String(i).padStart(4, '0');
        try {
          const r = await client.executeBillQuery('SFC_OperationReport', {
            fieldKeys: ['FDate', padded, 'FQuaQty'],
            limit: 2,
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
            const row = rows[0];
            if (Array.isArray(row) && row.length >= 2) {
              console.log(padded, '=', row[1]);
            }
          }
        } catch (e) {
          // skip
        }
      }
    }
  } catch (e) {
    console.error('Sequential scan error:', e.message);
  }

  console.log('\n=== Done ===');
})();
