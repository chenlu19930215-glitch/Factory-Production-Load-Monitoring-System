/**
 * 工厂车间/设备主数据
 *
 * 车间分配为初始默认值，实际会从金蝶数据动态派生。
 * 设备类型（机型）用于筛选和设备分类。
 */

/** 9 个车间 */
const WORKSHOPS = [
  'Y固体一1号车间',
  'Y固体一2号车间',
  'Y固体一3号车间',
  'Y固体一5号车间',
  'Y固体一6号车间',
  'Y固体一8号车间',
  'Y固体一分包间',
  'Y固体二车间',
  'Y液体二车间',
];

/**
 * 设备类型枚举
 */
const EQUIPMENT_TYPES = ['粉体', '液体'];

/**
 * 设备主数据
 * 初始所属车间为默认值，实际从金蝶数据动态派生车间归属。
 * lanes: 设备列数, designSpeed: 设计速度（切/分钟）
 *
 * 设备名称源自金蝶 SFC_OperationReport 中 F_FD_Machine.FName 的实际值。
 */
const EQUIPMENT_LIST = [
  // === 粉体设备 ===
  { name: '粉体12列机P机台',   type: '粉体', defaultWorkshop: 'Y固体二车间',     lanes: 12, designSpeed: 60 },
  { name: '粉体24.3十列机',    type: '粉体', defaultWorkshop: 'Y固体二车间',     lanes: 10, designSpeed: 40 },
  { name: '粉体45.1八列机',    type: '粉体', defaultWorkshop: '',                lanes: 8,  designSpeed: 35 },
  { name: '粉体A机台',         type: '粉体', defaultWorkshop: 'Y固体一2号车间',  lanes: 1,  designSpeed: 40 },
  { name: '粉体B机台',         type: '粉体', defaultWorkshop: 'Y固体一2号车间',  lanes: 1,  designSpeed: 40 },
  { name: '粉体C机台',         type: '粉体', defaultWorkshop: 'Y固体一1号车间',  lanes: 1,  designSpeed: 40 },
  { name: '粉体D机台',         type: '粉体', defaultWorkshop: 'Y固体一1号车间',  lanes: 1,  designSpeed: 40 },
  { name: '粉体E机台',         type: '粉体', defaultWorkshop: 'Y固体一1号车间',  lanes: 1,  designSpeed: 40 },
  { name: '粉体F机台',         type: '粉体', defaultWorkshop: 'Y固体一分包间',   lanes: 1,  designSpeed: 40 },
  { name: '粉体M机台',         type: '粉体', defaultWorkshop: 'Y固体一1号车间',  lanes: 1,  designSpeed: 40 },
  { name: '30.6粉体十列机',    type: '粉体', defaultWorkshop: '',                lanes: 10, designSpeed: 40 },
  { name: '软袋包装机',        type: '粉体', defaultWorkshop: 'Y固体一8号车间',  lanes: 1,  designSpeed: 12 },

  // === 液体设备 ===
  { name: '液体49.8可变袋宽四列机', type: '液体', defaultWorkshop: 'Y固体一6号车间', lanes: 4, designSpeed: 40 },
  { name: '液体A机台',             type: '液体', defaultWorkshop: 'Y液体二车间',     lanes: 1, designSpeed: 35 },
  { name: '液体B机台',             type: '液体', defaultWorkshop: 'Y液体二车间',     lanes: 1, designSpeed: 35 },
  { name: '液体C机台',             type: '液体', defaultWorkshop: 'Y液体二车间',     lanes: 1, designSpeed: 35 },
  { name: '液体D机台',             type: '液体', defaultWorkshop: 'Y液体二车间',     lanes: 1, designSpeed: 35 },
  { name: '液体E机台',             type: '液体', defaultWorkshop: 'Y液体二车间',     lanes: 1, designSpeed: 35 },
  { name: '液体六列机',            type: '液体', defaultWorkshop: 'Y液体二车间',     lanes: 6, designSpeed: 25 },
  { name: '液体六列机YE-6列',      type: '液体', defaultWorkshop: 'Y固体一5号车间',  lanes: 6, designSpeed: 50 },
  { name: '液体双胞胎双列H',       type: '液体', defaultWorkshop: 'Y液体二车间',     lanes: 2, designSpeed: 45 },
  { name: '液体双胞胎双列机G',     type: '液体', defaultWorkshop: 'Y液体二车间',     lanes: 2, designSpeed: 45 },
  { name: '液体双列机',            type: '液体', defaultWorkshop: 'Y液体二车间',     lanes: 2, designSpeed: 35 },
  { name: '液体双列机A',           type: '液体', defaultWorkshop: 'Y固体一6号车间',  lanes: 2, designSpeed: 35 },
  { name: '液体双列机B',           type: '液体', defaultWorkshop: 'Y液体二车间',     lanes: 2, designSpeed: 35 },
  { name: '液体双列机C',           type: '液体', defaultWorkshop: 'Y固体一6号车间',  lanes: 2, designSpeed: 35 },
];

/** 通过名称查询设备 */
function getEquipmentByName(name) {
  return EQUIPMENT_LIST.find((e) => e.name === name) || null;
}

/** 通过设备类型筛选设备名列表 */
function getEquipmentNamesByType(type) {
  return EQUIPMENT_LIST
    .filter((e) => e.type === type)
    .map((e) => e.name);
}

/** 获取某车间默认设备列表 */
function getDefaultEquipmentByWorkshop(workshop) {
  return EQUIPMENT_LIST
    .filter((e) => e.defaultWorkshop === workshop)
    .map((e) => e.name);
}

module.exports = {
  WORKSHOPS,
  EQUIPMENT_TYPES,
  EQUIPMENT_LIST,
  getEquipmentByName,
  getEquipmentNamesByType,
  getDefaultEquipmentByWorkshop,
};
