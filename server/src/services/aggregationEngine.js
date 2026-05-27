/**
 * 核心聚合引擎
 *
 * 从金蝶 SFC_OperationReport 拉取数据，按维度（日/周/月）聚合计算：
 *   - 车间负载率（日/周/月）
 *   - 设备负载率（日/周/月）
 *   - 车间产出率
 *   - 设备产出率
 *
 * 缓存策略：5 分钟内存缓存，key = dimension
 */
const config = require('../config');
const { isWorkingDay, countWorkingDays, countWorkingDaysInMonth } = require('../config/holiday');
const { WORKSHOPS, EQUIPMENT_TYPES, EQUIPMENT_LIST, getEquipmentByName } = require('../config/workshopMasterData');

/** 已知车间名称集合（快速过滤用） */
const WORKSHOP_SET = new Set(WORKSHOPS);
/** 已知设备名称集合（快速过滤用） */
const EQUIPMENT_NAMES = new Set(EQUIPMENT_LIST.map(e => e.name));

// ====== 常量 ======

/** 每日额定负荷工时（两班制合计） */
const DAILY_MAX_HOURS = 22.5;

/** SFC_OperationReport 查询字段列表（顺序必须与 API 返回列一一对应） */
const FIELD_KEYS = [
  'FDate',               // 0
  'F_YJY_NewRealShop',   // 1
  'F_FD_Machine',        // 2
  'FQuaQty',             // 3
  'FReworkQty',          // 4
  'FWastageQty',         // 5
  'F_YJY_loadTimes',     // 6
  'F_FD_EXCEPTTimes',    // 7
  'F_FD_IMPORTTIMES',    // 8
  'F_UNW_WorkType2',     // 9
  'F_FD_Speeds',         // 10
  'F_YJY_equipSpeed',    // 11
  'F_FD_OEE',            // 12
  'F_YJY_OEE',           // 13
  'F_FD_AimPerProduct',  // 14
  'F_FD_RealPerProduct', // 15
  'FMaterialId',         // 16
  'FMaterialName',       // 17
  'FSpecification',      // 18
  'FMoNumber',           // 19
  'F_FD_OkRates',        // 20
  'F_FD_OperDescp',      // 21
];

/** 内联解析的点符号字段（在 FIELD_KEYS 之后追加） */
const DOT_FIELD = 'F_FD_Machine.FName';

/** 需要 parseFloat 的数值字段 */
const NUMERIC_FIELDS = new Set([
  'FQuaQty', 'FReworkQty', 'FWastageQty',
  'F_YJY_loadTimes', 'F_FD_EXCEPTTimes', 'F_FD_IMPORTTIMES',
  'F_FD_Speeds', 'F_YJY_equipSpeed', 'F_FD_OEE', 'F_YJY_OEE',
  'F_FD_AimPerProduct', 'F_FD_RealPerProduct', 'F_FD_OkRates',
]);

/** 班次映射 */
const SHIFT_MAP = {
  '10': '白班',
  '20': '晚班',
};

// ====== 工具函数 ======

/**
 * ISO 周数计算
 */
function getISOWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * 获取时段标识
 * @param {string|Date} dateStr - 'YYYY-MM-DD' 或 Date
 * @param {string} dimension - 'day' | 'week' | 'month' | 'year'
 * @returns {string} 时段 key
 */
function getPeriodKey(dateStr, dimension) {
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  switch (dimension) {
    case 'day':
      return dateStr;
    case 'week': {
      const w = getISOWeekNumber(d);
      return `${d.getFullYear()}-W${String(w).padStart(2, '0')}`;
    }
    case 'month':
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    case 'year':
      return `${d.getFullYear()}`;
    default:
      return dateStr;
  }
}

/**
 * 获取 ISO 周的所有日期
 */
function getWeekDates(year, week) {
  // 1月4日永远在第1周
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7; // 1=Mon, 7=Sun
  const week1Monday = new Date(jan4);
  week1Monday.setDate(jan4.getDate() - dayOfWeek + 1);

  const monday = new Date(week1Monday);
  monday.setDate(week1Monday.getDate() + (week - 1) * 7);

  const dates = [];
  const fmtLocal = (dt) => {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(fmtLocal(d));
  }
  return dates;
}

/**
 * 获取某月的所有日期
 */
function getMonthDates(year, month) {
  const lastDay = new Date(year, month, 0).getDate();
  const dates = [];
  for (let d = 1; d <= lastDay; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    dates.push(dateStr);
  }
  return dates;
}

/**
 * 计算某周的工作日天数
 */
function countWorkingDaysInWeek(year, week) {
  const dates = getWeekDates(year, week);
  return dates.filter((d) => isWorkingDay(d)).length;
}

/**
 * 解析 periodKey，提取 year 和 week/month
 * periodKey 格式: '2026-W03', '2026-01'
 */
function parsePeriodKey(periodKey) {
  if (periodKey.includes('-W')) {
    const [yearStr, weekStr] = periodKey.split('-W');
    return { year: parseInt(yearStr, 10), week: parseInt(weekStr, 10) };
  }
  const [yearStr, monthStr] = periodKey.split('-');
  return { year: parseInt(yearStr, 10), month: parseInt(monthStr, 10) };
}

// ====== 聚合引擎类 ======

class AggregationEngine {
  constructor(client) {
    this.client = client;
    /** @type {Map<string, { data: object, timestamp: number }>} */
    this._cache = new Map();
    this.CACHE_TTL_MS = (config.cache.ttl || 300) * 1000;
  }

  // ===================== 公共 API =====================

  /**
   * 主入口：获取原始记录并聚合（带缓存）
   * @param {string} dimension - 'day' | 'week' | 'month'
   * @returns {Promise<object>}
   */
  async fetchAndAggregate(dimension = 'day') {
    const cached = this._cache.get(dimension);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      console.log(`[agg] 缓存命中 dimension=${dimension}`);
      return cached.data;
    }

    console.log(`[agg] 开始获取数据 dimension=${dimension}`);

    // 1. 获取原始记录
    let records = await this._fetchRecords();

    // 2. 解析车间名称（BD_DEPARTMENT）
    await this._resolveWorkshopNames(records);

    // 3. 聚合计算
    const aggregated = this._aggregate(records, dimension);

    // 4. 缓存
    this._cache.set(dimension, { data: aggregated, timestamp: Date.now() });
    console.log(`[agg] 聚合完成 dimension=${dimension} records=${records.length}`);

