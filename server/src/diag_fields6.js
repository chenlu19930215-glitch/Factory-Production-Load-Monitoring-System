/**
 * Diagnostic: find "当班实际车间" - round 6
 * Test error handling, try querying system metadata tables, and more probes
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const KC = require('./services/kingdeeService');
const client = KC.fromEnv();

(async () => {
  await client.loginByAppSecret();
  const FILTER = "FDate >= '2026-05-01' AND FDate <= '2026-05-07'";

  // Test: what does Kingdee return for a field that definitely doesn't exist?
  console.log('=== Testing non-existent field behavior ===');
  try {
    const r = await client.executeBillQuery('SFC_OperationReport', {
      fieldKeys: ['FDate', 'FWorkShopID', 'THIS_FIELD_DOES_NOT_EXIST_XYZ', 'FQuaQty'],
      limit: 2,
      offset: 0,
      filter: FILTER,
      orderString: '',
      skipDateFilter: false,
    });
    console.log('No error thrown for non-existent field!');
    let rows = r.data;
    if (rows && typeof rows === 'object' && !Array.isArray(rows) && Array.isArray(rows.Result)) {
      rows = rows.Result;
    }
    if (Array.isArray(rows)) {
      console.log('Rows:', rows.length);
      if (rows.length > 1) {
        console.log('Row[1]:', JSON.stringify(rows[1]));
        console.log('col[2] type:', typeof rows[1][2], 'value:', rows[1][2]);
      }
    }
  } catch (e) {
    console.log('Error thrown:', e.message.slice(0, 100));
  }

  // Test: does FDeptID really not exist or return empty?
  console.log('\n=== Testing FDeptID more carefully ===');
  try {
    const r = await client.executeBillQuery('SFC_OperationReport', {
      fieldKeys: ['FDate', 'FDeptID', 'FWorkShopID', 'FQuaQty'],
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
      console.log('Total rows (including header):', rows.length);
      let start = 0;
      if (rows[0] && Array.isArray(rows[0]) && rows[0][0] && typeof rows[0][0] === 'string' && rows[0][0].startsWith('2026')) {
        start = 0; // no header
      }
      if (start === 0 && rows[0] && Array.isArray(rows[0]) && rows[0].some(h => typeof h === 'string' && /^F[A-Z]/.test(h))) {
        console.log('Header row:', JSON.stringify(rows[0]));
        start = 1;
      }
      for (let i = start; i < rows.length; i++) {
        console.log('Row', i, ': FDeptID=[', rows[i][1], '] FWorkShopID=[', rows[i][2], ']');
      }
    }
  } catch (e) {
    console.log('FDeptID error:', e.message.slice(0, 100));
  }

  // Strategy: Try to query the metadata through a system form
  console.log('\n=== Try querying system tables ===');
  const systemForms = [
    'T_META_FORMFIELD',
    'T_META_FIELD',
    'T_BAS_METADATA',
    'BOS_Metadata',
    'BOS_META',
    'SYS_METADATA',
    'BOS_FormMetadata',
  ];
  for (const sf of systemForms) {
    try {
      const r = await client.executeBillQuery(sf, {
        fieldKeys: ['FID'],
        limit: 1,
        offset: 0,
        filter: '',
        orderString: '',
        skipDateFilter: true,
      });
      let rows = r.data;
      if (rows && typeof rows === 'object' && !Array.isArray(rows) && Array.isArray(rows.Result)) {
        rows = rows.Result;
      }
      if (Array.isArray(rows) && rows.length > 0) {
        console.log(sf, 'exists, rows:', rows.length);
      }
    } catch (e) {
      // skip
    }
  }

  // Strategy: Use saved query approach - check if FShiftWorkshop exists with all variations
  console.log('\n=== Dot notation + inline resolution probes ===');
  const inlineProbes = [
    'FWorkShopID.FName',
    'FWorkShopID.FNumber',
    'FShiftWorkShopID.FName',
    'FShiftWorkShopID.FNumber',
    'FActualWorkShopID.FName',
    'FRelDeptID.FName',
    'FPrdDeptID.FName',
    'FReceiveDeptID.FName',
    'FDeptID.FName',
    'FOrgDeptID.FName',
  ];
  for (const pf of inlineProbes) {
    try {
      const r = await client.executeBillQuery('SFC_OperationReport', {
        fieldKeys: ['FDate', 'FWorkShopID', pf, 'FQuaQty'],
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
        const vals = rows.slice(0, 3).map(row => Array.isArray(row) && row.length > 2 ? row[2] : '?');
        if (vals.some(v => v !== undefined && v !== null && v !== '' && v !== 0 && v !== '0')) {
          console.log(pf, '=>', vals.join(', '));
        } else {
          console.log(pf, '=> (empty)');
        }
      }
    } catch (e) {
      console.log(pf, '=> ERROR:', e.message.slice(0, 60));
    }
  }

  // Also try to query FWorkShopID 当班 actual identification
  // by checking the form number field
  console.log('\n=== Form number probes ===');
  const formNumProbes = ['FBillNo', 'FDocumentStatus', 'FNumber', 'FSeq', 'FEntryID', 'FDetailID', 'FRowID'];
  for (const pf of formNumProbes) {
    try {
      const r = await client.executeBillQuery('SFC_OperationReport', {
        fieldKeys: ['FDate', 'FWorkShopID', pf, 'FQuaQty'],
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
        const vals = rows.slice(0, 3).map(row => Array.isArray(row) ? row[2] : '?');
        if (vals.some(v => v !== undefined && v !== null && v !== '')) {
          console.log(pf, '=>', vals.join(', '));
        } else {
          console.log(pf, '=>(empty)');
        }
      }
    } catch (e) {
      console.log(pf, '=> ERROR:', e.message.slice(0, 60));
    }
  }

  console.log('\n=== Done ===');
})();
