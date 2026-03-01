/**
  * vue-cal v5.0.1-rc.34
  * (c) 2024-2026 Antoni Andre <antoniandre.web@gmail.com>
  * @license MIT
  */
const weekDays = ["Hétfo", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat", "Vasárnap"];
const months = ["Január", "Február", "Március", "Április", "Május", "Június", "Július", "Augusztus", "Szeptember", "Október", "November", "December"];
const years = "Évek";
const year = "Év";
const month = "Hónap";
const week = "Hét";
const days = "Napok";
const day = "Nap";
const today = "Mai nap";
const noEvent = "Nincs esemény";
const allDay = "Egész nap";
const deleteEvent = "Esemény törlese";
const createEvent = "Esemény létrehozása";
const dateFormat = "dddd D MMMM YYYY";
const hu = {
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
  hu as default,
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