    return aggregated;
  }

  /**
   * 获取工厂总览
   */
  async getOverview(dimension = 'day') {
    return this._extractOverview(await this.fetchAndAggregate(dimension));
  }

  /**
   * 获取所有车间聚合数据
   */
  async getWorkshops(dimension = 'day') {
    return this._extractWorkshops(await this.fetchAndAggregate(dimension));
  }

  /**
   * 获取指定车间详情
   * @param {string} workshopName
   */
  async getWorkshopDetail(workshopName, dimension = 'day') {
    return this._extractWorkshopDetail(await this.fetchAndAggregate(dimension), workshopName);
  }

  /**
   * 获取指定设备详情
   * @param {string} equipmentName
   */
  async getEquipmentDetail(equipmentName, dimension = 'day') {
    return this._extractEquipmentDetail(await this.fetchAndAggregate(dimension), equipmentName);
  }

  /**
   * 获取设备类型列表
   */
  getEquipmentTypes() {
    return EQUIPMENT_TYPES.map((type) => ({
      type,
      equipment: EQUIPMENT_LIST.filter((e) => e.type === type).map((e) => e.name),
    }));
  }

  // ===================== 数据获取与解析 =====================

  /**
   * 从金蝶拉取 SFC_OperationReport 全量数据并解析为内部格式
   */
  async _fetchRecords() {
    if (!this.client || !this.client.isConfigured()) {
      console.warn('[agg] 金蝶客户端未配置，返回空数据');
      return [];
    }

    const extendedKeys = [...FIELD_KEYS, DOT_FIELD];

    const rawResult = await this.client.executeBillQueryAll('SFC_OperationReport', {
      fieldKeys: extendedKeys,
      filter: "FDOCUMENTSTATUS = 'C'",
      orderString: 'FDate ASC',
    });

    if (!Array.isArray(rawResult) || rawResult.length === 0) {
      console.warn('[agg] 金蝶返回空数据');
      return [];
    }

    // 转换 2D 数组为记录数组
    let records = this._transformSfcRecords(rawResult, FIELD_KEYS);

    // 内联解析 F_FD_Machine（必须在 reverse 之前！）
    this._applyMachineInline(rawResult, records);

    // 班次映射与数值解析
    this._normalizeRecords(records);

    // 去重：基于全部字段指纹（金蝶分页可能返回重复行）
    const beforeDedup = records.length;
    const seen = new Set();
    records = records.filter(r => {
      const fingerprint = JSON.stringify(r.fields);
      if (seen.has(fingerprint)) return false;
      seen.add(fingerprint);
      return true;
    });
    if (beforeDedup - records.length > 0) {
      console.log(`[agg] 去重: ${beforeDedup} → ${records.length} (移除 ${beforeDedup - records.length})`);
    }

    // 过滤工序说明：仅保留固体灌装和液体灌装
    const beforeFilter = records.length;
    const filtered = records.filter(r => {
      const operDescp = r.fields['F_FD_OperDescp'];
      return operDescp === '固体灌装' || operDescp === '液体灌装';
    });
    console.log(`[agg] 工序过滤: ${beforeFilter} → ${filtered.length}`);

    console.log(`[agg] 有效记录数: ${filtered.length}`);
    return filtered;
  }

  /**
   * 将金蝶 ExecuteBillQueryAll 返回的 2D 数组转为内部记录格式
   *
   * @param {Array[]} rawResult
   * @param {string[]} fieldKeys
   * @returns {Array<{ date: string, fields: object }>}
   */
  _transformSfcRecords(rawResult, fieldKeys) {
    if (rawResult.length === 0) return [];

    const firstRow = rawResult[0];
    let dataStart = 0;
    if (Array.isArray(firstRow)) {
      const hasHeader = firstRow.some((h) => typeof h === 'string' && /^F[A-Z]/.test(h));
      if (hasHeader) dataStart = 1;
    }

    return rawResult.slice(dataStart).map((row, i) => {
      const fields = {};
      fieldKeys.forEach((key, j) => {
        const value = row[j];
        if (value !== undefined && value !== null && value !== '') {
          fields[key] = String(value);
        }
      });
      return {
        date: fields['FDate'] || '',
        shift: '',
        workshop: fields['F_YJY_NewRealShop'] || '',
        machine: fields['F_FD_Machine'] || '',
        // 保留原始 fields 用于解析
        fields,
      };
    });
  }

  /**
   * 内联解析 F_FD_Machine（F_FD_Machine.FName）
   * 必须在 _transformSfcRecords 之后立即执行，且不得 reverse records
   */
  _applyMachineInline(rawResult, records) {
    if (rawResult.length === 0 || records.length === 0) return;

    let dataStart = 0;
    if (rawResult.length > 0 && Array.isArray(rawResult[0])) {
      const hasHeader = rawResult[0].some((h) => typeof h === 'string' && /^F[A-Z]/.test(h));
      if (hasHeader) dataStart = 1;
    }

    const dotColumnIndex = FIELD_KEYS.length; // 内联列在 extendedKeys 中的位置

    for (let i = 0; i < records.length; i++) {
      const row = rawResult[i + dataStart];
      if (!row) continue;
      const machineName = row[dotColumnIndex];
      if (machineName !== undefined && machineName !== null && machineName !== '' && machineName !== '0') {
        records[i].machine = String(machineName);
        records[i].fields['F_FD_Machine'] = String(machineName);
      }
    }
  }

  /**
   * 解析 BD_DEPARTMENT 表，将 F_YJY_NewRealShop 内码替换为车间名称
   */
  async _resolveWorkshopNames(records) {
    if (records.length === 0) return;

    const ids = [...new Set(records.map((r) => r.fields['F_YJY_NewRealShop']).filter((v) => v && v !== '0'))];
    if (ids.length === 0) return;

    console.log(`[agg] 解析车间名称: unique=${ids.length}`);

    const nameMap = new Map();
    const BATCH = 200;

    for (let i = 0; i < ids.length; i += BATCH) {
      const batch = ids.slice(i, i + BATCH);
      const filter = `FDeptId in (${batch.join(',')})`;

      try {
        const { data } = await this.client.callWithAuth(() =>
          this.client.executeBillQuery('BD_DEPARTMENT', {
            limit: batch.length,
            offset: 0,
            fieldKeys: ['FDeptId', 'FName'],
            filter,
            orderString: '',
            skipDateFilter: true,
          }),
        );

        let rows = data;
        if (rows && typeof rows === 'object' && !Array.isArray(rows) && Array.isArray(rows.Result)) {
          rows = rows.Result;
        }

        if (Array.isArray(rows)) {
          for (const row of rows) {
            if (Array.isArray(row) && row.length >= 2) {
              const id = String(row[0]);
              const name = String(row[1]);
              if (id && name && name !== 'undefined') {
                nameMap.set(id, name);
              }
            }
          }
        }
      } catch (e) {
        console.warn(`[agg] BD_DEPARTMENT 查询失败 batch=${i}: ${e.message}`);
      }
    }

    let replaced = 0;
    for (const r of records) {
      const id = r.fields['F_YJY_NewRealShop'];
      const name = nameMap.get(id);
      if (name) {
        r.workshop = name;
        r.fields['F_YJY_NewRealShop'] = name;
        replaced++;
      }
    }

    console.log(`[agg] 车间名称解析完成 resolved=${replaced}/${records.length}`);
  }

  /**
   * 标准化记录：班次映射、数值字段解析
   */
  _normalizeRecords(records) {
    for (const r of records) {
      // 日期标准化："2026-01-02T00:00:00" → "2026-01-02"
      if (r.date && r.date.length > 10) {
        r.date = r.date.slice(0, 10);
      }

      // 班次映射
      const rawShift = r.fields['F_UNW_WorkType2'];
      r.shift = SHIFT_MAP[rawShift] || '';

      // 数值字段 parseFloat
      for (const fieldName of NUMERIC_FIELDS) {
        const val = r.fields[fieldName];
        if (val !== undefined && val !== null && val !== '') {
          const num = parseFloat(val);
          r.fields[fieldName] = isNaN(num) ? 0 : num;
        } else {
          r.fields[fieldName] = 0;
        }
      }
    }
  }

  // ===================== 核心聚合 =====================

  /**
   * 按维度聚合全部记录
   * @param {Array} records - 标准化后的记录
   * @param {string} dimension
   * @returns {object} 聚合结果
   */
  _aggregate(records, dimension) {
    if (records.length === 0) {
      return this._emptyResult(dimension);
    }

    // 按 (workshop, date) 分组计算每日车间级指标
    const dailyWorkshopMap = this._computeDailyWorkshopMetrics(records);
    // 按 (machine, date) 分组计算每日设备级指标
    const dailyEquipmentMap = this._computeDailyEquipmentMetrics(records);

    // 按时段聚合
    const workshopPeriods = this._aggregateToPeriods(dailyWorkshopMap, dimension, 'workshop');
    const equipmentPeriods = this._aggregateToPeriods(dailyEquipmentMap, dimension, 'equipment');

    // 年维度下额外按月聚合，供趋势图展示月度数据
    let monthlyWorkshopData, monthlyEquipmentData;
    if (dimension === 'year') {
      monthlyWorkshopData = this._aggregateToPeriods(dailyWorkshopMap, 'month', 'workshop');
      monthlyEquipmentData = this._aggregateToPeriods(dailyEquipmentMap, 'month', 'equipment');
    }

    // 汇总全厂
    // 提取API响应并转换比率值为百分比（0-1 → 0-100）
    const summary = this._computeSummary(workshopPeriods, equipmentPeriods, dimension);

    return {
      dimension,
      workshopPeriods,
      equipmentPeriods,
      monthlyWorkshopData,
      monthlyEquipmentData,
      summary,
    };
  }

  /**
   * 计算每日车间级指标
   *
   * 车间负载率(日) = (max_白班负荷工时 + max_晚班负荷工时) / 22.5
   * 产出率(日) = Σ FQuaQty / Σ (F_FD_AimPerProduct × F_YJY_loadTimes)
   *
   * @param {Array} records
   * @returns {Map<string, object>} key = `${workshop}|${date}`
   */
  _computeDailyWorkshopMetrics(records) {
    // 先按 (workshop, date, shift) 收集 loadTimes
    const shiftBuckets = new Map(); // key = `${ws}|${date}|${shift}` => loadTimes array
    const outputBuckets = new Map(); // key = `${ws}|${date}` => { quaQty, aimProd }

    for (const r of records) {
      if (!r.workshop || !r.date || !WORKSHOP_SET.has(r.workshop)) continue;

      // 负载率：按班次收集（同班次取最大）
      if (r.shift) {
        const shiftKey = `${r.workshop}|${r.date}|${r.shift}`;
        if (!shiftBuckets.has(shiftKey)) shiftBuckets.set(shiftKey, []);
        const load = r.fields['F_YJY_loadTimes'] || 0;
        shiftBuckets.get(shiftKey).push(typeof load === 'number' ? load : 0);
      }

      // 实际产量：始终累加，不依赖目标产出
      const quaQty = typeof r.fields['FQuaQty'] === 'number' ? r.fields['FQuaQty'] : 0;
      const aim = typeof r.fields['F_FD_AimPerProduct'] === 'number' ? r.fields['F_FD_AimPerProduct'] : 0;
      const load = typeof r.fields['F_YJY_loadTimes'] === 'number' ? r.fields['F_YJY_loadTimes'] : 0;
      if (quaQty > 0) {
        const outKey = `${r.workshop}|${r.date}`;
        if (!outputBuckets.has(outKey)) outputBuckets.set(outKey, { quaQty: 0, aimProd: 0 });
        const ob = outputBuckets.get(outKey);
        ob.quaQty += quaQty;
        if (aim > 0 && load > 0) {
          ob.aimProd += aim * load;
        }
      }
    }

    // 汇总为每日车间指标
    const dailyMap = new Map();
    const allKeys = new Set();
    for (const key of shiftBuckets.keys()) {
      allKeys.add(key.split('|').slice(0, 2).join('|'));
    }
    for (const key of outputBuckets.keys()) {
      allKeys.add(key);
    }

    for (const key of allKeys) {
      const [workshop, date] = key.split('|');
      if (!workshop || !date) continue;

      const dayShiftKey = `${workshop}|${date}|白班`;
      const nightShiftKey = `${workshop}|${date}|晚班`;

      const dayLoads = shiftBuckets.get(dayShiftKey) || [0];
      const nightLoads = shiftBuckets.get(nightShiftKey) || [0];
      const dayShiftMaxLoad = Math.max(...dayLoads);
      const nightShiftMaxLoad = Math.max(...nightLoads);
      const dailyActualHours = dayShiftMaxLoad + nightShiftMaxLoad;
      const dailyLoadRate = Math.min(dailyActualHours / DAILY_MAX_HOURS, 1);

      const ob = outputBuckets.get(key) || { quaQty: 0, aimProd: 0 };
      const outputRate = ob.aimProd > 0 ? Math.min(ob.quaQty / ob.aimProd, 1) : 0;

      dailyMap.set(key, {
        workshop,
        date,
        dayShiftMaxLoad,
        nightShiftMaxLoad,
        dailyActualHours,
        dailyLoadRate,
        quaQty: ob.quaQty,
        aimProd: ob.aimProd,
        outputRate,
      });
    }

    return dailyMap;
  }

  /**
   * 计算每日设备级指标
   *
   * 设备负载率(日) = (白班负荷工时 + 晚班负荷工时) / 22.5
   * 产出率(日) = Σ FQuaQty / Σ (F_FD_AimPerProduct × F_YJY_loadTimes)
   *
   * @param {Array} records
   * @returns {Map<string, object>} key = `${machine}|${date}`
   */
  _computeDailyEquipmentMetrics(records) {
    const shiftBuckets = new Map(); // key = `${m}|${date}|${shift}` => loadTimes array
    const outputBuckets = new Map(); // key = `${m}|${date}` => { quaQty, aimProd, workshop }

    for (const r of records) {
      if (!r.machine || !r.date || !WORKSHOP_SET.has(r.workshop) || !EQUIPMENT_NAMES.has(r.machine)) continue;

      if (r.shift) {
        const shiftKey = `${r.machine}|${r.workshop}|${r.date}|${r.shift}`;
        if (!shiftBuckets.has(shiftKey)) shiftBuckets.set(shiftKey, []);
        const load = r.fields['F_YJY_loadTimes'] || 0;
        shiftBuckets.get(shiftKey).push(typeof load === 'number' ? load : 0);
      }

      // 实际产量：始终累加，不依赖目标产出
      const quaQty = typeof r.fields['FQuaQty'] === 'number' ? r.fields['FQuaQty'] : 0;
      const aim = typeof r.fields['F_FD_AimPerProduct'] === 'number' ? r.fields['F_FD_AimPerProduct'] : 0;
      const load = typeof r.fields['F_YJY_loadTimes'] === 'number' ? r.fields['F_YJY_loadTimes'] : 0;
      const oee = typeof r.fields['F_YJY_OEE'] === 'number' ? r.fields['F_YJY_OEE'] : 0;
      if (quaQty > 0) {
        const outKey = `${r.machine}|${r.workshop}|${r.date}`;
        if (!outputBuckets.has(outKey)) outputBuckets.set(outKey, { quaQty: 0, aimProd: 0, workshop: r.workshop, oeeWeightedSum: 0, oeeWeightDenom: 0 });
        const ob = outputBuckets.get(outKey);
        ob.quaQty += quaQty;
        if (aim > 0 && load > 0) {
          ob.aimProd += aim * load;
        }
        if (oee > 0 && quaQty > 0) {
          ob.oeeWeightedSum += oee * quaQty;
          ob.oeeWeightDenom += quaQty;
        }
        if (r.workshop) ob.workshop = r.workshop;
      }
    }

    const dailyMap = new Map();
    const allKeys = new Set();
    for (const key of shiftBuckets.keys()) {
      const parts = key.split('|');
      allKeys.add(parts.slice(0, 3).join('|'));
    }
    for (const key of outputBuckets.keys()) {
      allKeys.add(key);
    }

    for (const key of allKeys) {
      const parts = key.split('|');
      const machine = parts[0];
      const workshop = parts[1];
      const date = parts[2];
      if (!machine || !date) continue;

      const dayShiftKey = `${machine}|${workshop}|${date}|白班`;
      const nightShiftKey = `${machine}|${workshop}|${date}|晚班`;

      const dayLoads = shiftBuckets.get(dayShiftKey) || [0];
      const nightLoads = shiftBuckets.get(nightShiftKey) || [0];
      const dayShiftLoad = Math.max(...dayLoads);
      const nightShiftLoad = Math.max(...nightLoads);
      const dailyActualHours = dayShiftLoad + nightShiftLoad;
      const dailyLoadRate = Math.min(dailyActualHours / DAILY_MAX_HOURS, 1);

      const ob = outputBuckets.get(key) || { quaQty: 0, aimProd: 0, workshop: '' };
      const outputRate = ob.aimProd > 0 ? Math.min(ob.quaQty / ob.aimProd, 1) : 0;

      dailyMap.set(key, {
        machine,
        date,
        workshop: ob.workshop,
        dayShiftLoad,
        nightShiftLoad,
        dailyActualHours,
        dailyLoadRate,
        quaQty: ob.quaQty,
        aimProd: ob.aimProd,
        outputRate,
        oee: ob.oeeWeightDenom > 0 ? ob.oeeWeightedSum / ob.oeeWeightDenom : 0,
      });
    }

    return dailyMap;
  }

  /**
   * 将每日指标按时段（周/月）聚合
   *
   * 车间负载率(周/月) = Σ(每日实际工时) / (工作日天数 × 22.5h)
   * 分母剔除周日和节假日。
   *
   * @param {Map<string, object>} dailyMap
   * @param {string} dimension
   * @param {string} type - 'workshop' | 'equipment'
   * @returns {Map<string, object>} key = groupKey|periodKey
   */
  _aggregateToPeriods(dailyMap, dimension, type) {
    if (dimension === 'day') return dailyMap;

    // 按 (group, periodKey) 分组，group 是 workshop/machine 名称
    const periodBuckets = new Map();

    for (const daily of dailyMap.values()) {
      // 根据聚合类型选择分组键：设备聚合按设备名分组，车间聚合按车间名分组
      const groupKey = type === 'equipment' ? (daily.machine || daily.workshop) : (daily.workshop || daily.machine);
      if (!groupKey) continue;

      const periodKey = getPeriodKey(daily.date, dimension);
      // 设备聚合保留车间分列，车间聚合按车间合并
      const bucketKey = type === 'equipment'
        ? `${groupKey}|${daily.workshop || ''}|${periodKey}`
        : `${groupKey}|${periodKey}`;

      if (!periodBuckets.has(bucketKey)) {
        const base = {
          groupKey,
          periodKey,
          dailyHours: [],
          totalQuaQty: 0,
          totalAimProd: 0,
          oeeWeightedSum: 0,
          oeeWeightDenom: 0,
          days: [],
        };
        // 添加标识字段：车间聚合存 workshop，设备聚合存 machine + workshop
        if (type === 'workshop') {
          base.workshop = groupKey;
        } else {
          base.machine = groupKey;
          base.workshop = daily.workshop || '';
        }
        periodBuckets.set(bucketKey, base);
      }

      const bucket = periodBuckets.get(bucketKey);
      bucket.dailyHours.push(daily.dailyActualHours);
      bucket.totalQuaQty += daily.quaQty;
      bucket.totalAimProd += daily.aimProd;
      const dQuaQty = daily.quaQty || 0;
      if ((daily.oee || 0) > 0 && dQuaQty > 0) {
        bucket.oeeWeightedSum += (daily.oee || 0) * dQuaQty;
        bucket.oeeWeightDenom += dQuaQty;
      }
      // 设备维度：更新到最近日期的所属车间
      if (type === 'equipment' && daily.workshop) {
        bucket.workshop = daily.workshop;
      }
      bucket.days.push({
        date: daily.date,
        loadRate: daily.dailyLoadRate,
        quaQty: daily.quaQty,
      });
    }

    // 计算最终指标
    const resultMap = new Map();
    const _fmtLocal = (dt) => {
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const d = String(dt.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };
    const _todayStr = _fmtLocal(new Date());
    const _currentPeriodKey = dimension !== 'day' ? getPeriodKey(_todayStr, dimension) : '';
    for (const [bucketKey, bucket] of periodBuckets) {
      const { year, week, month } = parsePeriodKey(bucket.periodKey);
      let workingDays;
      if (dimension === 'week') {
        workingDays = countWorkingDaysInWeek(year, week);
      } else if (dimension === 'year') {
        workingDays = countWorkingDays(`${year}-01-01`, _todayStr);
      } else {
        workingDays = countWorkingDaysInMonth(year, month);
      }
      // 如果是当前月份/周/年，工作日天数封顶到今日（已过去的月份按全月）
      if (_currentPeriodKey && bucket.periodKey === _currentPeriodKey && dimension !== 'year') {
        const startDate = dimension === 'week' ? getWeekDates(year, week)[0] : `${bucket.periodKey}-01`;
        workingDays = countWorkingDays(startDate, _todayStr);
      }

      const sumDailyHours = bucket.dailyHours.reduce((a, b) => a + b, 0);
      const denominator = workingDays * DAILY_MAX_HOURS;
      const loadRate = denominator > 0 ? Math.min(sumDailyHours / denominator, 1) : 0;
      const outputRate = bucket.totalAimProd > 0 ? Math.min(bucket.totalQuaQty / bucket.totalAimProd, 1) : 0;

      resultMap.set(bucketKey, {
        ...bucket,
        sumDailyHours,
        workingDays,
        loadRate,
        outputRate: outputRate,
        totalOutput: bucket.totalQuaQty,
        oee: bucket.oeeWeightDenom > 0 ? bucket.oeeWeightedSum / bucket.oeeWeightDenom : 0,
      });
    }

    return resultMap;
  }

  /**
   * 计算全厂汇总指标
   */
  _computeSummary(workshopPeriods, equipmentPeriods, dimension) {
    const allWorkshops = new Set();
    let totalOutput = 0;
    let totalLoadSum = 0;
    let totalLoadCount = 0;
    let totalOutputRateNumer = 0;
    let totalOutputRateDenom = 0;
    let oeeSum = 0;
    let oeeCount = 0;

    for (const period of workshopPeriods.values()) {
      if (period.workshop) {
        allWorkshops.add(period.workshop);
      }
      totalOutput += (period.totalQuaQty || period.quaQty || 0);
      const loadRate = period.loadRate !== undefined ? period.loadRate : (period.dailyLoadRate || 0);
      totalLoadSum += loadRate;
      totalLoadCount++;
      totalOutputRateNumer += (period.totalQuaQty || period.quaQty || 0);
      totalOutputRateDenom += (period.totalAimProd || period.aimProd || 0);
    }

    // OEE 从设备维度汇总
    for (const period of equipmentPeriods.values()) {
      const oeeVal = period.oee || 0;
      if (oeeVal > 0) {
        oeeSum += oeeVal;
        oeeCount++;
      }
    }

    return {
      totalOutput: Math.round(totalOutput),
      avgLoadRate: totalLoadCount > 0 ? this._pct(totalLoadSum / totalLoadCount) : 0,
      avgOutputRate: totalOutputRateDenom > 0
        ? this._pct(totalOutputRateNumer / totalOutputRateDenom)
        : 0,
      avgOEE: oeeCount > 0 ? +((oeeSum / oeeCount).toFixed(1)) : 0,
      workshopCount: allWorkshops.size,
    };
  }

  /**
   * 将比率值（0-1）转为百分比（0-100），保留1位小数
   */
  _pct(val) {
    return +(val * 100).toFixed(1);
  }

  /**
   * 生成从年初到当前时段的所有period key列表
   * 用于填充趋势图中缺失的时段（无数据的时段显示为0）
   */
  _generateAllPeriodKeys(dimension) {
    const now = new Date();
    const year = now.getFullYear();
    const keys = [];

    if (dimension === 'month') {
      const month = now.getMonth() + 1;
      for (let m = 1; m <= month; m++) {
        keys.push(`${year}-${String(m).padStart(2, '0')}`);
      }
    } else if (dimension === 'week') {
      const week = getISOWeekNumber(now);
      for (let w = 1; w <= week; w++) {
        keys.push(`${year}-W${String(w).padStart(2, '0')}`);
      }
    } else if (dimension === 'year') {
      keys.push(`${year}`);
    } else {
      // day: 从年初到今天（用本地日期，避免 toISOString UTC 转换导致日期偏移）
      const start = new Date(year, 0, 1);
      const end = now;
      const fmtLocal = (dt) => {
        const y = dt.getFullYear();
        const m = String(dt.getMonth() + 1).padStart(2, '0');
        const d = String(dt.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      };
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        keys.push(fmtLocal(d));
      }
    }
    return keys;
  }

  /**
   * 空结果
   */
  _emptyResult(dimension) {
    return {
      dimension,
      workshopPeriods: new Map(),
      equipmentPeriods: new Map(),
      summary: {
        totalOutput: 0,
        avgLoadRate: 0,
        avgOutputRate: 0,
        avgOEE: 0,
        workshopCount: 0,
      },
    };
  }

  // ===================== API 响应提取 =====================

  /**
   * 从聚合数据提取总览（前端展平格式）
   */
  _extractOverview(aggregated) {
    const { workshopPeriods, dimension } = aggregated;

    // 找出最新的时段（用于车间卡片和汇总数据）
    let latestKey = '';
    const periodDateMap = new Map(); // periodKey → 该时段所有车间数据
    for (const [, period] of workshopPeriods) {
      const pk = period.periodKey || period.date;
      if (!pk) continue;
      const name = period.workshop;
      if (!name || !WORKSHOPS.includes(name)) continue;
      if (!periodDateMap.has(pk)) periodDateMap.set(pk, []);
      periodDateMap.get(pk).push(period);
      if (pk > latestKey) latestKey = pk;
    }

    // 车间卡片：所有9个车间始终显示（无数据则显示0）
    const workshops = [];
    const latestPeriods = periodDateMap.get(latestKey) || [];
    const latestWsMap = new Map();
    for (const period of latestPeriods) {
      const name = period.workshop;
      if (!latestWsMap.has(name)) {
        latestWsMap.set(name, { loadSum: 0, outSum: 0, count: 0, totalOut: 0 });
      }
      const ws = latestWsMap.get(name);
      const loadRate = period.loadRate !== undefined ? period.loadRate : (period.dailyLoadRate || 0);
      const outRate = period.outputRate !== undefined ? period.outputRate : 0;
      ws.loadSum += this._pct(loadRate);
      ws.outSum += this._pct(outRate);
      ws.count++;
      ws.totalOut += period.quaQty !== undefined ? period.quaQty : (period.totalQuaQty || 0);
    }
    for (const wsName of WORKSHOPS) {
      const ws = latestWsMap.get(wsName) || { loadSum: 0, outSum: 0, count: 0, totalOut: 0 };
      const avgOutRate = ws.count > 0 ? +(ws.outSum / ws.count).toFixed(1) : 0;
      workshops.push({
        name: wsName,
        outputRate: avgOutRate,
        loadRate: ws.count > 0 ? +(ws.loadSum / ws.count).toFixed(1) : 0,
        totalOutput: Math.round(ws.totalOut),
        status: avgOutRate >= 85 ? 'health' : avgOutRate >= 70 ? 'warning' : 'danger',
      });
    }
    workshops.sort((a, b) => a.name.localeCompare(b.name));

    // 产出趋势：从年初到当前所有时段，无数据的填0
    const trendDim = dimension === 'year' ? 'month' : dimension;
    const trendWsData = dimension === 'year' ? aggregated.monthlyWorkshopData : workshopPeriods;
    const trendEqData = dimension === 'year' ? aggregated.monthlyEquipmentData : aggregated.equipmentPeriods;

    const outputByPeriod = new Map();
    for (const [, period] of trendWsData) {
      const dateKey = period.date || period.periodKey;
      if (!dateKey) continue;
      const name = period.workshop;
      if (!name || !WORKSHOPS.includes(name)) continue;
      const output = period.quaQty !== undefined ? period.quaQty : (period.totalQuaQty || 0);
      outputByPeriod.set(dateKey, (outputByPeriod.get(dateKey) || 0) + output);
    }
    const allPeriodKeys = this._generateAllPeriodKeys(trendDim);
    const outputTrend = allPeriodKeys.map(pk => {
      const label = dimension === 'year'
        ? `${parseInt(pk.slice(5, 7), 10)}月`
        : pk.length === 10 ? `${pk.slice(5, 7)}/${pk.slice(8, 10)}`
          : pk.includes('-W') ? pk.slice(2) : pk;
      return { label, value: Math.round(outputByPeriod.get(pk) || 0) };
    });

    // 平均负载率趋势：各时段所有设备的聚合平均负载率
    const loadRateByPeriod = new Map();
    for (const [, period] of trendEqData) {
      const pk = period.periodKey || period.date;
      if (!pk) continue;
      if (!loadRateByPeriod.has(pk)) {
        loadRateByPeriod.set(pk, { sumActualHours: 0, equipSet: new Set(), workingDays: 0 });
      }
      const bucket = loadRateByPeriod.get(pk);
      const actualHours = period.dailyActualHours !== undefined ? period.dailyActualHours : (period.sumDailyHours || 0);
      bucket.sumActualHours += actualHours;
      const eqName = period.machine || period.groupKey;
      if (eqName) bucket.equipSet.add(eqName);
      if (dimension === 'day' || trendDim === 'month') {
        bucket.workingDays = 1;
      } else if (period.workingDays) {
        bucket.workingDays = period.workingDays;
      }
    }

    const loadRateTrend = allPeriodKeys.map(pk => {
      const bucket = loadRateByPeriod.get(pk);
      let value = 0;
      if (bucket && bucket.equipSet.size > 0 && bucket.workingDays > 0) {
        value = +((bucket.sumActualHours / (bucket.equipSet.size * bucket.workingDays * DAILY_MAX_HOURS)) * 100).toFixed(1);
      }
      const label = dimension === 'year'
        ? `${parseInt(pk.slice(5, 7), 10)}月`
        : pk.length === 10 ? `${pk.slice(5, 7)}/${pk.slice(8, 10)}`
          : pk.includes('-W') ? pk.slice(2) : pk;
      return { label, value };
    });

    // 产出率对比
    const outputRateComparison = workshops.map((w) => ({
      label: w.name.replace('Y固体', '').replace('车间', ''),
      value: w.outputRate,
    }));

    // 汇总指标：从设备维度加权计算（仅最新时段）
    let latestTotalOutput = 0;
    for (const period of latestPeriods) {
      latestTotalOutput += (period.quaQty || period.totalQuaQty || 0);
    }

    // 从设备维度计算加权平均（跨车间合并同一设备）
    let overviewWorkingDays = 0;
    const latestEquipMap = new Map();
    for (const [, period] of aggregated.equipmentPeriods) {
      const pk = period.periodKey || period.date;
      if (pk !== latestKey) continue;
      const eqName = period.machine || period.groupKey;
      if (!eqName) continue;

      if (!latestEquipMap.has(eqName)) {
        latestEquipMap.set(eqName, { actualHours: 0, quaQty: 0, aimProd: 0, oeeWeightedSum: 0, oeeWeightDenom: 0 });
      }
      const eq = latestEquipMap.get(eqName);
      if (!overviewWorkingDays && period.workingDays) overviewWorkingDays = period.workingDays;

      const actualHours = period.dailyActualHours !== undefined ? period.dailyActualHours : (period.sumDailyHours || 0);
      const quaQty = period.quaQty !== undefined ? period.quaQty : (period.totalQuaQty || 0);
      const aimProd = period.aimProd !== undefined ? period.aimProd : (period.totalAimProd || 0);

      eq.actualHours += actualHours;
      eq.quaQty += quaQty;
      eq.aimProd += aimProd;

      const oeeVal = period.oee || 0;
      if (oeeVal > 0 && quaQty > 0) {
        eq.oeeWeightedSum += oeeVal * quaQty;
        eq.oeeWeightDenom += quaQty;
      }
    }

    let sumActualHours = 0;
    let sumQuaQty = 0;
    let sumAimProd = 0;
    let sumOeeWeighted = 0;
    let sumOeeWeight = 0;
    const equipCount = latestEquipMap.size;

    for (const eq of latestEquipMap.values()) {
      sumActualHours += eq.actualHours;
      sumQuaQty += eq.quaQty;
      sumAimProd += eq.aimProd;
      sumOeeWeighted += eq.oeeWeightedSum;
      sumOeeWeight += eq.oeeWeightDenom;
    }

    const avgLoadRate = equipCount > 0
      ? +((sumActualHours / (equipCount * (overviewWorkingDays || 1) * DAILY_MAX_HOURS)) * 100).toFixed(1)
      : 0;
    const avgOutputRate = sumAimProd > 0
      ? +((sumQuaQty / sumAimProd) * 100).toFixed(1)
      : 0;
    const avgOEE = sumOeeWeight > 0
      ? +((sumOeeWeighted / sumOeeWeight)).toFixed(1)
      : 0;

    return {
      dimension,
      totalOutput: Math.round(latestTotalOutput),
      avgLoadRate,
      avgOutputRate,
      avgOEE,
      workshops,
      outputTrend,
      loadRateTrend,
      outputRateComparison,
    };
  }

  /**
   * 提取所有车间列表及聚合数据
   */
  _extractWorkshops(aggregated) {
    return this._groupByWorkshop(aggregated);
  }

  /**
   * 按车间名分组（聚合所有时段）
   */
  _groupByWorkshop(aggregated) {
    const workshopMap = new Map();

    // 初始化为所有9个车间，确保无数据的车间也出现
    for (const wsName of WORKSHOPS) {
      workshopMap.set(wsName, {
        name: wsName,
        periods: [],
        totalOutput: 0,
        avgLoadRate: 0,
        avgOutputRate: 0,
      });
    }

    for (const [, period] of aggregated.workshopPeriods) {
      const wsName = period.workshop;
      if (!wsName || !WORKSHOPS.includes(wsName)) continue;

      if (!workshopMap.has(wsName)) {
        workshopMap.set(wsName, {
          name: wsName,
          periods: [],
          totalOutput: 0,
          avgLoadRate: 0,
          avgOutputRate: 0,
        });
      }

      const ws = workshopMap.get(wsName);
      ws.periods.push({
        periodKey: period.periodKey || period.date,
        loadRate: this._pct(period.loadRate !== undefined ? period.loadRate : (period.dailyLoadRate || 0)),
        outputRate: this._pct(period.outputRate !== undefined ? period.outputRate : 0),
        totalOutput: period.quaQty !== undefined ? Math.round(period.quaQty) : Math.round(period.totalQuaQty || 0),
        actualHours: period.dailyActualHours !== undefined ? +(period.dailyActualHours).toFixed(2) : +(period.sumDailyHours || 0).toFixed(2),
      });

      ws.totalOutput += (period.quaQty || period.totalQuaQty || 0);
    }

    // 计算均值
    for (const ws of workshopMap.values()) {
      if (ws.periods.length > 0) {
        ws.avgLoadRate = +(ws.periods.reduce((s, p) => s + p.loadRate, 0) / ws.periods.length).toFixed(1);
        ws.avgOutputRate = +(ws.periods.reduce((s, p) => s + p.outputRate, 0) / ws.periods.length).toFixed(1);
      }
      ws.totalOutput = Math.round(ws.totalOutput);
      // 按 periodKey 排序
      ws.periods.sort((a, b) => a.periodKey.localeCompare(b.periodKey));
    }

    // 按车间名排序
    return Array.from(workshopMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * 提取指定车间详情（前端展平格式）
   */
  _extractWorkshopDetail(aggregated, workshopName) {
    const wsPeriods = [];

    for (const [, period] of aggregated.workshopPeriods) {
      if (period.workshop !== workshopName) continue;
      const loadRate = this._pct(period.loadRate !== undefined ? period.loadRate : (period.dailyLoadRate || 0));
      const outRate = this._pct(period.outputRate !== undefined ? period.outputRate : 0);
      const output = period.quaQty !== undefined ? period.quaQty : (period.totalQuaQty || 0);
      const aimProd = period.aimProd !== undefined ? period.aimProd : (period.totalAimProd || 0);
      wsPeriods.push({
        periodKey: period.periodKey || period.date,
        loadRate,
        outputRate: outRate,
        totalOutput: Math.round(output),
        aimProd: Math.round(aimProd),
      });
    }
    wsPeriods.sort((a, b) => a.periodKey.localeCompare(b.periodKey));

    // 填充缺失时段（无数据则显示0）
    const wsPeriodMap = new Map(wsPeriods.map(p => [p.periodKey, p]));
    const allPeriodKeys = this._generateAllPeriodKeys(aggregated.dimension);
    const filledPeriods = allPeriodKeys.map(pk => {
      const existing = wsPeriodMap.get(pk);
      return existing || {
        periodKey: pk,
        loadRate: 0,
        outputRate: 0,
        totalOutput: 0,
        aimProd: 0,
      };
    });

    // 取最新时段（包含无数据的时段，显示为 0）
    const latestPeriod = filledPeriods.length > 0 ? filledPeriods[filledPeriods.length - 1] : null;
    const totalOutput = latestPeriod ? latestPeriod.totalOutput : 0;
    const theoreticalOutput = latestPeriod ? latestPeriod.aimProd : 0;
    const avgOutputRate = theoreticalOutput > 0
      ? +((totalOutput / theoreticalOutput) * 100).toFixed(1)
      : 0;
    const avgLoadRate = latestPeriod ? latestPeriod.loadRate : 0;

    // 从设备维度提取该车间最新时段设备列表
    let equipLatestKey = '';
    for (const [, period] of aggregated.equipmentPeriods) {
      const pk = period.periodKey || period.date;
      if (pk > equipLatestKey) equipLatestKey = pk;
    }

    const eqMap = new Map();
    for (const [, period] of aggregated.equipmentPeriods) {
      const pk = period.periodKey || period.date;
      if (pk !== equipLatestKey) continue;
      const eqName = period.machine || period.groupKey;
      if (!eqName) continue;
      if (period.workshop !== workshopName) continue;

      const quaQty = period.quaQty !== undefined ? period.quaQty : (period.totalQuaQty || 0);
      const aimProd = period.aimProd !== undefined ? period.aimProd : (period.totalAimProd || 0);
      const loadRate = period.loadRate !== undefined ? period.loadRate : (period.dailyLoadRate || 0);

      if (!eqMap.has(eqName)) {
        eqMap.set(eqName, { totalOutput: 0, totalAimProd: 0, loadRateSum: 0, loadRateCount: 0 });
      }
      const eq = eqMap.get(eqName);
      eq.totalOutput += quaQty;
      eq.totalAimProd += aimProd;
      eq.loadRateSum += loadRate;
      eq.loadRateCount++;
    }

    const equipmentList = [];
    for (const [name, eq] of eqMap) {
      const eqInfo = getEquipmentByName(name);
      const outRate = eq.totalAimProd > 0
        ? +((eq.totalOutput / eq.totalAimProd) * 100).toFixed(1)
        : 0;
      equipmentList.push({
        name,
        output: Math.round(eq.totalOutput),
        outputRate: outRate,
        loadRate: +(eq.loadRateSum / eq.loadRateCount * 100).toFixed(1),
        type: eqInfo ? eqInfo.type : '未知',
        status: outRate >= 85 ? 'health' : outRate >= 70 ? 'warning' : 'danger',
      });
    }
    equipmentList.sort((a, b) => a.name.localeCompare(b.name));

    // 趋势数组（全量历史，缺失时段填0）
    const trendDim = aggregated.dimension === 'year' ? 'month' : aggregated.dimension;
    const trendPeriodKeys = this._generateAllPeriodKeys(trendDim);
    const trendWsData = aggregated.dimension === 'year' ? aggregated.monthlyWorkshopData : aggregated.workshopPeriods;

    const trendPeriodMap = new Map();
    for (const [, period] of trendWsData) {
      if (period.workshop !== workshopName) continue;
      const pk = period.periodKey || period.date;
      const output = period.quaQty !== undefined ? period.quaQty : (period.totalQuaQty || 0);
      const loadRate = this._pct(period.loadRate !== undefined ? period.loadRate : (period.dailyLoadRate || 0));
      trendPeriodMap.set(pk, { periodKey: pk, totalOutput: Math.round(output), loadRate });
    }
    const trendFilled = trendPeriodKeys.map(pk => {
      const existing = trendPeriodMap.get(pk);
      return existing || { periodKey: pk, totalOutput: 0, loadRate: 0 };
    });

    const trendLabel = (p) => {
      const pk = p.periodKey || '';
      if (aggregated.dimension === 'year') return `${parseInt(pk.slice(5, 7), 10)}月`;
      const d = pk.slice(0, 10);
      return d.length === 10 ? `${d.slice(5, 7)}/${d.slice(8, 10)}`
        : pk.includes('-W') ? pk.slice(2) : pk;
    };
    const outputTrend = trendFilled.map((p) => ({ label: trendLabel(p), value: p.totalOutput }));
    const loadRateTrend = trendFilled.map((p) => ({ label: trendLabel(p), value: p.loadRate }));

    return {
      name: workshopName,
      totalOutput: Math.round(totalOutput),
      theoreticalOutput: Math.round(theoreticalOutput),
      outputRate: avgOutputRate,
      loadRate: avgLoadRate,
      equipmentList,
      outputTrend,
      loadRateTrend,
    };
  }

  /**
   * 提取指定设备详情（前端展平格式）
   */
  _extractEquipmentDetail(aggregated, equipmentName) {
    const periods = [];

    for (const [, period] of aggregated.equipmentPeriods) {
      const eqName = period.machine || period.groupKey;
      if (eqName !== equipmentName) continue;
      const quaQty = period.quaQty !== undefined ? period.quaQty : (period.totalQuaQty || 0);
      const aimProd = period.aimProd !== undefined ? period.aimProd : (period.totalAimProd || 0);
      periods.push({
        periodKey: period.periodKey || period.date,
        workshop: period.workshop || '',
        loadRate: period.loadRate !== undefined ? period.loadRate : (period.dailyLoadRate || 0),
        outputRate: period.outputRate !== undefined ? period.outputRate : 0,
        quaQty,
        aimProd,
        oee: period.oee || 0,
      });
    }
    periods.sort((a, b) => a.periodKey.localeCompare(b.periodKey) || a.workshop.localeCompare(b.workshop));

    // 跨车间合并（同一设备可能在多个车间有记录）
    const mergedMap = new Map();
    for (const p of periods) {
      const key = p.periodKey;
      if (!mergedMap.has(key)) {
        mergedMap.set(key, {
          periodKey: key,
          totalOutput: 0,
          totalAimProd: 0,
          oeeWeightedSum: 0,
          oeeWeightDenom: 0,
          maxLoadRate: 0,
        });
      }
      const m = mergedMap.get(key);
      m.totalOutput += p.quaQty;
      m.totalAimProd += p.aimProd;
      m.maxLoadRate = Math.max(m.maxLoadRate, p.loadRate);
      if ((p.oee || 0) > 0 && (p.quaQty || 0) > 0) {
        m.oeeWeightedSum += p.oee * p.quaQty;
        m.oeeWeightDenom += p.quaQty;
      }
    }

    // 填充缺失时段
    const trendDim = aggregated.dimension === 'year' ? 'month' : aggregated.dimension;
    const trendEqSrc = aggregated.dimension === 'year' ? aggregated.monthlyEquipmentData : aggregated.equipmentPeriods;

    // 从趋势数据源过滤本设备记录
    const trendPeriodsMap = new Map();
    for (const [, period] of trendEqSrc) {
      const eqName = period.machine || period.groupKey;
      if (eqName !== equipmentName) continue;
      const pk = period.periodKey || period.date;
      const quaQty = period.quaQty !== undefined ? period.quaQty : (period.totalQuaQty || 0);
      const aimProd = period.aimProd !== undefined ? period.aimProd : (period.totalAimProd || 0);
      if (!trendPeriodsMap.has(pk)) {
        trendPeriodsMap.set(pk, { totalOutput: 0, totalAimProd: 0, maxLoadRate: 0, oeeWeightedSum: 0, oeeWeightDenom: 0 });
      }
      const m = trendPeriodsMap.get(pk);
      m.totalOutput += quaQty;
      m.totalAimProd += aimProd;
      m.maxLoadRate = Math.max(m.maxLoadRate, period.loadRate !== undefined ? period.loadRate : (period.dailyLoadRate || 0));
      if ((period.oee || 0) > 0 && quaQty > 0) {
        m.oeeWeightedSum += period.oee * quaQty;
        m.oeeWeightDenom += quaQty;
      }
    }

    const trendPeriods = Array.from(trendPeriodsMap.values()).sort((a, b) => a.periodKey.localeCompare(b.periodKey));
    const trendList = trendPeriods.map((m) => ({
      periodKey: m.periodKey,
      loadRate: this._pct(m.maxLoadRate),
      outputRate: m.totalAimProd > 0 ? this._pct(m.totalOutput / m.totalAimProd) : 0,
      totalOutput: Math.round(m.totalOutput),
      oee: m.oeeWeightDenom > 0 ? +(m.oeeWeightedSum / m.oeeWeightDenom).toFixed(1) : 0,
    }));

    const trendMap = new Map(trendList.map(p => [p.periodKey, p]));
    const allPeriodKeys = this._generateAllPeriodKeys(trendDim);
    const filledTrends = allPeriodKeys.map(pk => {
      const existing = trendMap.get(pk);
      return existing || {
        periodKey: pk,
        loadRate: 0,
        outputRate: 0,
        totalOutput: 0,
        oee: 0,
      };
    });

    // 汇总指标：取最新时段（包含无数据的时段，显示为 0）
    const latest = filledTrends.length > 0 ? filledTrends[filledTrends.length - 1] : null;
    const actualOutput = latest ? latest.totalOutput : 0;
    const avgLoadRate = latest ? latest.loadRate : 0;
    const avgOutRate = latest ? latest.outputRate : 0;
    const avgOee = latest ? latest.oee : 0;

    const equipmentInfo = getEquipmentByName(equipmentName);

    const trendLabel = (p) => {
      const pk = p.periodKey || '';
      if (aggregated.dimension === 'year') return `${parseInt(pk.slice(5, 7), 10)}月`;
      const d = pk.slice(0, 10);
      return d.length === 10 ? `${d.slice(5, 7)}/${d.slice(8, 10)}`
        : pk.includes('-W') ? pk.slice(2) : pk;
    };

    return {
      name: equipmentName,
      type: equipmentInfo ? equipmentInfo.type : '未知',
      defaultWorkshop: equipmentInfo ? equipmentInfo.defaultWorkshop : '',
      actualOutput,
      loadRate: avgLoadRate,
      outputRate: avgOutRate,
      oee: avgOee,
      loadRateTrend: filledTrends.map((p) => ({ label: trendLabel(p), value: p.loadRate })),
      outputRateTrend: filledTrends.map((p) => ({ label: trendLabel(p), value: p.outputRate })),
      outputTrend: filledTrends.map((p) => ({ label: trendLabel(p), value: p.totalOutput })),
      oeeTrend: filledTrends.map((p) => ({ label: trendLabel(p), value: p.oee })),
    };
  }

  /**
   * 清除缓存（用于调试/手动刷新）
   */
  clearCache() {
    this._cache.clear();
    console.log('[agg] 缓存已清除');
  }
}

module.exports = AggregationEngine;
