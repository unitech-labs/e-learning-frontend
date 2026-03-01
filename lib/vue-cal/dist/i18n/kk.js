/**
  * vue-cal v5.0.1-rc.34
  * (c) 2024-2026 Antoni Andre <antoniandre.web@gmail.com>
  * @license MIT
  */
const weekDays = ["Дүйсенбі", "Сейсенбі", "Сәрсенбі", "Бейсенбі", "Жұма", "Сенбі", "Жексенбі"];
const weekDaysShort = ["Дс", "Сс", "Ср", "Бс", "Жм", "Сб", "Жс"];
const months = ["Қаңтар", "Ақпан", "Наурыз", "Сәуір", "Мамыр", "Маусым", "Шілде", "Тамыз", "Қыркүйек", "Қазан", "Қараша", "Желтоқсан"];
const years = "Жылдар";
const year = "Жыл";
const month = "Ай";
const week = "Апта";
const days = "Күндер";
const day = "Күн";
const today = "Бүгін";
const noEvent = "Іс-шара жоқ";
const allDay = "Күні бойы";
const deleteEvent = "Жою";
const createEvent = "Іс-шара құру";
const dateFormat = "dddd D MMMM YYYY";
const kk = {
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
  dateFormat
};
export {
  allDay,
  createEvent,
  dateFormat,
  day,
  days,
  kk as default,
  deleteEvent,
  month,
  months,
  noEvent,
  today,
  week,
  weekDays,
  weekDaysShort,
  year,
  years
};
