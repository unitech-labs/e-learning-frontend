/**
  * vue-cal v5.0.1-rc.34
  * (c) 2024-2026 Antoni Andre <antoniandre.web@gmail.com>
  * @license MIT
  */
const weekDays = ["Maanantai", "Tiistai", "Keskiviikko", "Torstai", "Perjantai", "Lauantai", "Sunnuntai"];
const months = ["Tammikuu", "Helmikuu", "Maaliskuu", "Huhtikuu", "Toukokuu", "Kesäkuu", "Heinäkuu", "Elokuu", "Syyskuu", "Lokakuu", "Marraskuu", "Joulukuu"];
const years = "Vuodet";
const year = "Vuosi";
const month = "Kuukausi";
const week = "Viikko";
const days = "Päivät";
const day = "Päivä";
const today = "Tänään";
const noEvent = "Ei tapahtumia";
const allDay = "Koko päivä";
const deleteEvent = "Poista tapahtuma";
const createEvent = "Luo tapahtuma";
const dateFormat = "dddd, D MMMM YYYY";
const fi = {
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
  fi as default,
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
