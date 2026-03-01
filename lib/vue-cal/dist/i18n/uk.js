/**
  * vue-cal v5.0.1-rc.34
  * (c) 2024-2026 Antoni Andre <antoniandre.web@gmail.com>
  * @license MIT
  */
const weekDays = ["Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця", "Субота", "Неділя"];
const weekDaysShort = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];
const months = ["Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень", "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень"];
const years = "Роки";
const year = "Рік";
const month = "Місяць";
const week = "Тиждень";
const days = "Дні";
const day = "День";
const today = "Сьогодні";
const noEvent = "Немає подій";
const allDay = "Весь день";
const deleteEvent = "Видалити";
const createEvent = "Створити подію";
const dateFormat = "dddd D MMMM YYYY";
const uk = {
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
  uk as default,
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
