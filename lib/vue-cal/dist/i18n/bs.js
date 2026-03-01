/**
  * vue-cal v5.0.1-rc.34
  * (c) 2024-2026 Antoni Andre <antoniandre.web@gmail.com>
  * @license MIT
  */
const weekDays = ["Ponedjeljak", "Utorak", "Srijeda", "Četvrtak", "Petak", "Subota", "Nedjelja"];
const months = ["Januar", "Februar", "Mart", "April", "Maj", "Jun", "Jul", "Avgust", "Septembar", "Oktobar", "Novembar", "Decembar"];
const years = "Godine";
const year = "Godina";
const month = "Mjesec";
const week = "Sedmica";
const days = "Dana";
const day = "Dan";
const today = "Danas";
const noEvent = "Nema događaja";
const allDay = "Cijeli dan";
const deleteEvent = "Obriši";
const createEvent = "Kreiraj događaj";
const dateFormat = "dddd D MMMM YYYY";
const bs = {
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
  bs as default,
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
