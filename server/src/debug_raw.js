require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const KingdeeClient = require('./services/kingdeeService');
const client = KingdeeClient.fromEnv();

const FIELD = ['FDate','FWorkShopID','F_FD_Machine','FQuaQty','F_FD_AimPerProduct','F_YJY_loadTimes','F_FD_OperDescp','F_UNW_WorkType2','F_FD_Machine.FName'];

(async () => {
  await client.loginByAppSecret();
  const r = await client.executeBillQueryAll('SFC_OperationReport', {
    fieldKeys: FIELD,
    filter: "FDate='2026-05-26'",
    orderString: ''
  });
  let start = 0;
  if (Array.isArray(r[0]) && r[0].some(h => typeof h === 'string' && /^F/.test(h))) start = 1;
  for (let i = start; i < r.length; i++) {
    const row = r[i];
    const mName = row[8] && row[8] !== '0' ? row[8] : (row[2] ? 'ID:'+row[2] : '');
    console.log([
      'date=' + (row[0] || '').slice(0,10),
      'wsId=' + row[1],
      'mName=' + mName,
      'qty=' + row[3],
      'aim=' + row[4],
      'load=' + row[5],
      'oper=' + (row[6] || ''),
      'shift=' + (row[7] || '')
    ].join(' | '));
  }
})().catch(e => console.error(e.message));
