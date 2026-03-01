/**
  * vue-cal v5.0.1-rc.34
  * (c) 2024-2026 Antoni Andre <antoniandre.web@gmail.com>
  * @license MIT
  */
const weekDays = ["دوشنبه", "سه شنبه", "چهار شنبه", "پنج شنبه", "جمعه", "شنبه", "یک شنبه"];
const weekDaysShort = ["د", "س", "چ", "پ", "ج", "ش", "ی"];
const months = ["ژانویه", "فوریه", "مارس", "آوریل", "می", "ژوئن", "ژوئیه", "اوت", "سپتامبر", "اکتبر", "نوامبر", "دسامبر"];
const years = "سالها";
const year = "سال";
const month = "ماه";
const week = "هفته";
const days = "روزها";
const day = "روز";
const today = "امروز";
const noEvent = "رویدادی نیست";
const allDay = "تمام روز";
const deleteEvent = "حذف";
const createEvent = "ایجاد یک رویداد";
const dateFormat = "dddd D MMMM YYYY";
const truncations = false;
const fa = {
  weekDays,
  weekDaysShort,
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
  fa as default,
  deleteEvent,
  month,
  months,
  noEvent,
  today,
  truncations,
  week,
  weekDays,
  weekDaysShort,
  year,
  years
};
