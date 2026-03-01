/**
  * vue-cal v5.0.1-rc.34
  * (c) 2024-2026 Antoni Andre <antoniandre.web@gmail.com>
  * @license MIT
  */
const weekDays = ["الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"];
const weekDaysShort = ["ن", "ث", "ر", "خ", "ج", "س", "ح"];
const months = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", " ديسمبر"];
const years = "سنوات";
const year = "سنة";
const month = "شهر";
const week = "أسبوع";
const days = "أيام";
const day = "يوم";
const today = "اليوم";
const noEvent = "لا حدث";
const allDay = "طوال اليوم";
const deleteEvent = "حذف";
const createEvent = "إنشاء حدث";
const dateFormat = "dddd D MMMM YYYY";
const truncations = false;
const ar = {
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
  ar as default,
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
