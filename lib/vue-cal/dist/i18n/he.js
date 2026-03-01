/**
  * vue-cal v5.0.1-rc.34
  * (c) 2024-2026 Antoni Andre <antoniandre.web@gmail.com>
  * @license MIT
  */
const weekDays = ["שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת", "ראשון"];
const weekDaysShort = ["ב", "ג", "ד", "ה", "ו", "ש", "א"];
const months = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
const years = "שנים";
const year = "שנה";
const month = "חודש";
const week = "שבוע";
const days = "ימים";
const day = "יום";
const today = "היום";
const noEvent = "אין אירועים";
const allDay = "כל היום";
const deleteEvent = "מחיקה";
const createEvent = "צור אירוע";
const dateFormat = "dddd D MMMM YYYY";
const truncations = false;
const he = {
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
  he as default,
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
