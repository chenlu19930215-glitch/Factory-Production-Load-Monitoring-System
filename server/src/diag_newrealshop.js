/**
 * Diagnostic: verify F_YJY_NewRealShop = 当班实际车间
 * Compare totals grouped by FWorkShopID vs F_YJY_NewRealShop
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const KC = require('./services/kingdeeService');
const client = KC.fromEnv();

(async () => {
  await client.loginByAppSecret();

  const FILTER = "FDate >= '2026-05-01' AND FDate <= '2026-05-25'";

  // Query with both workshop fields side by side
  console.log('=== Query FWorkShopID vs F_YJY_NewRealShop ===');
  try {
    const r = await client.executeBillQuery('SFC_OperationReport', {
      fieldKeys: ['FDate', 'FWorkShopID', 'F_YJY_NewRealShop', 'FQuaQty', 'F_FD_Machine', 'F_YJY_loadTimes', 'FMoNumber'],
      limit: 20000,
      offset: 0,
      filter: FILTER,
      orderString: '',
      skipDateFilter: false,
    });
    let rows = r.data;
    if (rows && typeof rows === 'object' && !Array.isArray(rows) && Array.isArray(rows.Result)) {
      rows = rows.Result;
    }
    if (!Array.isArray(rows)) {
      console.log('Unexpected format');
      return;
    }

    // Check for header row
    let start = 0;
    if (rows[0] && Array.isArray(rows[0]) && rows[0].some(h => typeof h === 'string' && /^F[A-Z]/.test(h))) {
      console.log('Header:', JSON.stringify(rows[0]));
      start = 1;
    }

    const totalRows = rows.length - start;
    console.log(`Data rows: ${totalRows}`);

    // Show a few sample rows to see the relationship
    console.log('\n=== Sample rows (first 10) ===');
    for (let i = start; i < Math.min(start + 10, rows.length); i++) {
      const row = rows[i];
      console.log(
        `Date=${row[0]}, FWorkShopID=${row[1]}, F_YJY_NewRealShop=${row[2]}, FQuaQty=${row[3]}, Machine=${row[4]}, Load=${row[5]}, Mo=${row[6]}`
      );
    }

    // Group by FWorkShopID and sum FQuaQty
    const wsTotals = {};
    const newRealTotals = {};
    const crossTab = {}; // FWorkShopID -> F_YJY_NewRealShop -> sum

    for (let i = start; i < rows.length; i++) {
      const row = rows[i];
      const ws = String(row[1] ?? '');
      const newReal = String(row[2] ?? '');
      const qty = Number(row[3]) || 0;

      wsTotals[ws] = (wsTotals[ws] || 0) + qty;
      newRealTotals[newReal] = (newRealTotals[newReal] || 0) + qty;

      if (!crossTab[ws]) crossTab[ws] = {};
      crossTab[ws][newReal] = (crossTab[ws][newReal] || 0) + qty;
    }

    console.log('\n=== Totals by FWorkShopID (加工车间) ===');
    const wsEntries = Object.entries(wsTotals).sort((a, b) => b[1] - a[1]);
    for (const [id, total] of wsEntries) {
      console.log(`  ${id}: ${total.toLocaleString()}`);
    }

    console.log('\n=== Totals by F_YJY_NewRealShop (当班实际车间) ===');
    const nrEntries = Object.entries(newRealTotals).sort((a, b) => b[1] - a[1]);
    for (const [id, total] of nrEntries) {
      console.log(`  ${id}: ${total.toLocaleString()}`);
    }

    // Cross-tab for Y固体二车间 (187426)
    console.log('\n=== Cross-tab: FWorkShopID=187426 breakdown by F_YJY_NewRealShop ===');
    if (crossTab['187426']) {
      const breakdown = Object.entries(crossTab['187426']).sort((a, b) => b[1] - a[1]);
      for (const [newRealId, total] of breakdown) {
        console.log(`  -> F_YJY_NewRealShop=${newRealId}: ${total.toLocaleString()}`);
      }
    }

    // Reverse cross-tab: for 当班实际车间=187426, what FWorkShopID values?
    console.log('\n=== Cross-tab: F_YJY_NewRealShop=187426 breakdown by FWorkShopID ===');
    const reverseTab = {};
    for (let i = start; i < rows.length; i++) {
      const row = rows[i];
      const ws = String(row[1] ?? '');
      const newReal = String(row[2] ?? '');
      const qty = Number(row[3]) || 0;
      if (newReal === '187426') {
        reverseTab[ws] = (reverseTab[ws] || 0) + qty;
      }
    }
    const revEntries = Object.entries(reverseTab).sort((a, b) => b[1] - a[1]);
    for (const [wsId, total] of revEntries) {
      console.log(`  -> FWorkShopID=${wsId}: ${total.toLocaleString()}`);
    }

    // Show rows where FWorkShopID != F_YJY_NewRealShop
    console.log('\n=== Sample rows where FWorkShopID != F_YJY_NewRealShop ===');
    let diffCount = 0;
    for (let i = start; i < rows.length; i++) {
      const row = rows[i];
      if (String(row[1]) !== String(row[2])) {
        if (diffCount < 15) {
          console.log(
            `Date=${row[0]}, FWorkShopID=${row[1]}, F_YJY_NewRealShop=${row[2]}, Qty=${row[3]}, Machine=${row[4]}`
          );
        }
        diffCount++;
      }
    }
    console.log(`Total rows where fields differ: ${diffCount}`);

    // Find the ID for Y固体二车间
    console.log('\n=== Find Y固体二车间 IDs ===');
    // The IDs we need: 187426 = Y固体二车间
    // Let's check what names these IDs map to
    const allIds = new Set([...Object.keys(wsTotals), ...Object.keys(newRealTotals)]);
    console.log('All unique workshop IDs:', [...allIds].join(', '));

  } catch (e) {
    console.error('Query failed:', e.message);
    console.error(e.stack);
  }

  console.log('\n=== Done ===');
})();
