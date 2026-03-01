/**
  * vue-cal v5.0.1-rc.34
  * (c) 2024-2026 Antoni Andre <antoniandre.web@gmail.com>
  * @license MIT
  */
const weekDays = ["ორშაბათი", "სამშაბათი", "ოთხშაბათი", "ხუთშაბათი", "პარასკევი", "შაბათი", "კვირა"];
const months = ["იანვარი", "თებერვალი", "მარტი", "აპრილი", "მაისი", "ივნისი", "ივლისი", "აგვისტო", "სექტემბერი", "ოქტომბერი", "ნოემბერი", "დეკემბერი"];
const years = "წლები";
const year = "წელი";
const month = "თვე";
const week = "კვირა";
const days = "დღეები";
const day = "დღე";
const today = "დღეს";
const noEvent = "ღონისძიება არ არის";
const allDay = "მთელი დღე";
const deleteEvent = "წაშლა";
const createEvent = "შექმენით ღონისძიება";
const dateFormat = "dddd D MMMM YYYY";
const ka = {
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
  ka as default,
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
