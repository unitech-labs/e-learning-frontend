/**
  * vue-cal v5.0.1-rc.34
  * (c) 2024-2026 Antoni Andre <antoniandre.web@gmail.com>
  * @license MIT
  */
const weekDays = ["Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag", "Søndag"];
const months = ["Januar", "Februar", "Mars", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Desember"];
const years = "Velg år";
const year = "År";
const month = "Måned";
const week = "Uke";
const days = "Dager";
const day = "Dag";
const today = "Idag";
const noEvent = "Ingen hendelse";
const allDay = "Hele dagen";
const deleteEvent = "Ta bort";
const createEvent = "Ny hendelse";
const dateFormat = "dddd, D. MMMM YYYY";
const no = {
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
  no as default,
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
