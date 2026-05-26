/**
 * Diagnostic: find "当班实际车间" - round 4
 * New strategies: inline through production order, UNW prefix, View API
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const KC = require('./services/kingdeeService');
const client = KC.fromEnv();

(async () => {
  await client.loginByAppSecret();

  const FILTER = "FDate >= '2026-05-01' AND FDate <= '2026-05-07'";
  const BASE = ['FDate', 'FWorkShopID', 'F_FD_Machine', 'FQuaQty'];

  // Strategy 1: Inline through FMoNumber (production order)
  console.log('=== Inline through production order ===');
  const inlineProbes = [
    'FMoNumber.FWorkShopID',
    'FMoNumber.FWorkShopID.FName',
    'FMoNumber.F_FD_ActualDept',
    'FMoNumber.FShiftDeptID',
  ];
  for (const pf of inlineProbes) {
    try {
      const r = await client.executeBillQuery('SFC_OperationReport', {
        fieldKeys: [...BASE, pf],
        limit: 3,
        offset: 0,
        filter: "FDate='2026-05-07'",
        orderString: '',
        skipDateFilter: false,
      });
      let rows = r.data;
      if (rows && typeof rows === 'object' && !Array.isArray(rows) && Array.isArray(rows.Result)) {
        rows = rows.Result;
      }
      if (Array.isArray(rows) && rows.length > 0) {
        const vals = rows.slice(0, 3).map(row => Array.isArray(row) ? row[4] : '?');
        if (vals.some(v => v !== undefined && v !== null && v !== '')) {
          console.log(pf, '=>', vals.join(', '));
        } else {
          console.log(pf, '=> (all empty)');
        }
      }
    } catch (e) {
      console.log(pf, '=> ERROR:', e.message.slice(0, 60));
    }
  }

  // Strategy 2: Query with existing known fields at once to see if any contain workshop IDs
  console.log('\n=== Multi-field query to find workshop-like values ===');
  const manyFields = [
    'FDate', 'FWorkShopID', 'F_FD_Machine', 'FQuaQty', 'FMoNumber',
    'F_FD_OperDescp', 'F_UNW_WorkType2', 'F_YJY_loadTimes',
    'FMaterialId', 'FMaterialName', 'FSpecification',
    'FWorkShopID.FName', 'F_FD_Machine.FName', 'F_FD_Machine.FNumber',
  ];
  try {
    const r = await client.executeBillQuery('SFC_OperationReport', {
      fieldKeys: manyFields,
      limit: 10,
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
      // Print all columns for first 3 non-header rows
      let start = 0;
      if (rows[0] && Array.isArray(rows[0]) && rows[0].some(h => typeof h === 'string' && /^F[A-Z]/.test(h))) {
        console.log('Header found:', JSON.stringify(rows[0]));
        start = 1;
      }
      for (let i = start; i < Math.min(start + 3, rows.length); i++) {
        console.log('\nRow', i, ':');
        const row = rows[i];
        if (Array.isArray(row)) {
          for (let j = 0; j < row.length; j++) {
            const key = manyFields[j] || 'col' + j;
            const val = row[j];
            if (val !== null && val !== undefined && val !== '' && val !== 0 && val !== '0') {
              console.log('  [' + j + ']', key, '=', val);
            }
          }
        }
      }
    }
  } catch (e) {
    console.error('Multi-field query failed:', e.message);
  }

  // Strategy 3: Try to View a specific record by ID to get all fields
  console.log('\n=== Try View API ===');
  try {
    // First get a record ID
    const r1 = await client.executeBillQuery('SFC_OperationReport', {
      fieldKeys: ['FDate', 'FWorkShopID', 'FQuaQty', 'FID'],
      limit: 1,
      offset: 0,
      filter: FILTER,
      orderString: '',
      skipDateFilter: false,
    });
    let rows = r1.data;
    if (rows && typeof rows === 'object' && !Array.isArray(rows) && Array.isArray(rows.Result)) {
      rows = rows.Result;
    }
    if (Array.isArray(rows) && rows.length > 1) {
      const firstRow = rows[1]; // Skip header
      const recordId = Array.isArray(firstRow) ? firstRow[3] : null;
      console.log('FID query result:', JSON.stringify(firstRow));
    }

    // Try a different View approach - get form data
    const viewResult = await client._request(
      'Kingdee.BOS.WebApi.ServicesStub.DynamicFormService.View.common.kdsvc',
      { data: JSON.stringify({
        FormId: 'SFC_OperationReport',
        Number: '',
        Id: '0',
      })},
    );
    console.log('View API response:', typeof viewResult.data);
    console.log('Preview:', JSON.stringify(viewResult.data).slice(0, 500));
  } catch (e) {
    console.log('View API error:', e.message.slice(0, 100));
  }

  // Strategy 4: Try FID field to get record identifiers
  console.log('\n=== Get FID and primary keys ===');
  const pkFields = ['FDate', 'FWorkShopID', 'F_FD_Machine', 'FQuaQty', 'FID', 'FBillNo', 'FNumber', 'FSeq'];
  try {
    const r = await client.executeBillQuery('SFC_OperationReport', {
      fieldKeys: pkFields,
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
      let start = 0;
      if (rows[0] && rows[0].some(h => typeof h === 'string' && /^F[A-Z]/.test(h))) start = 1;
      for (let i = start; i < rows.length; i++) {
        const row = rows[i];
        if (Array.isArray(row)) {
          console.log('FID=' + row[4] + ' FBillNo=' + row[5] + ' FNumber=' + row[6] + ' FSeq=' + row[7]);
        }
      }
    }
  } catch (e) {
    console.log('PK fields error:', e.message.slice(0, 100));
  }

  console.log('\n=== Done ===');
})();
