/**
 * Diagnostic: find "当班实际车间" field in SFC_OperationReport
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const KC = require('./services/kingdeeService');
const client = KC.fromEnv();

(async () => {
  await client.loginByAppSecret();

  // Method 1: Try GetFormDesignInfo API
  console.log('=== Method 1: GetFormDesignInfo ===');
  try {
    const meta = await client.getFormMeta('SFC_OperationReport');
    const data = meta.data;
    console.log('Response type:', typeof data);

    let fields = [];
    if (data && typeof data === 'object') {
      // Try different property names
      for (const key of ['FieldList', 'Fields', 'Columns', 'ColumnList', 'fieldList', 'fields']) {
        if (Array.isArray(data[key])) {
          fields = data[key];
          console.log('Found via', key, 'count=', fields.length);
          break;
        }
      }
      if (!fields.length) {
        // Explore the object structure
        console.log('Top keys:', Object.keys(data).slice(0, 20));
        // Maybe it's nested
        for (const key of Object.keys(data)) {
          const val = data[key];
          if (val && typeof val === 'object') {
            if (Array.isArray(val)) console.log(key, 'is array length', val.length);
            else console.log(key, 'has keys:', Object.keys(val).slice(0, 10));
          }
        }
      }
    }

    if (fields.length > 0) {
      console.log('\n=== Workshop-related fields ===');
      for (const f of fields) {
        const name = f.Name || f.FieldName || f.name || '';
        const label = f.Label || f.Caption || f.label || '';
        const desc = f.Description || f.description || '';
        const combined = (name + '|' + label + '|' + desc).toLowerCase();
        if (/车间|workshop|工段|部门|dept|加工/i.test(combined)) {
          console.log('Name:', name, '| Label:', label);
        }
      }
    }
  } catch (e) {
    console.error('GetFormDesignInfo failed:', e.message);
  }

  // Method 2: Probe common field names for "当班实际车间"
  console.log('\n=== Method 2: Field probing ===');
  const MAY_FILTER = "FDate >= '2026-05-01' AND FDate <= '2026-05-07'";

  const probeFields = [
    // Standard workshop variants
    'FWorkShopID',
    'FActualWorkShopID',
    'FRealWorkShopID',
    'FShiftWorkShopID',
    'FWorkShop',
    'FWorkShopId2',
    // Custom F_FD_ variants
    'F_FD_ActualWS',
    'F_FD_ActualWorkshop',
    'F_FD_ShiftWorkshop',
    'F_FD_CurrentWorkshop',
    'F_FD_RealWorkshop',
    'F_FD_WorkShop2',
    'F_FD_ActualDept',
    'F_FD_RealDept',
    'F_FD_ShiftDept',
    'F_FD_PrdDept',
    'F_FD_WorkDept',
    // Other possibilities
    'FPrdOrgID',
    'FWorkCenterID',
    'FDeptID',
    'FFactoryID',
  ];

  for (const pf of probeFields) {
    try {
      const r = await client.executeBillQuery('SFC_OperationReport', {
        fieldKeys: ['FDate', pf, 'FWorkShopID', 'F_FD_Machine', 'FQuaQty'],
        limit: 5,
        offset: 0,
        filter: MAY_FILTER,
        orderString: '',
        skipDateFilter: false,
      });
      let rows = r.data;
      if (rows && typeof rows === 'object' && !Array.isArray(rows) && Array.isArray(rows.Result)) {
        rows = rows.Result;
      }
      if (Array.isArray(rows) && rows.length > 0) {
        const sample = rows.slice(0, 3).map(row => {
          if (Array.isArray(row)) {
            return row[1] !== undefined && row[1] !== null && row[1] !== '' ? row[1] : '(empty)';
          }
          return '(unknown)';
        });
        if (sample.some(v => v !== '(empty)')) {
          console.log(pf + ' => ' + sample.join(', '));
        }
      }
    } catch (e) {
      // Field doesn't exist, skip
    }
  }

  // Method 3: Try to find any column beyond our known field list using BOS table structure
  console.log('\n=== Method 3: BOS table structure ===');
  try {
    // ExecuteBillQuery with `Columns` to get row metadata
    const r = await client.executeBillQuery('SFC_OperationReport', {
      fieldKeys: ['FDate', 'FWorkShopID', 'F_FD_Machine', 'FQuaQty'],
      limit: 1,
      offset: 0,
      filter: MAY_FILTER,
      orderString: '',
      skipDateFilter: false,
    });
    let rows = r.data;
    if (rows && typeof rows === 'object' && !Array.isArray(rows) && Array.isArray(rows.Result)) {
      rows = rows.Result;
    }
    if (Array.isArray(rows) && rows.length > 0) {
      console.log('Row columns:', rows[0].length);
      console.log('Row data:', JSON.stringify(rows[0]));
    }
  } catch (e) {
    console.error('BOS structure failed:', e.message);
  }

  console.log('\n=== Done ===');
})();
