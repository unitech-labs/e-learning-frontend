/**
  * vue-cal v5.0.1-rc.34
  * (c) 2024-2026 Antoni Andre <antoniandre.web@gmail.com>
  * @license MIT
  */
const weekDays = ["Душанба", "Сешанба", "Чоршанба", "Пайшанба", "Жума", "Шанба", "Якшанба"];
const months = ["Январ", "Феврал", "Март", "Апрел", "Май", "Июн", "Июл", "Август", "Сентябр", "Октябр", "Ноябр", "Декабр"];
const years = "Йиллар";
const year = "Йил";
const month = "Ой";
const week = "Ҳафта";
const day = "Кун";
const today = "Бугун";
const noEvent = "Ҳеч қандай тадбир йўқ";
const allDay = "Кун бўйи";
const deleteEvent = "Ўчириш";
const createEvent = "Тадбир яратиш";
const dateFormat = "dddd D MMMM YYYY";
const uzCryl = {
  weekDays,
  months,
  years,
  year,
  month,
  week,
  day,
  today,
  noEvent,
  allDay,
  deleteEvent,
  createEvent,
  dateFormat
};
export {
  allDay,
  createEvent,
  dateFormat,
  day,
  uzCryl as default,
  deleteEvent,
  month,
  months,
  noEvent,
  today,
  week,
  weekDays,
  year,
  years
};
