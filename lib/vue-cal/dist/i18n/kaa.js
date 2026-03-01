/**
  * vue-cal v5.0.1-rc.34
  * (c) 2024-2026 Antoni Andre <antoniandre.web@gmail.com>
  * @license MIT
  */
const weekDays = ["Dúysenbi", "Seysenbi", "Sársenbi", "Beysenbi", "Juma", "Senbi", "Jeksenbi"];
const months = ["Yanwar", "Fevral", "Mart", "Aprel", "May", "Iýn", "Iýl", "Awgust", "Sentýabr", "Októabr", "Nóýabr", "Dekábr"];
const years = "Jıllar";
const year = "Jıl";
const month = "Ay";
const week = "Ha'pte";
const day = "Kún";
const today = "Búgin";
const noEvent = "Ta'dbir joq";
const allDay = "Bárlıq kún";
const deleteEvent = "Óshiriw";
const createEvent = "Ta'dbir sho'lkemlestriw";
const dateFormat = "dddd D MMMM YYYY";
const kaa = {
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
  kaa as default,
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
