/**
 * 金蝶数据调试脚本 - 查询原始数据核对
 *
 * 用法: node src/debug_inspect.js
 * 需要在 server/ 目录下运行
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const KingdeeClient = require('./services/kingdeeService');
const { WORKSHOPS, EQUIPMENT_LIST } = require('./config/workshopMasterData');

const client = KingdeeClient.fromEnv();
const EQUIPMENT_NAMES = new Set(EQUIPMENT_LIST.map(e => e.name));

const FIELD_KEYS = [
  'FDate',               // 0
  'FWorkShopID',         // 1
  'F_FD_Machine',        // 2
  'FQuaQty',             // 3
  'F_FD_AimPerProduct',  // 4
  'F_YJY_loadTimes',     // 5
  'F_FD_OperDescp',      // 6
  'F_UNW_WorkType2',     // 7
];
const DOT_FIELD = 'F_FD_Machine.FName';
const extendedKeys = [...FIELD_KEYS, DOT_FIELD];

function parseRecords(rawResult) {
  const firstRow = rawResult[0];
  let dataStart = 0;
  if (Array.isArray(firstRow)) {
    const hasHeader = firstRow.some(h => typeof h === 'string' && /^F[A-Z]/.test(h));
    if (hasHeader) dataStart = 1;
  }
  const records = [];
  for (let i = dataStart; i < rawResult.length; i++) {
    const row = rawResult[i];
    const fields = {};
    FIELD_KEYS.forEach((key, j) => {
      const v = row[j];
      fields[key] = (v !== undefined && v !== null && v !== '') ? String(v) : '';
    });
    // Dot field for machine name
    const machineName = row[FIELD_KEYS.length];
    if (machineName && machineName !== '0') {
      fields['F_FD_Machine'] = String(machineName);
    }
    records.push(fields);
  }
  return records;
}

async function resolveWorkshops(records) {
  const ids = [...new Set(records.map(r => r['FWorkShopID']).filter(v => v && v !== '0'))];
  if (ids.length === 0) return {};
  const nameMap = {};
  const BATCH = 200;
  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = ids.slice(i, i + BATCH);
    const filter = `FDeptId in (${batch.join(',')})`;
    try {
      const { data } = await client.callWithAuth(() =>
        client.executeBillQuery('BD_DEPARTMENT', {
          limit: batch.length, offset: 0,
          fieldKeys: ['FDeptId', 'FName'],
          filter, orderString: '', skipDateFilter: true,
        })
      );
      let rows = data;
      if (rows && typeof rows === 'object' && !Array.isArray(rows) && Array.isArray(rows.Result)) {
        rows = rows.Result;
      }
      if (Array.isArray(rows)) {
        for (const row of rows) {
          if (Array.isArray(row) && row.length >= 2) {
            const id = String(row[0]), name = String(row[1]);
            if (id && name && name !== 'undefined') nameMap[id] = name;
          }
        }
      }
    } catch (e) { console.warn('BD_DEPARTMENT error:', e.message); }
  }
  return nameMap;
}

async function main() {
  if (!client.isConfigured()) { console.error('金蝶未配置'); return; }
  await client.loginByAppSecret();
  console.log('登录成功\n');

  // === Part 1: 查询 2026-05-26 的原始数据 ===
  console.log('='.repeat(80));
  console.log('PART 1: 2026-05-26 原始数据');
  console.log('='.repeat(80));

  const rawResult = await client.executeBillQueryAll('SFC_OperationReport', {
    fieldKeys: extendedKeys,
    filter: "FDate='2026-05-26'",
    orderString: 'F_FD_Machine ASC',
  });

  const records = parseRecords(rawResult);
  const wsMap = await resolveWorkshops(records);
  console.log(`\n5月26日共 ${records.length} 条记录\n`);

  // 按 设备+车间 分组汇总
  const eqWsMap = new Map();
  const operDescpSet = new Set();
  for (const r of records) {
    const wsName = wsMap[r['FWorkShopID']] || r['FWorkShopID'];
    const eqName = r['F_FD_Machine'] || '(空)';
    const key = `${eqName}|${wsName}`;
    if (!eqWsMap.has(key)) eqWsMap.set(key, { eq: eqName, ws: wsName, quaQty: 0, count: 0 });
    const item = eqWsMap.get(key);
    item.quaQty += parseFloat(r['FQuaQty']) || 0;
    item.count++;
    operDescpSet.add(r['F_FD_OperDescp'] || '(空)');
  }

  console.log('工序说明(F_FD_OperDescp)值分布:');
  console.log([...operDescpSet].join(', '));
  console.log('');

  // 按设备名分组
  const eqTotals = new Map();
  for (const [, item] of eqWsMap) {
    if (!eqTotals.has(item.eq)) eqTotals.set(item.eq, { total: 0, workshops: [] });
    const t = eqTotals.get(item.eq);
    t.total += item.quaQty;
    t.workshops.push({ ws: item.ws, qty: item.quaQty, count: item.count });
  }

  // 按产量排序输出
  const sorted = [...eqTotals.entries()].sort((a, b) => b[1].total - a[1].total);
  for (const [eq, data] of sorted) {
    const wsStr = data.workshops.map(w => `${w.ws}=${Math.round(w.qty)}`).join(', ');
    const isKnown = EQUIPMENT_NAMES.has(eq);
    console.log(`  ${eq}${isKnown ? '' : ' ⚠️ 未在配置中'} → ${wsStr} [合计: ${Math.round(data.total)}]`);
  }

  // === Part 2: 设备-车间分布全量统计 ===
  console.log('\n' + '='.repeat(80));
  console.log('PART 2: 全量数据 - 设备在各车间的分布');
  console.log('='.repeat(80));

  const allResult = await client.executeBillQueryAll('SFC_OperationReport', {
    fieldKeys: extendedKeys,
    filter: "FDate>='2026-01-01'",
    orderString: 'FDate ASC',
  });

  const allRecords = parseRecords(allResult);
  const allWsMap = await resolveWorkshops(allRecords);

  const distMap = new Map(); // eq → Map(ws → records)
  for (const r of allRecords) {
    const wsName = allWsMap[r['FWorkShopID']] || r['FWorkShopID'];
    const eqName = r['F_FD_Machine'] || '(空)';
    if (!distMap.has(eqName)) distMap.set(eqName, new Map());
    const wsCount = distMap.get(eqName);
    wsCount.set(wsName, (wsCount.get(wsName) || 0) + 1);
  }

  const sortedEq = [...distMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  for (const [eq, wsCount] of sortedEq) {
    const total = [...wsCount.values()].reduce((s, v) => s + v, 0);
    const wsBreakdown = [...wsCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([ws, c]) => `${ws}:${c}条`)
      .join(', ');
    const isKnown = EQUIPMENT_NAMES.has(eq);
    const topWs = [...wsCount.entries()].sort((a, b) => b[1] - a[1])[0][0];
    console.log(`  ${eq}${isKnown ? '' : ' ⚠️'}`);
    console.log(`    主车间: ${topWs} | 总记录: ${total}条`);
    console.log(`    分布: ${wsBreakdown}`);
  }

  console.log('\n完成');
}

main().catch(e => console.error('Error:', e.message));
