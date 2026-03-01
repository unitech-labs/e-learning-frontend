/**
  * vue-cal v5.0.1-rc.34
  * (c) 2024-2026 Antoni Andre <antoniandre.web@gmail.com>
  * @license MIT
  */
const weekDays = ["Pirmadienis", "Antradienis", "Trečiadienis", "Ketvirtadienis", "Penktadienis", "Šeštadienis", "Sekmadienis"];
const months = ["Sausis", "Vasaris", "Kovas", "Balandis", "Gegužė", "Birželis", "Liepa", "Rugpjūtis", "Rugsėjis", "Spalis", "Lapkritis", "Gruodis"];
const years = "Metų pasirinkimas";
const year = "Metai";
const month = "Mėnesis";
const week = "Savaitė";
const days = "Dienos";
const day = "Diena";
const today = "Šiandien";
const noEvent = "Jokių įvykių";
const allDay = "Visa diena";
const deleteEvent = "Ištrinti";
const createEvent = "Sukurti įvykį";
const dateFormat = "dddd, D MMMM YYYY";
const lt = {
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
  lt as default,
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
