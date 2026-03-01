/**
  * vue-cal v5.0.1-rc.34
  * (c) 2024-2026 Antoni Andre <antoniandre.web@gmail.com>
  * @license MIT
  */
const weekDays = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];
const weekDaysShort = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const months = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
const monthsGenitive = ["Января", "Февраля", "Марта", "Апреля", "Мая", "Июня", "Июля", "Августа", "Сентября", "Октября", "Ноября", "Декабря"];
const years = "Годы";
const year = "Год";
const month = "Месяц";
const week = "Неделя";
const days = "Дни";
const day = "День";
const today = "Сегодня";
const noEvent = "Нет событий";
const allDay = "Весь день";
const deleteEvent = "Удалить";
const createEvent = "Создать событие";
const dateFormat = "dddd D MMMM YYYY";
const ru = {
  weekDays,
  weekDaysShort,
  months,
  monthsGenitive,
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
  ru as default,
  deleteEvent,
  month,
  months,
  monthsGenitive,
  noEvent,
  today,
  week,
  weekDays,
  weekDaysShort,
  year,
  years
};
