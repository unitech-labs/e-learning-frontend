/**
  * vue-cal v5.0.1-rc.34
  * (c) 2024-2026 Antoni Andre <antoniandre.web@gmail.com>
  * @license MIT
  */
const weekDays = ["月", "火", "水", "木", "金", "土", "日"];
const months = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
const years = "年";
const year = "今年";
const month = "月";
const week = "週";
const days = "日々";
const day = "日";
const today = "今日";
const noEvent = "イベントなし";
const allDay = "終日";
const deleteEvent = "削除";
const createEvent = "イベント作成";
const dateFormat = "YYYY年 MMMM D日 (dddd)";
const truncations = false;
const ja = {
  weekDays,
  months,
  years,
  year,
  month,
  week,
  days,
  day,
  today,
  noEvent,
  allDay,
  deleteEvent,
  createEvent,
  dateFormat,
  truncations
};
export {
  allDay,
  createEvent,
  dateFormat,
  day,
  days,
  ja as default,
  deleteEvent,
  month,
  months,
  noEvent,
  today,
  truncations,
  week,
  weekDays,
  year,
  years
};
