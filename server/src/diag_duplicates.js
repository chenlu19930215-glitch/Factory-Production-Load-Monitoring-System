/**
 * Diagnostic: check for duplicate records in Kingdee pagination
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const KC = require('./services/kingdeeService');
const client = KC.fromEnv();

(async () => {
  await client.loginByAppSecret();

  const r = await client.executeBillQueryAll('SFC_OperationReport', {
    fieldKeys: ['FDate','FWorkShopID','F_FD_Machine','FQuaQty','F_FD_AimPerProduct','F_YJY_loadTimes','F_FD_OperDescp','F_UNW_WorkType2','F_FD_Machine.FName'],
    filter: "FDate >= '2026-05-01' AND FDate <= '2026-05-31'",
    orderString: 'FDate ASC'
  });

  let start = 0;
  if (Array.isArray(r[0]) && r[0].some(h => typeof h === 'string' && /^F/.test(h))) start = 1;

  console.log('Total raw rows:', r.length);
  console.log('Data start:', start);
  console.log('Data rows:', r.length - start);

  // Check for duplicates by (date, machine, ws, shift)
  const seen = new Map();
  let dupCount = 0;
  for (let i = start; i < r.length; i++) {
    const row = r[i];
    const mName = row[8] && row[8] !== '0' ? row[8] : row[2];
    const ws = row[1];
    const date = (row[0] || '').slice(0,10);
    const shift = row[7] || '';
    const key = date + '|' + mName + '|' + ws + '|' + shift;
    if (seen.has(key)) {
      dupCount++;
    }
    seen.set(key, (seen.get(key) || 0) + 1);
  }
  console.log('Duplicate records:', dupCount);
  console.log('Unique records:', seen.size);

  // Print records with >1 occurrence
  console.log('\n=== Records with >1 occurrence (showing all) ===');
  for (const [k, v] of seen) {
    if (v > 1) {
      console.log(k, 'count=' + v);
    }
  }

  // Count by workshop for 粉体M and 粉体B
  console.log('\n=== 粉体M by workshop ===');
  const mM = {};
  for (let i = start; i < r.length; i++) {
    const row = r[i];
    const mName = row[8] && row[8] !== '0' ? row[8] : row[2];
    if (mName !== '粉体M机台') continue;
    const ws = row[1];
    const qty = parseFloat(row[3]) || 0;
    if (!mM[ws]) mM[ws] = 0;
    mM[ws] += qty;
  }
  for (const [ws, total] of Object.entries(mM)) {
    console.log('ws=' + ws + ' total=' + total);
  }

  console.log('\n=== 粉体B by workshop ===');
  const mB = {};
  for (let i = start; i < r.length; i++) {
    const row = r[i];
    const mName = row[8] && row[8] !== '0' ? row[8] : row[2];
    if (mName !== '粉体B机台') continue;
    const ws = row[1];
    const qty = parseFloat(row[3]) || 0;
    if (!mB[ws]) mB[ws] = 0;
    mB[ws] += qty;
  }
  for (const [ws, total] of Object.entries(mB)) {
    console.log('ws=' + ws + ' total=' + total);
  }

  console.log('\n=== 粉体E by workshop ===');
  const mE = {};
  for (let i = start; i < r.length; i++) {
    const row = r[i];
    const mName = row[8] && row[8] !== '0' ? row[8] : row[2];
    if (mName !== '粉体E机台') continue;
    const ws = row[1];
    const qty = parseFloat(row[3]) || 0;
    if (!mE[ws]) mE[ws] = 0;
    mE[ws] += qty;
  }
  for (const [ws, total] of Object.entries(mE)) {
    console.log('ws=' + ws + ' total=' + total);
  }

  // Count records per page to understand pagination
  console.log('\n=== Pagination analysis ===');
  const pageSize = 200;
  const maxPages = 50;
  let totalFromPages = 0;
  for (let page = 0; page < maxPages; page++) {
    const offset = page * pageSize;
    const result = await client.callWithAuth(() =>
      client.executeBillQuery('SFC_OperationReport', {
        limit: pageSize,
        offset,
        fieldKeys: ['FDate','FWorkShopID','F_FD_Machine','FQuaQty','F_FD_AimPerProduct','F_YJY_loadTimes','F_FD_OperDescp','F_UNW_WorkType2','F_FD_Machine.FName'],
        filter: "FDate >= '2026-05-01' AND FDate <= '2026-05-31'",
        orderString: 'FDate ASC',
        skipDateFilter: false,
      }),
    );
    let rows = result.data;
    if (rows && typeof rows === 'object' && !Array.isArray(rows) && Array.isArray(rows.Result)) {
      rows = rows.Result;
    }
    if (!Array.isArray(rows)) {
      console.log('Page ' + page + ': non-array result', typeof rows);
      break;
    }
    console.log('Page ' + page + ' offset=' + offset + ' rows=' + rows.length + ' firstDate=' + ((rows[0] && rows[0][0] || '').slice(0,10)));
    totalFromPages += rows.length;
    if (rows.length < pageSize) break;
  }
  console.log('Total from all pages:', totalFromPages);
})();
