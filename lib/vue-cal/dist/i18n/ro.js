/**
  * vue-cal v5.0.1-rc.34
  * (c) 2024-2026 Antoni Andre <antoniandre.web@gmail.com>
  * @license MIT
  */
const weekDays = ["Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbăta", "Duminică"];
const months = ["Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie", "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"];
const years = "Ani";
const year = "An";
const month = "Lună";
const week = "Săptămână";
const days = "Zile";
const day = "Zi";
const today = "Azi";
const noEvent = "Nici o interacțiune";
const allDay = "Toată ziua";
const deleteEvent = "Șterge";
const createEvent = "Adaugă un eveniment";
const dateFormat = "dddd D MMMM YYYY";
const ro = {
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
  dateFormat
};
export {
  allDay,
  createEvent,
  dateFormat,
  day,
  days,
  ro as default,
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
