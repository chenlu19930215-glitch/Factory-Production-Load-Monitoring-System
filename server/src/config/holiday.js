/**
 * 2026 年节假日配置
 *
 * 用于周/月维度聚合时剔除工作日计算。
 * key: 日期字符串 'YYYY-MM-DD'
 * value: 节日名称（仅用于标记）
 *
 * 来源：国务院办公厅国办发明电〔2025〕7号
 * 注意：周日（dayOfWeek===0）在 isWorkingDay 中自动排除，此处不重复列出。
 */
const HOLIDAYS_2026 = {
  // === 元旦（1月1日至3日，共3天。1月4日周日上班——周日自动排除） ===
  '2026-01-01': '元旦',
  '2026-01-02': '元旦',
  '2026-01-03': '元旦',

  // === 春节（2月15日周日至23日周一，共9天。2月14日/28日周六上班） ===
  '2026-02-16': '春节',
  '2026-02-17': '春节',
  '2026-02-18': '春节',
  '2026-02-19': '春节',
  '2026-02-20': '春节',
  '2026-02-21': '春节',
  '2026-02-23': '春节',

  // === 清明节（4月4日周六至6日周一，共3天） ===
  '2026-04-04': '清明节',
  '2026-04-06': '清明节',

  // === 劳动节（5月1日周五至5日周二，共5天。5月9日周六上班） ===
  '2026-05-01': '劳动节',
  '2026-05-02': '劳动节',
  '2026-05-04': '劳动节',
  '2026-05-05': '劳动节',

  // === 端午节（6月19日周五至21日周日，共3天） ===
  '2026-06-19': '端午节',
  '2026-06-20': '端午节',

  // === 中秋节（9月25日周五至27日周日，共3天） ===
  '2026-09-25': '中秋节',
  '2026-09-26': '中秋节',

  // === 国庆节（10月1日周四至7日周三，共7天。9月20日周日/10月10日周六上班） ===
  '2026-10-01': '国庆节',
  '2026-10-02': '国庆节',
  '2026-10-03': '国庆节',
  '2026-10-05': '国庆节',
  '2026-10-06': '国庆节',
  '2026-10-07': '国庆节',
};

/**
 * 判断某天是否为工作日（非周日且非法定假日）
 * @param {string} dateStr - 'YYYY-MM-DD'
 * @returns {boolean}
 */
function isWorkingDay(dateStr) {
  const date = new Date(dateStr);
  const dayOfWeek = date.getDay();
  // 周日
  if (dayOfWeek === 0) return false;
  // 法定假日
  if (HOLIDAYS_2026[dateStr]) return false;
  return true;
}

/**
 * 获取指定日期范围内的工作日天数
 * @param {string} startDate - 'YYYY-MM-DD'
 * @param {string} endDate - 'YYYY-MM-DD'
 * @returns {number}
 */
function countWorkingDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    if (isWorkingDay(dateStr)) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

/**
 * 获取某个月份的工作日天数
 * @param {number} year
 * @param {number} month - 1-12
 * @returns {number}
 */
function countWorkingDaysInMonth(year, month) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return countWorkingDays(start, end);
}

module.exports = {
  HOLIDAYS_2026,
  isWorkingDay,
  countWorkingDays,
  countWorkingDaysInMonth,
};
