/**
  * vue-cal v5.0.1-rc.34
  * (c) 2024-2026 Antoni Andre <antoniandre.web@gmail.com>
  * @license MIT
  */
import { computed, reactive, watch, toRefs, ref, onBeforeUnmount, nextTick, inject, createElementBlock, openBlock, renderSlot, createCommentVNode, unref, Fragment, renderList, normalizeClass, createElementVNode, createVNode, Transition, withCtx, createBlock, resolveDynamicComponent, mergeProps, toHandlers, normalizeProps, onMounted, toDisplayString, createTextVNode, withModifiers, normalizeStyle, TransitionGroup, createSlots, useTemplateRef, useId, useAttrs, provide, guardReactiveProps } from "vue";
const defaults = {
  texts: {
    weekDays: Array(7).fill(""),
    weekDaysShort: [],
    months: Array(12).fill(""),
    years: "",
    year: "",
    month: "",
    week: "",
    day: "",
    today: "",
    noEvent: "",
    allDay: "",
    deleteEvent: "",
    createEvent: "",
    dateFormat: "dddd MMMM D, YYYY",
    am: "am",
    pm: "pm",
    truncations: true
  },
  availableViews: {
    day: { cols: 1, rows: 1 },
    days: { cols: 10, rows: 1 },
    week: { cols: 7, rows: 1 },
    month: { cols: 7, rows: 6 },
    year: { cols: 4, rows: 3 },
    years: { cols: 5, rows: 5 }
    // Arbitrary range of quarters of century (25y).
  }
};
const months$1 = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const weekdays = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const weekdaysMap = weekdays.reduce((obj, day2, i) => {
  obj[day2] = i || 7;
  return obj;
}, {});
const useConfig = (vuecal, props2, attrs) => {
  const { dateUtils } = vuecal;
  const ready = false;
  const view = computed(() => {
    if (availableViews.value[props2.view]) return props2.view;
    const fallbackView = props2.datePicker ? "month" : "week";
    const view2 = props2.view || fallbackView;
    if (availableViews.value[view2]) return view2;
    console.warn(
      `Vue Cal: the provided or default view \`${view2}\` is either invalid or not in the list of available views. The first available view will be chosen: \`${Object.keys(availableViews.value)[0]}\`.`
    );
    return Object.keys(availableViews.value)[0];
  });
  const sm = computed(() => props2.sm && !props2.xs);
  const xs = computed(() => props2.xs || props2.datePicker);
  const clickToNavigate = computed(() => props2.clickToNavigate || props2.datePicker && props2.clickToNavigate !== false);
  const eventListeners = computed(() => {
    const listeners = {
      cell: {},
      // All possible event listeners to attach to cells.
      event: {}
      // All possible event listeners to attach to calendar events.
    };
    const kebabize = (str) => str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
    for (const [attr, value] of Object.entries(attrs)) {
      const [m0, m1, m2] = attr.match(/^on(Cell|Event)(.+)$/) || [];
      if (m0) listeners[m1.toLowerCase()][kebabize(m2).replace(/^-+|-+$/g, "")] = value;
    }
    return listeners;
  });
  const hideWeekdays = computed(() => {
    var _a;
    const weekDays2 = {};
    if (props2.hideWeekends) (weekDays2[6] = true) && (weekDays2[7] = true);
    if ((_a = props2.hideWeekdays) == null ? void 0 : _a.length) props2.hideWeekdays.forEach((day2) => weekDays2[weekdaysMap[day2]] = true);
    return weekDays2;
  });
  const hideWeekends = computed(() => props2.hideWeekends || hideWeekdays.value[6] && hideWeekdays.value[7]);
  const availableViews = computed(() => {
    const datePicker = props2.datePicker;
    let invalidViews = 0;
    let availViews = {};
    const views = props2.views;
    if (datePicker && !views) return {
      month: { ...defaults.availableViews.month },
      year: { ...defaults.availableViews.year },
      years: { ...defaults.availableViews.years }
    };
    else if (props2.horizontal && !views) return {
      days: { cols: defaults.availableViews.days.rows, rows: defaults.availableViews.days.cols },
      week: { cols: defaults.availableViews.week.rows, rows: defaults.availableViews.week.cols }
    };
    if (views) {
      if (Array.isArray(views)) {
        availViews = views.reduce((obj, view2) => {
          if (typeof view2 === "string" && defaults.availableViews[view2]) obj[view2] = defaults.availableViews[view2];
          else invalidViews++;
          return obj;
        }, {});
      } else if (typeof views === "object") {
        availViews = Object.entries(views).reduce((obj, [id, size]) => {
          const { cols, rows } = defaults.availableViews[id];
          obj[id] = { cols: size.cols || cols, rows: size.rows || rows };
          return obj;
        }, {});
      }
      if (invalidViews) {
        console.warn("Vue Cal: the provided `views` prop contains invalid views that will be ignored.");
      }
      if (!Object.keys(availViews).length) {
        console.warn("Vue Cal: No valid view in the provided `views` prop. Falling back to default views.");
        availViews = { ...defaults.availableViews };
      }
    } else availViews = { ...defaults.availableViews };
    return availViews;
  });
  const defaultView = computed(() => {
    if (props2.datePicker) return "month";
    if (availableViews.value.week) return "week";
    return Object.keys(availableViews.value)[0];
  });
  const selectedDate = computed(() => {
    if (typeof props2.selectedDate === "string") return dateUtils.stringToDate(props2.selectedDate);
    if (props2.selectedDate instanceof Date) return props2.selectedDate;
    if (!props2.selectedDate) console.log("Vue Cal: Info - The provided selected date is undefined.");
    else console.warn("Vue Cal: The provided selected date is invalid:", props2.selectedDate);
  });
  const disableDays = computed(() => {
    if (!props2.disableDays) return [];
    const validDates = [];
    if (Array.isArray(props2.disableDays)) {
      for (let date of props2.disableDays) {
        let jsDate = date;
        if (typeof date === "string") jsDate = dateUtils.stringToDate(date);
        else if (date instanceof Date) date = dateUtils.formatDate(date, "YYYY-MM-DD");
        if (jsDate instanceof Date && !isNaN(jsDate.getTime())) {
          validDates.push(date);
        } else {
          console.warn("Vue Cal: The provided `disableDays` prop contains an invalid date:", date);
        }
      }
    } else console.warn("Vue Cal: The provided `disableDays` prop is invalid:", props2.disableDays);
    return validDates;
  });
  const minTimestamp = computed(() => {
    let date = null;
    if (props2.minDate && typeof props2.minDate === "string") date = dateUtils.stringToDate(props2.minDate);
    else if (props2.minDate && props2.minDate instanceof Date) date = props2.minDate;
    return (date == null ? void 0 : date.getTime()) || null;
  });
  const maxTimestamp = computed(() => {
    let date = null;
    if (props2.maxDate && typeof props2.maxDate === "string") date = dateUtils.stringToDate(props2.maxDate);
    else if (props2.maxDate && props2.maxDate instanceof Date) date = props2.maxDate;
    return (date == null ? void 0 : date.getTime()) || null;
  });
  const schedules = computed(() => {
    var _a;
    const { view: view2 } = vuecal;
    const show = props2.schedules.length && (view2.isDay || view2.isDays || view2.isWeek);
    return show && ((_a = props2.schedules) == null ? void 0 : _a.map((s, i) => ({ ...s, id: s.id ?? i + 1 }))) || void 0;
  });
  const editableEvents = computed(() => {
    const defaults2 = {
      drag: true,
      resize: true,
      delete: true,
      create: true
    };
    if (props2.editableEvents === true) return defaults2;
    if (props2.editableEvents === false) return Object.keys(defaults2).map((key) => defaults2[key] = false);
    return { ...defaults2, ...props2.editableEvents };
  });
  const showCellEventCount = computed(() => {
    const { view: view2 } = vuecal;
    const { eventCount } = props2;
    const showEventCount = Array.isArray(eventCount) ? eventCount.includes(view2.id) : eventCount;
    return showEventCount && (view2.isMonth && !props2.eventsOnMonthView || view2.isYear);
  });
  const allDayEvents = computed(() => props2.allDayEvents && props2.time !== false && !view.isMonth);
  const timeAtCursor = computed(() => props2.timeAtCursor && props2.time !== false);
  const loadTexts = async (locale) => {
    var _a;
    let translations = /* @__PURE__ */ Object.assign({ "../i18n/ar.json": () => import("./i18n/ar.js").then((m) => m["default"]), "../i18n/bg.json": () => import("./i18n/bg.js").then((m) => m["default"]), "../i18n/bn.json": () => import("./i18n/bn.js").then((m) => m["default"]), "../i18n/bs.json": () => import("./i18n/bs.js").then((m) => m["default"]), "../i18n/ca.json": () => import("./i18n/ca.js").then((m) => m["default"]), "../i18n/cs.json": () => import("./i18n/cs.js").then((m) => m["default"]), "../i18n/da.json": () => import("./i18n/da.js").then((m) => m["default"]), "../i18n/de.json": () => import("./i18n/de.js").then((m) => m["default"]), "../i18n/el.json": () => import("./i18n/el.js").then((m) => m["default"]), "../i18n/en-gb.json": () => import("./i18n/en-gb.js").then((m) => m["default"]), "../i18n/en-us.json": () => Promise.resolve().then(() => enUs).then((m) => m["default"]), "../i18n/es.json": () => import("./i18n/es.js").then((m) => m["default"]), "../i18n/et.json": () => import("./i18n/et.js").then((m) => m["default"]), "../i18n/fa.json": () => import("./i18n/fa.js").then((m) => m["default"]), "../i18n/fi.json": () => import("./i18n/fi.js").then((m) => m["default"]), "../i18n/fr.json": () => import("./i18n/fr.js").then((m) => m["default"]), "../i18n/he.json": () => import("./i18n/he.js").then((m) => m["default"]), "../i18n/hr.json": () => import("./i18n/hr.js").then((m) => m["default"]), "../i18n/hu.json": () => import("./i18n/hu.js").then((m) => m["default"]), "../i18n/id.json": () => import("./i18n/id.js").then((m) => m["default"]), "../i18n/is.json": () => import("./i18n/is.js").then((m) => m["default"]), "../i18n/it.json": () => import("./i18n/it.js").then((m) => m["default"]), "../i18n/ja.json": () => import("./i18n/ja.js").then((m) => m["default"]), "../i18n/ka.json": () => import("./i18n/ka.js").then((m) => m["default"]), "../i18n/kaa.json": () => import("./i18n/kaa.js").then((m) => m["default"]), "../i18n/kk.json": () => import("./i18n/kk.js").then((m) => m["default"]), "../i18n/ko.json": () => import("./i18n/ko.js").then((m) => m["default"]), "../i18n/ky.json": () => import("./i18n/ky.js").then((m) => m["default"]), "../i18n/lt.json": () => import("./i18n/lt.js").then((m) => m["default"]), "../i18n/mn.json": () => import("./i18n/mn.js").then((m) => m["default"]), "../i18n/nl.json": () => import("./i18n/nl.js").then((m) => m["default"]), "../i18n/no.json": () => import("./i18n/no.js").then((m) => m["default"]), "../i18n/pl.json": () => import("./i18n/pl.js").then((m) => m["default"]), "../i18n/pt-br.json": () => import("./i18n/pt-br.js").then((m) => m["default"]), "../i18n/pt-pt.json": () => import("./i18n/pt-pt.js").then((m) => m["default"]), "../i18n/ro.json": () => import("./i18n/ro.js").then((m) => m["default"]), "../i18n/ru.json": () => import("./i18n/ru.js").then((m) => m["default"]), "../i18n/sk.json": () => import("./i18n/sk.js").then((m) => m["default"]), "../i18n/sl.json": () => import("./i18n/sl.js").then((m) => m["default"]), "../i18n/sq.json": () => import("./i18n/sq.js").then((m) => m["default"]), "../i18n/sr.json": () => import("./i18n/sr.js").then((m) => m["default"]), "../i18n/sv.json": () => import("./i18n/sv.js").then((m) => m["default"]), "../i18n/tr.json": () => import("./i18n/tr.js").then((m) => m["default"]), "../i18n/uk.json": () => import("./i18n/uk.js").then((m) => m["default"]), "../i18n/uz-cryl.json": () => import("./i18n/uz-cryl.js").then((m) => m["default"]), "../i18n/uz.json": () => import("./i18n/uz.js").then((m) => m["default"]), "../i18n/vi.json": () => import("./i18n/vi.js").then((m) => m["default"]), "../i18n/zh-cn.json": () => import("./i18n/zh-cn.js").then((m) => m["default"]), "../i18n/zh-hk.json": () => import("./i18n/zh-hk.js").then((m) => m["default"]) });
    {
      if (!translations[`../i18n/${locale}.json`]) {
        console.warn(`Vue Cal: the locale \`${locale}\` does not exist. Falling back to \`en-us\`.`);
        locale = "en-us";
        return;
      }
      translations = await ((_a = translations[`../i18n/${locale}.json`]) == null ? void 0 : _a.call(translations));
    }
    vuecal.texts = Object.assign(vuecal.texts, Object.assign({ ...defaults.texts }, translations));
    dateUtils.updateTexts(vuecal.texts);
  };
  const events = reactive(props2.events || []);
  watch(() => props2.events, (evts) => events.splice(0, events.length, ...evts));
  watch(() => props2.locale, (newLocale) => loadTexts(newLocale || "en-us"));
  if (props2.locale || !vuecal.texts.today) loadTexts(props2.locale || "en-us");
  return {
    ...toRefs(props2),
    events,
    // All the events listeners for cells and events that the end user may have attached to vue-cal.
    eventListeners,
    defaultView,
    availableViews,
    disableDays,
    ready,
    sm,
    xs,
    clickToNavigate,
    hideWeekdays,
    hideWeekends,
    minTimestamp,
    maxTimestamp,
    schedules,
    selectedDate,
    editableEvents,
    showCellEventCount,
    allDayEvents,
    timeAtCursor,
    view,
    // Getters.
    get hasHiddenDays() {
      return Object.keys(hideWeekdays.value).length;
    },
    get size() {
      return xs.value ? "xs" : sm.value ? "sm" : "lg";
    },
    loadTexts
  };
};
const minutesToPercentage = (minutes, config) => {
  const dayRangeMinutes = config.timeTo - config.timeFrom;
  return (minutes - config.timeFrom) * 100 / dayRangeMinutes;
};
const percentageToMinutes = (percentage, config) => {
  const dayRangeMinutes = config.timeTo - config.timeFrom;
  return ~~(percentage * dayRangeMinutes / 100 + config.timeFrom);
};
const pxToPercentage = (y, containerEl) => {
  const containerElHeight = containerEl.clientHeight;
  return y * 100 / containerElHeight;
};
const viewBeforeDrag = reactive({ id: null, date: null });
let viewChanged = false;
let cancelViewChange = true;
const dragOverCell = reactive({ el: null, cell: null, timeout: null });
const dragging = reactive({
  eventId: null,
  fromVueCal: null,
  toVueCal: null
});
function useDragAndDrop(vuecal) {
  const { config, view, eventsManager, emit, uid: vuecalUid, dateUtils } = vuecal;
  const getEventStart = (e) => {
    var _a;
    const { timeStep, timeCellHeight, timeFrom } = config;
    const clientY = (((_a = e.touches) == null ? void 0 : _a[0]) || e).clientY;
    const { top } = e.currentTarget.getBoundingClientRect();
    const y = clientY - top - ~~e.dataTransfer.getData("cursor-grab-at");
    return percentageToMinutes(pxToPercentage(y, e.currentTarget), config);
  };
  const computeNewEventStartEnd = (e, transferData, cellDate) => {
    const duration = transferData.duration || deltaMinutes(transferData.start, transferData.end) || config.timeStep;
    let startTimeMinutes = Math.max(getEventStart(e), 0);
    if (config.snapToInterval) {
      const plusHalfSnapTime = startTimeMinutes + config.snapToInterval / 2;
      startTimeMinutes = plusHalfSnapTime - plusHalfSnapTime % config.snapToInterval;
    }
    const start = new Date(new Date(cellDate).setMinutes(startTimeMinutes));
    const endTimeMinutes = Math.min(startTimeMinutes + duration, 24 * 60);
    const end = new Date(new Date(cellDate).setMinutes(endTimeMinutes));
    return { start, end };
  };
  const deltaMinutes = (date1, date2) => Math.round((date2 - date1) / 6e4);
  const eventDragStart = (e, event) => {
    if (e.target.nodeType === 3 || vuecal.touch.isResizingEvent) return e.preventDefault();
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.dropEffect = "move";
    const cleanEvent = { ...event, _: { id: event._.id, duration: deltaMinutes(event.start, event.end) } };
    try {
      e.dataTransfer.setData("text/plain", "");
      e.dataTransfer.setData("event", JSON.stringify(cleanEvent));
      e.dataTransfer.setData("cursor-grab-at", e.offsetY);
    } catch (err) {
      console.warn("Vue Cal: Failed to set drag data:", err);
      return e.preventDefault();
    }
    dragging.eventId = event._.id;
    dragging.fromVueCal = vuecalUid;
    emit("event-drag-start", {
      e,
      event
    });
    const eventDomNode = e.target.closest(".vuecal__event");
    eventDomNode.classList.add("vuecal__event--dragging-ghost");
    setTimeout(() => {
      eventDomNode.classList.add("vuecal__event--dragging-original");
      eventDomNode.classList.remove("vuecal__event--dragging-ghost");
    }, 0);
    viewChanged = false;
    Object.assign(viewBeforeDrag, { id: view.id, date: view.firstCellDate });
    cancelViewChange = true;
    vuecal.touch.isDraggingEvent = true;
  };
  const eventDragEnd = (e, event) => {
    dragging.eventId = null;
    e.target.closest(".vuecal__event").classList.remove("vuecal__event--dragging-original");
    const { fromVueCal, toVueCal } = dragging;
    if (toVueCal && fromVueCal !== toVueCal) eventsManager.deleteEvent(event._.id, 3);
    if (viewChanged && cancelViewChange && viewBeforeDrag.id) {
      view.switchView(viewBeforeDrag.id, viewBeforeDrag.date, true);
    }
    emit("event-drag-end", {
      e,
      event,
      external: dragging.fromVueCal !== vuecalUid
    });
    dragging.fromVueCal = null;
    dragging.toVueCal = null;
    vuecal.touch.isDraggingEvent = false;
  };
  const cellDragEnter = (e, cell) => {
    const { start: cellDate } = cell;
    const target = e.currentTarget;
    if (e.currentTarget.contains(e.relatedTarget)) return;
    if (target === dragOverCell.el || !target.className.includes("vuecal__cell-content")) return false;
    if (dragOverCell.el) dragOverCell.cell.highlighted = false;
    Object.assign(dragOverCell, { el: target, cell, timeout: clearTimeout(dragOverCell.timeout) });
    cell.highlighted = true;
    if (["years", "year", "month"].includes(view.id)) {
      dragOverCell.timeout = setTimeout(() => vuecal.switchToNarrowerView(cellDate), 2e3);
    }
  };
  const cellDragOver = (e, cell) => {
    const { start: cellDate, schedule } = cell;
    e.preventDefault();
    cell.highlighted = true;
    if (schedule || schedule === 0) cell.highlightedSchedule = schedule;
  };
  const cellDragLeave = (e, cell) => {
    e.preventDefault();
    if (e.currentTarget.contains(e.relatedTarget)) return;
    cell.highlightedSchedule = false;
    if (dragOverCell.cell === cell) {
      clearTimeout(dragOverCell.timeout);
      Object.assign(dragOverCell, { el: null, cell: null, timeout: null });
      cell.highlighted = false;
    }
  };
  const cellDragDrop = async (e, cell, allDay2 = false) => {
    var _a, _b, _c;
    e.preventDefault();
    clearTimeout(dragOverCell.timeout);
    Object.assign(dragOverCell, { el: null, cell: null, timeout: null });
    const incomingEvent = JSON.parse(e.dataTransfer.getData("event") || "{}");
    if (incomingEvent.start) incomingEvent.start = new Date(incomingEvent.start);
    if (incomingEvent.end) incomingEvent.end = new Date(incomingEvent.end);
    let event;
    let newStart;
    let newEnd;
    if (allDay2) {
      newStart = new Date(cell.start);
      newEnd = new Date(cell.end);
    } else ({ start: newStart, end: newEnd } = computeNewEventStartEnd(e, incomingEvent, cell.start));
    const { schedule: newSchedule } = ((_a = e.target.closest("[data-schedule]")) == null ? void 0 : _a.dataset) || {};
    let onAcceptedDrop = () => {
    };
    if (dragging.fromVueCal === vuecalUid) {
      event = eventsManager.getEvent(incomingEvent._.id);
      if (event) {
        event._.dragging = false;
        onAcceptedDrop = (modifiedEvent) => {
          event.start = newStart;
          event.end = newEnd;
          event.allDay = allDay2;
          if (newSchedule !== void 0) event.schedule = ~~newSchedule;
          if (modifiedEvent && typeof modifiedEvent === "object") {
            const { _, ...cleanModifiedEvent } = modifiedEvent;
            Object.assign(event, cleanModifiedEvent);
          }
        };
      }
    } else {
      event = {
        ...incomingEvent,
        start: newStart,
        end: newEnd,
        ...newSchedule !== void 0 && { schedule: ~~newSchedule },
        _: { id: ((_b = incomingEvent._) == null ? void 0 : _b.id) || incomingEvent.id, duration: deltaMinutes(newStart, newEnd) },
        getOverlappingEvents: () => {
          return eventsManager.getEventsInRange(newStart, newEnd, { schedule: ~~newSchedule });
        }
      };
      onAcceptedDrop = (modifiedEvent) => {
        event = eventsManager.createEvent(event);
        if (modifiedEvent && typeof modifiedEvent === "object") {
          const { _, ...cleanModifiedEvent } = modifiedEvent;
          Object.assign(event, cleanModifiedEvent);
        }
      };
    }
    let acceptDrop = true;
    const { drop: dropEventHandler } = (_c = config.eventListeners) == null ? void 0 : _c.event;
    if (dropEventHandler) {
      acceptDrop = await dropEventHandler({
        e,
        event: { ...event, start: newStart, end: newEnd, schedule: ~~newSchedule },
        overlaps: event.getOverlappingEvents({ start: newStart, end: newEnd, schedule: ~~newSchedule }),
        cell,
        external: dragging.fromVueCal !== vuecalUid
      });
    }
    if (acceptDrop !== false) onAcceptedDrop(acceptDrop);
    cell.highlighted = false;
    cell.highlightedSchedule = null;
    cancelViewChange = false;
    dragging.toVueCal = vuecalUid;
    emit("event-dropped", {
      e,
      cell,
      event,
      originalEvent: incomingEvent,
      external: dragging.fromVueCal !== vuecalUid
    });
  };
  return {
    eventDragStart,
    eventDragEnd,
    cellDragEnter,
    cellDragOver,
    cellDragLeave,
    cellDragDrop
  };
}
const useDateUtils = (initTexts, EnUs2) => {
  let now, todayDate, todayF;
  let _dateObject = {};
  let _timeObject = {};
  const texts = ref(initTexts);
  const addDatePrototypes2 = () => {
    if (!texts.value.today) texts.value = EnUs2;
    Date.prototype.addDays = function(days2) {
      return addDays2(this, days2 || 0);
    };
    Date.prototype.subtractDays = function(days2) {
      return subtractDays2(this, days2 || 0);
    };
    Date.prototype.addHours = function(hours) {
      return addHours2(this, hours || 0);
    };
    Date.prototype.subtractHours = function(hours) {
      return subtractHours2(this, hours || 0);
    };
    Date.prototype.addMinutes = function(minutes) {
      return addMinutes2(this, minutes || 0);
    };
    Date.prototype.subtractMinutes = function(minutes) {
      return subtractMinutes2(this, minutes || 0);
    };
    Date.prototype.getWeek = function() {
      return getWeek2(this);
    };
    Date.prototype.isToday = function() {
      return isToday2(this);
    };
    Date.prototype.isLeapYear = function() {
      return isLeapYear2(this);
    };
    Date.prototype.format = function(format = "YYYY-MM-DD") {
      return formatDate2(this, format);
    };
    Date.prototype.formatTime = function(format = "HH:mm") {
      return formatTime2(this, format);
    };
  };
  const removeDatePrototypes2 = () => {
    delete Date.prototype.addDays;
    delete Date.prototype.subtractDays;
    delete Date.prototype.addHours;
    delete Date.prototype.subtractHours;
    delete Date.prototype.addMinutes;
    delete Date.prototype.subtractMinutes;
    delete Date.prototype.getWeek;
    delete Date.prototype.isToday;
    delete Date.prototype.isLeapYear;
    delete Date.prototype.format;
    delete Date.prototype.formatTime;
  };
  const updateTexts2 = (newTexts) => {
    texts.value = newTexts;
    if (Date.prototype.subtractDays) addDatePrototypes2();
  };
  const _todayFormatted = () => {
    if (todayDate !== (/* @__PURE__ */ new Date()).getDate()) {
      now = /* @__PURE__ */ new Date();
      todayDate = now.getDate();
      todayF = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
    }
    return todayF;
  };
  const addDays2 = (date, days2) => {
    const d = new Date(date.valueOf());
    d.setDate(d.getDate() + days2);
    return d;
  };
  const subtractDays2 = (date, days2) => {
    const d = new Date(date.valueOf());
    d.setDate(d.getDate() - days2);
    return d;
  };
  const addHours2 = (date, hours) => {
    const d = new Date(date.valueOf());
    d.setHours(d.getHours() + hours);
    return d;
  };
  const subtractHours2 = (date, hours) => {
    const d = new Date(date.valueOf());
    d.setHours(d.getHours() - hours);
    return d;
  };
  const addMinutes2 = (date, minutes) => {
    const d = new Date(date.valueOf());
    d.setMinutes(d.getMinutes() + minutes);
    return d;
  };
  const subtractMinutes2 = (date, minutes) => {
    const d = new Date(date.valueOf());
    d.setMinutes(d.getMinutes() - minutes);
    return d;
  };
  const snapToInterval = (input, interval) => {
    const adjustMinutes = (minutes) => {
      const remainder = minutes % interval;
      if (remainder !== 0) {
        minutes += remainder >= interval / 2 ? interval - remainder : -remainder;
      }
      return minutes;
    };
    if (typeof input === "number") return adjustMinutes(input);
    else if (input instanceof Date) {
      let minutes = adjustMinutes(input.getMinutes());
      if (minutes >= 60) {
        input.setHours(input.getHours() + 1);
        minutes = 0;
      }
      input.setMinutes(minutes, 0, 0);
    }
  };
  const getWeek2 = (date, weekStartsOnSunday = false) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - yearStart) / 864e5 + 1) / 7) + (weekStartsOnSunday ? 1 : 0);
  };
  const isToday2 = (date) => {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}` === _todayFormatted();
  };
  const isSameDate2 = (date1, date2) => {
    if (!date1 || !date2) return console.warn(`Vue Cal: missing date${!date1 ? "1" : "2"} parameter for comparison with \`isSameDate(date1, date2)\`.`);
    else if (!isValid(date1)) return console.warn(`Vue Cal: invalid date1 provided for comparison with \`isSameDate(date1, date2)\`: \`${date1}\`.`);
    else if (!isValid(date2)) return console.warn(`Vue Cal: invalid date2 provided for comparison with \`isSameDate(date1, date2)\`: \`${date2}\`.`);
    return date1.getFullYear() === date2.getFullYear() && date1.getMonth() === date2.getMonth() && date1.getDate() === date2.getDate();
  };
  const isInRange2 = (date, rangeStart, rangeEnd) => {
    if (!isValid(date)) return console.warn(`Vue Cal: invalid date provided to \`isInRange(date, rangeStart, rangeEnd)\`: \`${date}\`.`);
    return date.getTime() >= rangeStart && date.getTime() <= rangeEnd;
  };
  const isLeapYear2 = (date) => {
    const year2 = date.getFullYear();
    return !(year2 % 400) || year2 % 100 && !(year2 % 4);
  };
  const getPreviousFirstDayOfWeek2 = (date = null, weekStartsOnSunday) => {
    const prevFirstDayOfWeek = date && new Date(date.valueOf()) || /* @__PURE__ */ new Date();
    const dayModifier = weekStartsOnSunday ? 7 : 6;
    prevFirstDayOfWeek.setDate(prevFirstDayOfWeek.getDate() - (prevFirstDayOfWeek.getDay() + dayModifier) % 7);
    return prevFirstDayOfWeek;
  };
  const stringToDate2 = (date) => {
    if (date instanceof Date) return date;
    if (date.length === 10) date += " 00:00";
    return new Date(date.replace(/-/g, "/"));
  };
  const dateToMinutes2 = (date) => date.getHours() * 60 + date.getMinutes();
  const countDays2 = (start, end) => {
    if (typeof start === "string") start = start.replace(/-/g, "/");
    if (typeof end === "string") end = end.replace(/-/g, "/");
    start = new Date(start).setHours(0, 0, 0, 0);
    end = new Date(end).setHours(0, 0, 1, 0);
    const timezoneDiffMs = (new Date(end).getTimezoneOffset() - new Date(start).getTimezoneOffset()) * 60 * 1e3;
    return Math.ceil((end - start - timezoneDiffMs) / (24 * 3600 * 1e3));
  };
  const datesInSameTimeStep2 = (date1, date2, timeStep) => {
    return Math.abs(date1.getTime() - date2.getTime()) <= timeStep * 60 * 1e3;
  };
  const isValid = (date) => date && date instanceof Date && !isNaN(date);
  const formatDate2 = (date, format = "YYYY-MM-DD", txts = null) => {
    if (!txts) txts = texts.value;
    if (!format) format = "YYYY-MM-DD";
    if (format === "YYYY-MM-DD") return formatDateLite2(date);
    _dateObject = {};
    _timeObject = {};
    const dateObj = {
      YYYY: () => _hydrateDateObject(date, txts).YYYY,
      YY: () => _hydrateDateObject(date, txts).YY(),
      M: () => _hydrateDateObject(date, txts).M,
      MM: () => _hydrateDateObject(date, txts).MM(),
      MMM: () => _hydrateDateObject(date, txts).MMM(),
      MMMM: () => _hydrateDateObject(date, txts).MMMM(),
      MMMMG: () => _hydrateDateObject(date, txts).MMMMG(),
      D: () => _hydrateDateObject(date, txts).D,
      DD: () => _hydrateDateObject(date, txts).DD(),
      S: () => _hydrateDateObject(date, txts).S(),
      d: () => _hydrateDateObject(date, txts).d,
      dd: () => _hydrateDateObject(date, txts).dd(),
      ddd: () => _hydrateDateObject(date, txts).ddd(),
      dddd: () => _hydrateDateObject(date, txts).dddd(),
      HH: () => _hydrateTimeObject(date, txts).HH,
      H: () => _hydrateTimeObject(date, txts).H,
      hh: () => _hydrateTimeObject(date, txts).hh,
      h: () => _hydrateTimeObject(date, txts).h,
      am: () => _hydrateTimeObject(date, txts).am,
      AM: () => _hydrateTimeObject(date, txts).AM,
      mm: () => _hydrateTimeObject(date, txts).mm,
      m: () => _hydrateTimeObject(date, txts).m,
      s: () => _hydrateTimeObject(date, txts).s
    };
    return format.replace(/(\{[a-zA-Z]+\}|[a-zA-Z]+)/g, (m, contents) => {
      const result = dateObj[contents.replace(/\{|\}/g, "")];
      return result !== void 0 ? result() : contents;
    });
  };
  const formatDateLite2 = (date) => {
    const m = date.getMonth() + 1;
    const d = date.getDate();
    return `${date.getFullYear()}-${m < 10 ? "0" : ""}${m}-${d < 10 ? "0" : ""}${d}`;
  };
  const formatTime2 = (date, format = "HH:mm", txts = null, round = false) => {
    let shouldRound = false;
    if (round) {
      const [h, m, s] = [date.getHours(), date.getMinutes(), date.getSeconds()];
      if (h + m + s === 23 + 59 + 59) shouldRound = true;
    }
    if (date instanceof Date && format === "HH:mm") return shouldRound ? "24:00" : formatTimeLite2(date);
    _timeObject = {};
    if (!txts) txts = texts.value;
    const timeObj = _hydrateTimeObject(date, txts);
    const formatted = format.replace(/(\{[a-zA-Z]+\}|[a-zA-Z]+)/g, (m, contents) => {
      const result = timeObj[contents.replace(/\{|\}/g, "")];
      return result !== void 0 ? result : contents;
    });
    return shouldRound ? formatted.replace("23:59", "24:00") : formatted;
  };
  const formatTimeLite2 = (date) => {
    const h = date.getHours();
    const m = date.getMinutes();
    return `${(h < 10 ? "0" : "") + h}:${(m < 10 ? "0" : "") + m}`;
  };
  const formatMinutes2 = (minutes) => {
    const h = Math.floor(minutes / 60).toString().padStart(2, 0);
    const m = (minutes % 60).toString().padStart(2, 0);
    return `${h}:${m}`;
  };
  const _nth = (d) => {
    if (d > 3 && d < 21) return "th";
    switch (d % 10) {
      case 1:
        return "st";
      case 2:
        return "nd";
      case 3:
        return "rd";
      default:
        return "th";
    }
  };
  const _hydrateDateObject = (date, txts) => {
    if (_dateObject.D) return _dateObject;
    const YYYY = date.getFullYear();
    const M = date.getMonth() + 1;
    const D = date.getDate();
    const day2 = date.getDay();
    const dayNumber = (day2 - 1 + 7) % 7;
    _dateObject = {
      // Year.
      YYYY,
      // 2024.
      YY: () => YYYY.toString().substring(2),
      // 24.
      // Month.
      M,
      // 1 to 12.
      MM: () => M.toString().padStart(2, 0),
      // 01 to 12.
      MMM: () => txts.months[M - 1].substring(0, 3),
      // Jan to Dec.
      MMMM: () => txts.months[M - 1],
      // January to December.
      MMMMG: () => (txts.monthsGenitive || txts.months)[M - 1],
      // January to December in genitive form (Greek...)
      // Day.
      D,
      // 1 to 31.
      DD: () => D.toString().padStart(2, 0),
      // 01 to 31.
      S: () => _nth(D),
      // st, nd, rd, th.
      // Day of the week.
      d: dayNumber + 1,
      // 1 to 7 with 7 = Sunday.
      // Some locales have same start for all the days, so they have specific abbrev in weekDaysShort.
      dd: () => txts.weekDaysShort.length ? txts.weekDaysShort[dayNumber] : txts.weekDays[dayNumber][0],
      // M to S.
      ddd: () => txts.weekDaysShort.length ? txts.weekDaysShort[dayNumber] : txts.weekDays[dayNumber].substr(0, 3),
      // Mon to Sun.
      dddd: () => txts.weekDays[dayNumber]
      // Monday to Sunday.
    };
    return _dateObject;
  };
  const _hydrateTimeObject = (date, txts) => {
    if (_timeObject.am) return _timeObject;
    let H, m, s;
    if (date instanceof Date) {
      H = date.getHours();
      m = date.getMinutes();
      s = date.getSeconds();
    } else {
      H = Math.floor(date / 60);
      m = Math.floor(date % 60);
    }
    const h = H % 12 ? H % 12 : 12;
    const am2 = (txts || { am: "am", pm: "pm" })[H === 24 || H < 12 ? "am" : "pm"];
    _timeObject = {
      H,
      h,
      HH: H.toString().padStart(2, 0),
      hh: h.toString().padStart(2, 0),
      am: am2,
      AM: am2.toUpperCase(),
      m,
      mm: m.toString().padStart(2, 0),
      s
    };
    return _timeObject;
  };
  return {
    addDatePrototypes: addDatePrototypes2,
    removeDatePrototypes: removeDatePrototypes2,
    updateTexts: updateTexts2,
    addDays: addDays2,
    subtractDays: subtractDays2,
    addHours: addHours2,
    subtractHours: subtractHours2,
    addMinutes: addMinutes2,
    subtractMinutes: subtractMinutes2,
    snapToInterval,
    getWeek: getWeek2,
    isToday: isToday2,
    isSameDate: isSameDate2,
    isInRange: isInRange2,
    isLeapYear: isLeapYear2,
    getPreviousFirstDayOfWeek: getPreviousFirstDayOfWeek2,
    stringToDate: stringToDate2,
    dateToMinutes: dateToMinutes2,
    countDays: countDays2,
    datesInSameTimeStep: datesInSameTimeStep2,
    isValid,
    formatDate: formatDate2,
    formatDateLite: formatDateLite2,
    formatTime: formatTime2,
    formatTimeLite: formatTimeLite2,
    formatMinutes: formatMinutes2
  };
};
const useEvents = (vuecal) => {
  const { dateUtils, config } = vuecal;
  let uid = 0;
  const events = computed(() => {
    var _a, _b, _c, _d, _e;
    const events2 = {
      // A map of events indexed by { YYYY: { MM: { DD: [] } } }.
      // Each year contains a map of 12 months starting from 1, each containing a map of days starting from 1, each containing an array of event IDs.
      byYear: {},
      byDate: {},
      // A map of single-day events indexed by date.
      recurring: [],
      // An array of events IDs that are recurring.
      multiday: [],
      // An array of events IDs that are multiday.
      byId: {}
      // A map of all the events indexed by ID for fast lookup. Each event is the original full event object.
    };
    const sortedEvents = config.events.slice().sort((a, b) => a.start - b.start < 0 ? -1 : 1);
    for (let event of sortedEvents) {
      const hasStringDates = typeof event.start === "string" || typeof event.end === "string";
      const missingMethods = !((_a = event._) == null ? void 0 : _a.register) || !event.isOverlapping || !event.delete;
      let datesChanged = false;
      if (!hasStringDates && ((_b = event._) == null ? void 0 : _b.cachedStart) && ((_c = event._) == null ? void 0 : _c.cachedEnd)) {
        datesChanged = event.start.getTime() !== ((_d = event._) == null ? void 0 : _d.cachedStart) || event.end.getTime() !== ((_e = event._) == null ? void 0 : _e.cachedEnd);
      }
      if (hasStringDates || missingMethods || datesChanged) {
        if (!normalizeEventDates(event)) continue;
        injectMetaData(event);
        event._.cachedStart = event.start.getTime();
        event._.cachedEnd = event.end.getTime();
      }
      events2.byId[event._.id] = event;
      if (event.recurring) {
        events2.recurring.push(event._.id);
      } else if (!dateUtils.isSameDate(event.start, new Date(event.end.getTime() - 1))) {
        event._.multiday = config.multidayEvents;
        if (!config.multidayEvents) {
          console.info("Vue Cal: Multi-day events provided without being enabled. Truncating event end to next midnight.");
          event.end = new Date(new Date(event.start).setHours(23, 59, 59, 999));
          injectMetaData(event);
        } else events2.multiday.push(event._.id);
        if (!events2.byDate[event._.startFormatted]) events2.byDate[event._.startFormatted] = [];
        events2.byDate[event._.startFormatted].push(event._.id);
      } else {
        if (!events2.byDate[event._.startFormatted]) events2.byDate[event._.startFormatted] = [];
        events2.byDate[event._.startFormatted].push(event._.id);
        const year2 = event._.startFormatted.substring(0, 4);
        const month2 = event._.startFormatted.substring(5, 7);
        const day2 = event._.startFormatted.substring(8, 10);
        if (!events2.byYear[year2]) events2.byYear[year2] = {};
        if (!events2.byYear[year2][month2]) events2.byYear[year2][month2] = {};
        if (!events2.byYear[year2][month2][day2]) events2.byYear[year2][month2][day2] = [];
        events2.byYear[year2][month2][day2].push(event._.id);
      }
    }
    return events2;
  });
  const normalizeEventDates = (event) => {
    if (!event.start || !event.end) {
      console.error("Vue Cal: Event is missing start or end date", event);
      return false;
    }
    if (typeof event.start === "string") event.start = dateUtils.stringToDate(event.start);
    if (typeof event.end === "string") event.end = dateUtils.stringToDate(event.end);
    event.start.setSeconds(0, 0);
    if (event.end.getSeconds() === 59) event.end.setMinutes(event.end.getMinutes() + 1, 0, 0);
    else event.end.setSeconds(0, 0);
    if (isNaN(event.start) || isNaN(event.end) || event.end.getTime() < event.start.getTime()) {
      if (isNaN(event.start)) console.error(`Vue Cal: invalid start date for event "${event.title}".`, event.start);
      else if (isNaN(event.end)) console.error(`Vue Cal: invalid end date for event "${event.title}".`, event.end);
      else console.error(`Vue Cal: invalid event dates for event "${event.title}". The event ends before it starts.`, event.start, event.end);
      return false;
    }
    return true;
  };
  const injectMetaData = (event) => {
    if (!event._) event._ = {};
    event._.id = event._.id || ++uid;
    event._.multiday = !dateUtils.isSameDate(event.start, new Date(event.end.getTime() - 1));
    event._.startFormatted = dateUtils.formatDate(event.start);
    event._.endFormatted = dateUtils.formatDate(event.end);
    event._.startMinutes = ~~dateUtils.dateToMinutes(event.start);
    event._.endMinutes = ~~dateUtils.dateToMinutes(event.end);
    const startHours = event.start.getHours();
    const startMinutes = event.start.getMinutes().toString().padStart(2, 0);
    const endHours = event.end.getHours();
    const endMinutes = event.end.getMinutes().toString().padStart(2, 0);
    event._.startTimeFormatted24 = `${startHours.toString().padStart(2, 0)}:${startMinutes}`;
    event._.startTimeFormatted12 = `${startHours % 12 || 12}${startMinutes ? `:${startMinutes}` : ""} ${startHours < 12 ? "AM" : "PM"}`;
    event._.endTimeFormatted24 = `${endHours.toString().padStart(2, 0)}:${endMinutes}`;
    event._.endTimeFormatted12 = `${endHours % 12 || 12}${endMinutes ? `:${endMinutes}` : ""} ${endHours < 12 ? "AM" : "PM"}`;
    event._.duration = Math.abs(~~((event.end - event.start) / 6e4));
    if (!event.delete) {
      event.delete = function(forcedStage) {
        return deleteEvent2(this._.id, forcedStage);
      };
    }
    if (event._.deleting === void 0) event._.deleting = false;
    if (event._.deleted === void 0) event._.deleted = false;
    if (!event.isOverlapping) {
      event.isOverlapping = function(at = null) {
        return this.getOverlappingEvents(at).length;
      };
    }
    if (!event.getOverlappingEvents) {
      event.getOverlappingEvents = function(at = null) {
        var _a;
        const eventStart = (at == null ? void 0 : at.start) || this.start;
        const eventEnd = (at == null ? void 0 : at.end) || this.end;
        const eventSchedule = ((_a = config.schedules) == null ? void 0 : _a.length) ? ~~((at == null ? void 0 : at.schedule) || this.schedule) : null;
        return getEventsInRange(eventStart, eventEnd, { excludeIds: [this._.id], schedule: eventSchedule });
      };
    }
    if (!event._.register) {
      event._.register = (domNode) => {
        event._.$el = domNode;
        if (event._.fireCreated) {
          vuecal.emit("event-created", event);
          delete event._.fireCreated;
        }
      };
    }
    if (!event._.unregister) {
      event._.unregister = () => {
        event._.$el = null;
        event._.register = null;
        event.isOverlapping = null;
        event.getOverlappingEvents = null;
        event.delete = null;
      };
    }
  };
  const getEvent = (id) => events.value.byId[id];
  const getViewEvents = (cellDates) => {
    const events2 = [];
    for (const { start, end } of cellDates) {
      const eventsByDate = getEventsInRange(start, end);
      if (eventsByDate.length) events2.push(...eventsByDate);
    }
    return events2;
  };
  const createEvent2 = (newEvent) => {
    if (!newEvent.start || !newEvent.end) {
      console.error("Vue Cal: Cannot create an event without valid start and end dates.");
      return;
    }
    if (config.snapToInterval) {
      dateUtils.snapToInterval(newEvent.start, config.snapToInterval);
      dateUtils.snapToInterval(newEvent.end, config.snapToInterval);
    }
    newEvent = { ...newEvent };
    if (!newEvent._) newEvent._ = {};
    newEvent._.id = ++uid;
    newEvent._.fireCreated = true;
    config.events.push(newEvent);
    return newEvent;
  };
  const deleteEvent2 = async (eventIdOrCriteria, forcedStage = 0) => {
    var _a, _b;
    if (!eventIdOrCriteria) return console.warn("Vue Cal: Cannot delete event without its ID or criteria.");
    let eventId = typeof eventIdOrCriteria === "string" || !isNaN(eventIdOrCriteria) ? eventIdOrCriteria : null;
    const eventCriteria = typeof eventIdOrCriteria === "object" ? Object.entries(eventIdOrCriteria) : null;
    if (eventCriteria) {
      const [criteriaKey, criteriaValue] = eventCriteria[0];
      eventId = (_a = config.events.find((event2) => event2[criteriaKey] === criteriaValue)) == null ? void 0 : _a._.id;
    }
    if (!config.editableEvents.delete) {
      return console.info("Vue Cal: Event deletion is disabled. Enable it with the `editable-events` props.");
    }
    if (!eventId) return console.warn("Vue Cal: Cannot delete event without its ID.");
    const index = config.events.findIndex((item) => item._.id === eventId);
    if (index === -1) return console.warn(`Vue Cal: Cannot delete unknown event \`${eventId}\`.`);
    const event = config.events[index];
    if (event.deletable === false) return console.warn(`Vue Cal: Can't delete event \`${eventId}\` since it was explicitely set to \`delete: false\`.`);
    switch (forcedStage) {
      case 0:
        if (!event._.deleting) event._.deleting = true;
        else config.events.splice(index, 1);
        break;
      // Display the delete button.
      case 1:
        event._.deleting = true;
        break;
      // Visual deletion + external DOM event firing.
      // When explicitly using this stage, the event will be visually deleted but still present in the
      // source of truth until the cell is unmounted (by navigating away).
      case 2:
        event._.deleted = true;
        config.events[index]._.deleted = true;
        (_b = event._.$el) == null ? void 0 : _b.dispatchEvent(new CustomEvent("event-deleted", { detail: event._.id }));
        break;
      // Effective deletion from the source of truth (by default, when unmounting the cell).
      case 3:
        config.events.splice(index, 1);
        vuecal.emit("update:events", config.events);
        vuecal.emit("event-delete", event);
        break;
    }
    return true;
  };
  const getCellOverlappingEvents = (cellStart, cellEnd, allDay2) => {
    const allDayFilter = config.allDayEvents ? { allDay: allDay2 } : {};
    const cellEvents = getEventsInRange(cellStart, cellEnd, { background: false, ...allDayFilter });
    if (!cellEvents.length) return { cellOverlaps: {}, longestStreak: 0 };
    const cellOverlaps = {};
    let activeEvents = [];
    let maxConcurrent = 0;
    cellEvents.sort((a, b) => a.start - b.start || a.end - a.start - (b.end - b.start));
    for (const e of cellEvents) {
      const id = e._.id;
      if (!cellOverlaps[id]) cellOverlaps[id] = { overlaps: /* @__PURE__ */ new Set(), maxConcurrent: 1, position: 0 };
      activeEvents = activeEvents.filter((active) => active.end > e.start);
      const currentOverlaps = activeEvents.filter((active) => {
        var _a;
        const sameSchedule = !((_a = config.schedules) == null ? void 0 : _a.length) || e.schedule === active.schedule;
        return sameSchedule && active.start < e.end;
      });
      const takenPositions = new Set(currentOverlaps.map((ev) => {
        var _a;
        return ((_a = cellOverlaps[ev._.id]) == null ? void 0 : _a.position) ?? 0;
      }));
      let position = 0;
      while (takenPositions.has(position)) position++;
      cellOverlaps[id].position = position;
      activeEvents.push(e);
      const inheritedMax = Math.max(1, ...currentOverlaps.map((ev) => {
        var _a;
        return ((_a = cellOverlaps[ev._.id]) == null ? void 0 : _a.maxConcurrent) ?? 1;
      }));
      cellOverlaps[id].maxConcurrent = Math.max(currentOverlaps.length + 1, inheritedMax);
      for (const activeEvent of currentOverlaps) {
        cellOverlaps[activeEvent._.id].overlaps.add(id);
        cellOverlaps[id].overlaps.add(activeEvent._.id);
        cellOverlaps[activeEvent._.id].maxConcurrent = cellOverlaps[id].maxConcurrent;
      }
      maxConcurrent = Math.max(maxConcurrent, cellOverlaps[id].maxConcurrent);
    }
    for (const id in cellOverlaps) cellOverlaps[id].overlaps = [...cellOverlaps[id].overlaps];
    return { cellOverlaps, longestStreak: maxConcurrent };
  };
  const getEventsInRange = (start, end, { excludeIds = [], schedule = null, background = true, allDay: allDay2 = false } = {}) => {
    if (!Object.keys(events.value.byId).length) return [];
    const startYear = start.getFullYear();
    const endYear = end.getFullYear();
    const startMonth = start.getMonth() + 1;
    const endMonth = end.getMonth() + 1;
    const startDay = start.getDate();
    const endDay = end.getDate();
    start.getTime();
    end.getTime();
    const rangeStartTimestamp = new Date(start).setHours(0, 0, 0, 0);
    const rangeEndTimestamp = new Date(end).setHours(23, 59, 59, 999);
    const excludeSet = new Set(excludeIds);
    const eventsArray = [];
    if (Object.keys(events.value.byId).length <= 100) {
      for (const event of Object.values(events.value.byId)) {
        if (!event || excludeSet.has(event._.id)) continue;
        if (schedule !== null && schedule !== event.schedule) continue;
        if (background === false && event.background) continue;
        if (config.allDayEvents && (allDay2 && !event.allDay || !allDay2 && event.allDay)) continue;
        if (event.start.getTime() < rangeEndTimestamp && event.end.getTime() > rangeStartTimestamp) eventsArray.push(event);
      }
      return eventsArray;
    }
    for (let year2 = startYear; year2 <= endYear; year2++) {
      const yearStr = `${year2}`;
      const months2 = events.value.byYear[yearStr];
      if (!months2) continue;
      const monthFrom = year2 === startYear ? startMonth : 1;
      const monthTo = year2 === endYear ? endMonth : 12;
      for (let month2 = monthFrom; month2 <= monthTo; month2++) {
        const monthStr = String(month2).padStart(2, "0");
        const days2 = months2[monthStr];
        if (!days2) continue;
        for (const dayStr in days2) {
          const day2 = +dayStr;
          if (day2 > endDay || day2 < startDay) continue;
          const dayEventIds = days2[dayStr];
          if (!(dayEventIds == null ? void 0 : dayEventIds.length)) continue;
          for (let i = 0; i < dayEventIds.length; i++) {
            const e = events.value.byId[dayEventIds[i]];
            if (!e || excludeSet.has(e._.id)) continue;
            if (schedule !== null && schedule !== e.schedule) continue;
            if (background === false && e.background) continue;
            if (config.allDayEvents && (allDay2 && !e.allDay || !allDay2 && e.allDay)) continue;
            if (e.start.getTime() < rangeEndTimestamp && e.end.getTime() > rangeStartTimestamp) eventsArray.push(e);
          }
        }
      }
    }
    return eventsArray;
  };
  const isEventInRange = (event, start, end) => {
    const allDayOrTimeless = event.allDay || !config.time;
    const startTimestamp = allDayOrTimeless ? new Date(event.start).setHours(0, 0, 0, 0) : event.start.getTime();
    const endTimestamp = allDayOrTimeless ? new Date(event.end).setHours(23, 59, 59, 999) : event.end.getTime();
    const rangeStart = allDayOrTimeless ? new Date(start).setHours(0, 0, 0, 0) : start.getTime();
    const rangeEnd = allDayOrTimeless ? new Date(end).setHours(23, 59, 59, 999) : end.getTime();
    return endTimestamp > rangeStart && startTimestamp < rangeEnd;
  };
  const resizeState = reactive({
    isResizing: false,
    fromResizer: false,
    resizingEvent: null,
    resizingOriginalEvent: null,
    resizingLastAcceptedEvent: null,
    startX: 0,
    startY: 0,
    startPercentageX: 0,
    startPercentageY: 0,
    moveX: 0,
    moveY: 0,
    movePercentageX: 0,
    movePercentageY: 0,
    documentMouseX: 0,
    documentMouseY: 0,
    resizeStartDate: null,
    cellEl: null,
    schedule: null
  });
  const computeEventStartEnd = (event, cellStart) => {
    var _a, _b, _c;
    let minutes = percentageToMinutes(resizeState.movePercentageY, config);
    minutes = Math.max(0, Math.min(minutes, 24 * 60));
    if (config.snapToInterval) {
      const plusHalfSnapTime = minutes + config.snapToInterval / 2;
      minutes = plusHalfSnapTime - plusHalfSnapTime % config.snapToInterval;
    }
    let newStart = event.start;
    let newEnd = new Date(cellStart.getTime() + minutes * 6e4);
    if (resizeState.moveX && ((_a = vuecal.touch) == null ? void 0 : _a.currentHoveredCell) && resizeState.cellEl) {
      (_c = (_b = vuecal.touch.currentHoveredCell) == null ? void 0 : _b.dataset) == null ? void 0 : _c.cellStart;
    }
    if (newEnd < resizeState.resizeStartDate) {
      newStart = newEnd;
      newEnd = resizeState.resizeStartDate;
    }
    return { newStart, newEnd };
  };
  const onDocumentMousemove = async (e) => {
    var _a, _b, _c, _d, _e, _f, _g;
    const { clientX, clientY } = ((_a = e.touches) == null ? void 0 : _a[0]) || e;
    if (resizeState.fromResizer && !((_b = vuecal.touch) == null ? void 0 : _b.isResizingEvent)) {
      resizeState.resizingOriginalEvent = { ...resizeState.resizingEvent, _: { ...resizeState.resizingEvent._ } };
      vuecal.touch.isResizingEvent = true;
      const eventListeners = ((_c = config.eventListeners) == null ? void 0 : _c.event) || {};
      (_d = eventListeners["resize-start"]) == null ? void 0 : _d.call(eventListeners, { e, event: resizeState.resizingEvent });
    }
    if (resizeState.cellEl) {
      const { top, left, width, height } = resizeState.cellEl.getBoundingClientRect();
      resizeState.moveX = clientX - left;
      resizeState.moveY = clientY - top;
      resizeState.movePercentageX = resizeState.moveX * 100 / width;
      resizeState.movePercentageY = resizeState.moveY * 100 / height;
    }
    resizeState.documentMouseX = clientX;
    resizeState.documentMouseY = clientY;
    if (resizeState.fromResizer && resizeState.resizingEvent) {
      const cellStartTs = (_f = (_e = resizeState.cellEl) == null ? void 0 : _e.dataset) == null ? void 0 : _f.cellStart;
      if (!cellStartTs) return;
      const cellStart = new Date(Number(cellStartTs));
      const { newStart, newEnd } = computeEventStartEnd(resizeState.resizingEvent, cellStart);
      let acceptResize = true;
      const { resize: resizeEventHandler } = ((_g = config.eventListeners) == null ? void 0 : _g.event) || {};
      if (resizeEventHandler) {
        acceptResize = await resizeEventHandler({
          e,
          event: { ...resizeState.resizingEvent, start: newStart, end: newEnd },
          overlaps: resizeState.resizingEvent.getOverlappingEvents({ start: newStart, end: newEnd })
        });
      }
      if (acceptResize !== false) {
        resizeState.resizingEvent.start = newStart;
        resizeState.resizingEvent.end = newEnd;
        if (resizeState.resizingLastAcceptedEvent) resizeState.resizingLastAcceptedEvent = null;
        e.preventDefault();
      } else {
        if (resizeEventHandler) resizeState.resizingLastAcceptedEvent = { ...resizeState.resizingEvent, _: { ...resizeState.resizingEvent._ } };
      }
    }
  };
  const onDocumentMouseup = async (e) => {
    var _a, _b, _c, _d, _e, _f;
    if (((_a = vuecal.touch) == null ? void 0 : _a.isResizingEvent) && resizeState.resizingEvent) {
      const cellStartTs = (_c = (_b = resizeState.cellEl) == null ? void 0 : _b.dataset) == null ? void 0 : _c.cellStart;
      if (!cellStartTs) return;
      const cellStart = new Date(Number(cellStartTs));
      const { newStart, newEnd } = computeEventStartEnd(resizeState.resizingEvent, cellStart);
      let acceptResize = true;
      const eventListeners = ((_d = config.eventListeners) == null ? void 0 : _d.event) || {};
      const resizeEndHandler = eventListeners["resize-end"];
      if (resizeEndHandler) {
        acceptResize = await resizeEndHandler({
          e,
          event: resizeState.resizingEvent,
          original: resizeState.resizingOriginalEvent,
          // Original event details before resizing.
          overlaps: resizeState.resizingEvent.getOverlappingEvents({ start: newStart, end: newEnd })
        });
      }
      resizeState.resizingEvent.start = acceptResize === false ? (resizeState.resizingLastAcceptedEvent || resizeState.resizingOriginalEvent).start : ((_e = resizeState.resizingLastAcceptedEvent) == null ? void 0 : _e.start) || newStart;
      resizeState.resizingEvent.end = acceptResize === false ? (resizeState.resizingLastAcceptedEvent || resizeState.resizingOriginalEvent).end : ((_f = resizeState.resizingLastAcceptedEvent) == null ? void 0 : _f.end) || newEnd;
      if (resizeState.resizingEvent._.duration < 1) {
        resizeState.resizingEvent.start = resizeState.resizingOriginalEvent.start;
        resizeState.resizingEvent.end = resizeState.resizingOriginalEvent.end;
      }
      vuecal.touch.isResizingEvent = false;
      vuecal.touch.currentHoveredCell = null;
    }
    document.removeEventListener(e.type === "touchend" ? "touchmove" : "mousemove", onDocumentMousemove, { passive: !resizeState.fromResizer });
    vuecal.touch.isResizingEvent = false;
    resizeState.fromResizer = false;
    resizeState.resizingEvent = null;
    resizeState.resizingOriginalEvent = null;
    resizeState.resizingLastAcceptedEvent = null;
    resizeState.startX = 0;
    resizeState.startY = 0;
    resizeState.moveX = 0;
    resizeState.moveY = 0;
    resizeState.startPercentageX = 0;
    resizeState.startPercentageY = 0;
    resizeState.movePercentageX = 0;
    resizeState.movePercentageY = 0;
    resizeState.documentMouseX = 0;
    resizeState.documentMouseY = 0;
    resizeState.cellEl = null;
    resizeState.resizeStartDate = null;
    resizeState.schedule = null;
  };
  const handleEventResize = (e, event, eventEl) => {
    var _a;
    const domEvent = ((_a = e.touches) == null ? void 0 : _a[0]) || e;
    resizeState.fromResizer = !!domEvent.target.closest(".vuecal__event-resizer");
    if (resizeState.fromResizer) {
      const rect = eventEl.getBoundingClientRect();
      resizeState.startX = domEvent.clientX - rect.left;
      resizeState.startY = domEvent.clientY - rect.top;
      resizeState.startPercentageX = resizeState.startX * 100 / rect.width;
      resizeState.startPercentageY = resizeState.startY * 100 / rect.height;
      resizeState.cellEl = eventEl.closest(".vuecal__cell");
      resizeState.resizeStartDate = event.start;
      resizeState.resizingEvent = event;
      document.addEventListener(e.type === "touchstart" ? "touchmove" : "mousemove", onDocumentMousemove, { passive: !resizeState.fromResizer });
      document.addEventListener(e.type === "touchstart" ? "touchend" : "mouseup", onDocumentMouseup, { once: true });
    }
  };
  return {
    events,
    resizeState,
    getEvent,
    getViewEvents,
    getCellOverlappingEvents,
    getEventsInRange,
    createEvent: createEvent2,
    deleteEvent: deleteEvent2,
    isEventInRange,
    handleEventResize
  };
};
const useView = ({ config, dateUtils, emit, texts, eventsManager }, vuecalEl) => {
  const { availableViews } = config;
  const viewId = ref(config.view && availableViews[config.view] ? config.view : config.defaultView);
  const selectedDate = ref(config.selectedDate || null);
  const now = ref(/* @__PURE__ */ new Date());
  const viewDate = ref(new Date(config.viewDate || now.value));
  viewDate.value.setHours(0, 0, 0, 0);
  const startTheoretical = ref(new Date(viewDate));
  let timeTickerId = null;
  const start = computed(() => {
    if (viewId.value === "month") return startTheoretical.value;
    return firstCellDate.value;
  });
  const end = computed(() => {
    if (viewId.value === "month") return new Date(startTheoretical.value.getFullYear(), startTheoretical.value.getMonth() + 1, 0, 23, 59, 59, 999);
    return lastCellDate.value;
  });
  const extendedStart = computed(() => {
    if (viewId.value === "week") return dateUtils.getPreviousFirstDayOfWeek(firstCellDate.value, config.startWeekOnSunday);
    if (viewId.value === "month") return firstCellDate.value;
    return start.value;
  });
  const extendedEnd = computed(() => {
    if (viewId.value === "week") {
      const endWeek = dateUtils.addDays(extendedStart.value, 7);
      endWeek.setMilliseconds(-1);
      return endWeek;
    }
    if (viewId.value === "month") return lastCellDate.value;
    return end.value;
  });
  const containsToday = computed(() => {
    const nowTime = now.value.getTime();
    if (viewId.value === "week") {
      return extendedStart.value.getTime() <= nowTime && nowTime <= extendedEnd.value.getTime();
    }
    const firstCellTime = firstCellDate.value.getTime();
    const lastCellTime = lastCellDate.value.getTime();
    return firstCellTime <= nowTime && nowTime <= lastCellTime;
  });
  function timeTick() {
    now.value = /* @__PURE__ */ new Date();
    timeTickerId = setTimeout(timeTick, 60 * 1e3);
  }
  function initTimeTicker() {
    timeTickerId = setTimeout(timeTick, (60 - (/* @__PURE__ */ new Date()).getSeconds()) * 1e3);
    timeTick();
  }
  const cols = computed(() => {
    if (!config.availableViews[viewId.value]) return 1;
    let cols2 = config.availableViews[viewId.value].cols;
    if (config.hasHiddenDays && ["week", "month"].includes(viewId.value)) cols2 -= config.hasHiddenDays;
    return cols2;
  });
  const rows = computed(() => {
    var _a;
    return ((_a = config.availableViews[viewId.value]) == null ? void 0 : _a.rows) || 1;
  });
  const cellsCount = computed(() => cols.value * rows.value);
  const firstCellDate = computed(() => {
    if (viewId.value === "month") {
      let weekday = startTheoretical.value.getDay() || 7;
      if (config.startWeekOnSunday && !config.hideWeekdays[7]) weekday += 1;
      if (config.viewDayOffset) weekday -= config.viewDayOffset;
      return dateUtils.subtractDays(startTheoretical.value, weekday - 1);
    }
    if (viewId.value === "week") {
      const visibleDays = "1234567".split("").filter((day2) => !Object.keys(config.hideWeekdays).includes(day2));
      let firstVisibleDay = Math.min(...visibleDays);
      if (config.startWeekOnSunday && !config.hideWeekdays[7]) firstVisibleDay = 1;
      if (config.viewDayOffset) firstVisibleDay += config.viewDayOffset;
      return dateUtils.addDays(startTheoretical.value, firstVisibleDay - 1);
    }
    return startTheoretical.value;
  });
  const cellDates = computed(() => {
    const dates = [];
    const isDaysWeekOrMonthView = ["days", "week", "month"].includes(viewId.value);
    let modifier = 0;
    for (let i = 0; i < cellsCount.value + modifier; i++) {
      switch (viewId.value) {
        case "day":
        case "days":
        case "week":
        case "month": {
          const start2 = dateUtils.addDays(firstCellDate.value, i);
          const weekday = start2.getDay() || 7;
          if (isDaysWeekOrMonthView && config.hasHiddenDays && config.hideWeekdays[weekday]) {
            modifier++;
            continue;
          }
          const end2 = new Date(start2);
          end2.setHours(23, 59, 59, 999);
          dates.push({ start: start2, startFormatted: dateUtils.formatDate(start2), end: end2 });
          break;
        }
        case "year":
          dates.push({
            start: new Date(firstCellDate.value.getFullYear(), i, 1, 0, 0, 0, 0),
            end: new Date(firstCellDate.value.getFullYear(), i + 1, 0, 23, 59, 59, 999)
          });
          break;
        case "years":
          dates.push({
            start: new Date(firstCellDate.value.getFullYear() + i, 0, 1, 0, 0, 0, 0),
            end: new Date(firstCellDate.value.getFullYear() + i + 1, 0, 0, 23, 59, 59, 999)
          });
          break;
      }
    }
    return dates;
  });
  const lastCellDate = computed(() => cellDates.value[cellDates.value.length - 1].end);
  const transitionDirection = ref("right");
  const broaderView = computed(() => {
    const availableViews2 = Object.keys(config.availableViews);
    return availableViews2[availableViews2.indexOf(viewId.value) + 1];
  });
  const narrowerView = computed(() => {
    const availableViews2 = Object.keys(config.availableViews);
    return availableViews2[availableViews2.indexOf(viewId.value) - 1];
  });
  function getMonthName(monthIndex, monthsArray, shouldTruncate = false) {
    if (!monthsArray || !monthsArray[monthIndex]) return monthIndex + 1;
    const name = monthsArray[monthIndex];
    return shouldTruncate && typeof name === "string" ? name.substring(0, 3) : name;
  }
  function formatDateRange(start2, end2, options) {
    const { monthsArray, monthBeforeDay, canTruncate, xs } = options;
    const startMonth = start2.getMonth();
    const startYear = start2.getFullYear();
    const endMonth = end2.getMonth();
    const endYear = end2.getFullYear();
    const crossingMonth = startMonth !== endMonth;
    const crossingYear = startYear !== endYear;
    const shouldTruncate = canTruncate && (xs || crossingMonth);
    const startDay = start2.getDate();
    const endDay = end2.getDate();
    if (crossingYear) {
      if (monthBeforeDay) return `${getMonthName(startMonth, monthsArray, shouldTruncate)} ${startDay}, ${startYear} - ${getMonthName(endMonth, monthsArray, shouldTruncate)} ${endDay}, ${endYear}`;
      return `${startDay} ${getMonthName(startMonth, monthsArray, shouldTruncate)} ${startYear} - ${endDay} ${getMonthName(endMonth, monthsArray, shouldTruncate)} ${endYear}`;
    }
    if (crossingMonth) {
      if (monthBeforeDay) return `${getMonthName(startMonth, monthsArray, shouldTruncate)} ${startDay} - ${getMonthName(endMonth, monthsArray, shouldTruncate)} ${endDay}, ${startYear}`;
      return `${startDay} ${getMonthName(startMonth, monthsArray, shouldTruncate)} - ${endDay} ${getMonthName(endMonth, monthsArray, shouldTruncate)} ${startYear}`;
    }
    if (monthBeforeDay) return `${getMonthName(startMonth, monthsArray, shouldTruncate)} ${startDay}-${endDay}, ${startYear}`;
    return `${startDay}-${endDay} ${getMonthName(startMonth, monthsArray, shouldTruncate)} ${startYear}`;
  }
  const title = computed(() => {
    const { dateFormat: dateFormat2, months: months2, monthsGenitive, week: weekText, truncations } = texts;
    const locale = config.locale;
    const canTruncate = truncations !== false;
    const monthBeforeDay = dateFormat2.indexOf("M") < dateFormat2.indexOf("D");
    const monthsArray = monthsGenitive && locale === "el" ? monthsGenitive : months2;
    switch (viewId.value) {
      case "day":
        return dateUtils.formatDate(firstCellDate.value, dateFormat2);
      case "days":
      case "week": {
        const options = {
          monthsArray,
          monthBeforeDay,
          canTruncate,
          xs: config.xs
        };
        let result = formatDateRange(firstCellDate.value, lastCellDate.value, options);
        if (viewId.value === "week") {
          const weekNumber = dateUtils.getWeek(
            firstCellDate.value,
            config.startWeekOnSunday && !config.hideWeekdays[7]
          );
          result += ` <small>${weekText} ${weekNumber}</small>`;
        }
        return result;
      }
      case "month": {
        const format = `${config.xs && canTruncate ? "MMM" : "MMMM"} YYYY`;
        return dateUtils.formatDate(start.value, format);
      }
      case "year":
        return firstCellDate.value.getFullYear();
      case "years":
        return `${firstCellDate.value.getFullYear()} - ${end.value.getFullYear()}`;
    }
  });
  async function updateView() {
    startTheoretical.value = new Date(viewDate.value || now.value);
    startTheoretical.value.setHours(0, 0, 0, 0);
    switch (viewId.value) {
      case "day":
        break;
      case "days":
        break;
      case "week":
        startTheoretical.value = dateUtils.getPreviousFirstDayOfWeek(startTheoretical.value, config.startWeekOnSunday && !config.hideWeekdays[7]);
        break;
      case "month":
        startTheoretical.value = new Date(startTheoretical.value.getFullYear(), startTheoretical.value.getMonth(), 1, 0, 0, 0, 0);
        break;
      case "year":
        startTheoretical.value = new Date(startTheoretical.value.getFullYear(), 0, 1, 0, 0, 0, 0);
        break;
      case "years":
        startTheoretical.value = new Date(startTheoretical.value.getFullYear() - startTheoretical.value.getFullYear() % cellsCount.value, 0, 1, 0, 0, 0, 0);
        break;
    }
    now.value = /* @__PURE__ */ new Date();
    if (config.ready) {
      await nextTick();
      emit("view-change", {
        id: viewId.value,
        title: title.value,
        start: start.value,
        end: end.value,
        extendedStart: extendedStart.value,
        extendedEnd: extendedEnd.value,
        cellDates: cellDates.value,
        containsToday: containsToday.value,
        events: events.value
      });
    }
  }
  function updateViewIfNeeded(views) {
    const currView = viewId.value;
    const currViewLayout = config.availableViews[currView];
    if (!(views[currView] && JSON.stringify(views[currView]) === JSON.stringify(currViewLayout))) {
      updateView();
    }
  }
  function switchView(id, emitUpdate = true, date = null) {
    const availableViews2 = Object.keys(config.availableViews);
    if (viewId.value === id && !date) return;
    if (availableViews2.includes(id)) {
      transitionDirection.value = availableViews2.indexOf(id) < availableViews2.indexOf(viewId.value) ? "left" : "right";
      if (emitUpdate && viewId.value !== id) emit("update:view", id);
      viewId.value = id;
      if (date) updateViewDate(date);
      else updateView();
    } else !!console.warn(`Vue Cal: the \`${id}\` view is not available.`);
  }
  function switchToBroaderView() {
    if (broaderView.value) switchView(broaderView.value);
    else console.warn("Vue Cal: no broader view is available.");
  }
  function switchToNarrowerView() {
    if (narrowerView.value) switchView(narrowerView.value);
    else console.warn("Vue Cal: no narrower view is available.");
  }
  function previous() {
    navigate(false);
  }
  function next() {
    navigate(true);
  }
  function navigate(forward = true) {
    let newViewDate = new Date(viewDate.value);
    switch (viewId.value) {
      case "day":
      case "days":
        if (forward) newViewDate = dateUtils.addDays(lastCellDate.value, 1);
        else newViewDate = dateUtils.subtractDays(firstCellDate.value, cellsCount.value);
        break;
      case "week": {
        if (forward) {
          newViewDate = dateUtils.addDays(extendedEnd.value, 1);
          newViewDate.setHours(0, 0, 0, 0);
        } else newViewDate = dateUtils.subtractDays(extendedStart.value, cellsCount.value);
        break;
      }
      case "month": {
        const increment = forward ? 1 : -1;
        newViewDate = new Date(newViewDate.getFullYear(), newViewDate.getMonth() + increment, 1, 0, 0, 0, 0);
        break;
      }
      case "year": {
        const increment = forward ? 1 : -1;
        newViewDate = new Date(newViewDate.getFullYear() + increment, 1, 1, 0, 0, 0, 0);
        break;
      }
      case "years": {
        const increment = forward ? cellsCount.value : -cellsCount.value;
        newViewDate = new Date(newViewDate.getFullYear() + increment, 1, 1, 0, 0, 0, 0);
        break;
      }
    }
    updateViewDate(newViewDate);
  }
  function goToToday() {
    const today2 = /* @__PURE__ */ new Date();
    today2.setHours(0, 0, 0, 0);
    updateViewDate(today2);
  }
  function updateViewDate(date, emitUpdate = true, forceUpdate = false) {
    if (!dateUtils.isValid(date)) return console.warn("Vue Cal: can't navigate to the given date: invalid date provided to `updateViewDate(date)`.");
    let [viewStart, viewEnd] = [firstCellDate.value, lastCellDate.value];
    if (viewId.value === "month") [viewStart, viewEnd] = [start.value, end.value];
    if (!dateUtils.isInRange(date, viewStart, viewEnd) || forceUpdate) {
      date.setHours(0, 0, 0, 0);
      transitionDirection.value = date.getTime() < viewStart.getTime() ? "left" : "right";
      viewDate.value = date;
      if (emitUpdate) emit("update:viewDate", date);
      updateView();
    }
  }
  function updateSelectedDate(date, emitUpdate = true) {
    if (!dateUtils.isValid(date)) return console.warn("Vue Cal: can't update the selected date: invalid date provided to `updateSelectedDate(date)`.");
    const { isValid, isSameDate: isSameDate2 } = dateUtils;
    if (!selectedDate.value || !isValid(selectedDate.value) || !isSameDate2(date, selectedDate.value)) {
      date.setHours(0, 0, 0, 0);
      selectedDate.value = date;
      if (emitUpdate) emit("update:selectedDate", date);
    }
  }
  function switchWeekStart(bool) {
    if (!bool && !startTheoretical.value.getDay()) updateViewDate(dateUtils.addDays(startTheoretical.value, 1), true, true);
    else {
      transitionDirection.value = "left";
      updateView();
    }
  }
  function toggleWeekends(hide) {
    if (hide && config.startWeekOnSunday && !startTheoretical.value.getDay()) updateViewDate(dateUtils.addDays(startTheoretical.value, 1), true, true);
    else if (!hide && config.startWeekOnSunday && startTheoretical.value.getDay() === 1) updateViewDate(dateUtils.subtractDays(startTheoretical.value, 1), true, true);
  }
  function toggleWeekdays() {
    updateView();
  }
  function scrollToTime(minutes) {
    var _a;
    const scrollableEl = (_a = vuecalEl.value) == null ? void 0 : _a.querySelector(".vuecal__scrollable");
    const anchor = minutes ? minutes * config.timeCellHeight / config.timeStep : 0;
    scrollableEl == null ? void 0 : scrollableEl.scrollTo({ top: anchor, behavior: "smooth" });
  }
  function scrollToCurrentTime() {
    const now2 = /* @__PURE__ */ new Date();
    scrollToTime(now2.getHours() * 60 + now2.getMinutes());
  }
  function scrollTop() {
    scrollToTime(0);
  }
  const events = computed(() => eventsManager.getViewEvents(cellDates.value));
  const createEvent2 = eventsManager.createEvent;
  const deleteEvent2 = eventsManager.deleteEvent;
  watch(() => config.view, (view) => switchView(view, false));
  watch(() => config.availableViews, updateViewIfNeeded);
  watch(() => config.datePicker, () => switchView("month"));
  watch(() => config.viewDate, (date) => updateViewDate(date, false));
  watch(() => config.selectedDate, (date) => updateSelectedDate(date, false));
  watch(() => config.startWeekOnSunday, (bool) => switchWeekStart(bool));
  watch(() => config.hideWeekends, (bool) => toggleWeekends(bool));
  watch(() => config.hideWeekdays, toggleWeekdays);
  watch(() => cellsCount.value, () => {
    if (cellsCount.value > 90) console.warn("Vue Cal: high cell count detected. Performance may degrade when interactions are enabled.");
  });
  watch(() => config.watchRealTime, (watchRealTime) => {
    if (watchRealTime && config.time) initTimeTicker();
    else timeTickerId = clearTimeout(timeTickerId);
  });
  updateView();
  if (config.time && config.watchRealTime) initTimeTicker();
  onBeforeUnmount(() => timeTickerId = clearTimeout(timeTickerId));
  return {
    now,
    id: viewId,
    broaderView,
    narrowerView,
    title,
    viewDate,
    start,
    end,
    extendedStart,
    // Full range, including out of scope month days, and hidden leading/trailing days.
    extendedEnd,
    // Full range, including out of scope month days, and hidden leading/trailing days.
    firstCellDate,
    lastCellDate,
    containsToday,
    selectedDate,
    cellDates,
    cols,
    rows,
    // All the events are stored and indexed in the events object of the eventsManager.
    // The following events array is only a subset of visible ones, plus any potential recurring
    // and multi-day events.
    events,
    transitionDirection,
    switch: (id, date) => switchView(id, true, date),
    broader: switchToBroaderView,
    narrower: switchToNarrowerView,
    previous,
    next,
    navigate,
    goToToday,
    updateViewDate,
    updateSelectedDate,
    scrollToCurrentTime,
    scrollToTime,
    scrollTop,
    createEvent: createEvent2,
    deleteEvent: deleteEvent2,
    // Getters.
    get isDay() {
      return viewId.value === "day";
    },
    get isDays() {
      return viewId.value === "days";
    },
    get isWeek() {
      return viewId.value === "week";
    },
    get isMonth() {
      return viewId.value === "month";
    },
    get isYear() {
      return viewId.value === "year";
    },
    get isYears() {
      return viewId.value === "years";
    }
  };
};
const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const years = "Years";
const year = "Year";
const month = "Month";
const week = "Week";
const days = "Days";
const day = "Day";
const today = "Today";
const noEvent = "No Event";
const allDay = "All-day";
const deleteEvent = "Delete";
const createEvent = "Create an event";
const dateFormat = "dddd, MMMM D, YYYY";
const am = "am";
const pm = "pm";
const EnUs = {
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
  dateFormat,
  am,
  pm
};
const enUs = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  allDay,
  am,
  createEvent,
  dateFormat,
  day,
  days,
  default: EnUs,
  deleteEvent,
  month,
  months,
  noEvent,
  pm,
  today,
  week,
  weekDays,
  year,
  years
}, Symbol.toStringTag, { value: "Module" }));
const globalState = reactive({
  texts: { ...defaults.texts },
  // Make texts reactive before a locale is loaded.
  dateUtils: useDateUtils(defaults.texts, EnUs)
  // Some Date utils functions need localized texts.
});
const useVueCal = ({ props: props2, emit, attrs, vuecalEl, uid }) => {
  const state = reactive({
    uid,
    // The Vuecal instance unique ID, used for dnd source-target identification.
    emit,
    texts: { ...globalState.texts },
    // Make texts reactive before a locale is loaded.
    // The date utils composable.
    // A class/composable is needed in order to access the user locale in all the methods, and
    // independently of other potential Vue Cal instances on the same page.
    dateUtils: { ...globalState.dateUtils },
    now: /* @__PURE__ */ new Date(),
    config: {},
    eventsManager: {},
    view: {},
    // At any time this object will be filled with current view details and visible events.
    dnd: {},
    // Drag and drop module.
    // stores the gesture related states. E.g. dragging event, resizing event, etc.
    touch: {
      isDraggingCell: false,
      isDraggingEvent: false,
      isResizingEvent: false,
      currentHoveredCell: null
      // Track the cell currently being hovered during event resizing.
    }
  });
  state.dateUtils = useDateUtils(Object.assign(defaults.texts, state.texts), EnUs);
  state.config = useConfig(state, props2, attrs);
  state.eventsManager = useEvents(state);
  state.view = useView(state, vuecalEl);
  state.dnd = useDragAndDrop(state);
  return state;
};
const minutesInADay = 24 * 60;
const props = {
  allDayEvents: { type: Boolean, default: false },
  // Display all-day events in a fixed top bar on the day, days & week views.
  stackEvents: { type: Boolean, default: false },
  clickToNavigate: { type: Boolean, default: void 0 },
  // Setting to false will force it off on date-picker.
  dark: { type: Boolean, default: false },
  // Dark theme.
  datePicker: { type: Boolean, default: false },
  // Shorthand for xs: true, views: [month, year, years], clickToNavigate: true.
  disableDays: { type: Array, default: () => [] },
  // Array of specific dates to disable.
  // Can be true false or a finer grain permissions object like:
  // { drag: bool, resize: bool, resizeX: bool, create: bool, delete: bool }
  editableEvents: { type: [Boolean, Object], default: false },
  // Minimum drag distance in pixels to create an event (prevents accidental event creation when trying to navigate).
  eventCreateMinDrag: { type: Number, default: 15 },
  // The minimum drag distance in pixels to create an event.
  // The array of events to display in Vue Cal.
  // Can hold just the view events and be updated or the full array of all events available.
  events: { type: Array, default: () => [] },
  // Displays an events counter in each cell on month view or year view.
  // Can be a boolean or an array of views to display the event count on.
  eventCount: { type: [Boolean, Array], default: false },
  eventsOnMonthView: { type: Boolean, default: false },
  // Displays events in full on month view.
  hideWeekdays: { type: Array, default: () => [] },
  // An array of strings. Possible values: 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'.
  hideWeekends: { type: Boolean, default: false },
  // Show or hide both Saturday and Sunday in days, week and month views.
  // en-us is the default and fallback if locale is not supported.
  // The locale can also be provided externally to avoid using Promises.
  locale: { type: String, default: "" },
  // A language to use for all the texts.
  maxDate: { type: [String, Date], default: "" },
  // Mostly for date pickers, sets a maximum date for cell interactions.
  minDate: { type: [String, Date], default: "" },
  // Mostly for date pickers, sets a minimum date for cell interactions.
  multidayEvents: { type: Boolean, default: true },
  // Allow events to span multiple days.
  // A 2-way binding that highlights the selected date in the calendar but does not navigate to it.
  selectedDate: { type: [String, Date], default: "" },
  // The selected date in the calendar !== viewDate.
  sm: { type: Boolean, default: false },
  // Small size (truncates texts + specific styles).
  specialHours: { type: Object, default: () => ({}) },
  // Highlight a particular time range on each day of the week, individually.
  schedules: { type: Array, default: () => [] },
  // Split a day in different persons/rooms/locations schedules.
  snapToInterval: { type: Number, default: 0 },
  // Snap the event start and end to a specific interval in minutes.
  startWeekOnSunday: { type: Boolean, default: false },
  // Shows Sunday before Monday in days, week and month views.
  theme: { type: [String, Boolean], default: "default" },
  // Only adds a CSS class when set to default.
  time: { type: Boolean, default: true },
  // Show or hide the time column.
  timeAtCursor: { type: Boolean, default: false },
  // Show or hide the "time at cursor" line.
  timeCellHeight: { type: Number, default: 40 },
  // In pixels.
  timeFormat: { type: String, default: "" },
  // Overrides the default time format.
  timeFrom: { type: Number, default: 0 },
  // Start time of the time column, in minutes.
  timeStep: { type: Number, default: 60 },
  // Step amount for the time in the time column, in minutes.
  timeTo: { type: Number, default: minutesInADay },
  // End time of the time column, in minutes.
  titleBar: { type: Boolean, default: true },
  // Show or hide the header title bar.
  todayButton: { type: Boolean, default: true },
  // Show or hide the header today button.
  twelveHour: { type: Boolean, default: false },
  // 12 or 24 hour format are respectively written like 1pm and 13:00.
  // Sets the calendar view to one of: 'day', 'days', 'week', 'month', 'year', 'years'. Default 'week' or 'month' if datePicker.
  // Gets updated on view navigation.
  view: { type: String, default: "" },
  viewDate: { type: [String, Date], default: "" },
  // The view will automatically set its start and end to present this date.
  // Only available for month and day views, this will shift the start of the view (left or right) by x days (signed integer).
  viewDayOffset: { type: Number, default: 0 },
  // The list of all the view that will be available in this calendar.
  // Default for normal layout: ['day', 'days', 'week', 'month', 'year', 'years'] }.
  // Default for date picker layout: ['month', 'year', 'years'].
  views: { type: [Array, Object] },
  viewsBar: { type: Boolean, default: true },
  // Show or hide the headers view selection bar.
  watchRealTime: { type: Boolean, default: false },
  // More expensive, so only trigger on demand.
  weekNumbers: { type: Boolean, default: false },
  // Show the weeks numbers in a column on month view.
  xs: { type: Boolean, default: false }
  // Extra small size for date pickers (truncates texts + specific styles).
  // Temporarily disabled until fully implemented.
  // horizontal: { type: Boolean, default: false } // Show the calendar timeline horizontally.
  // TODO:
  // minEventWidth: { type: Number, default: 0 },
  // minScheduleWidth: { type: Number, default: 0 },
  // overlapsPerTimeStep: { type: Boolean, default: false },
};
const _hoisted_1$5 = { class: "vuecal__header" };
const _hoisted_2$5 = {
  key: 0,
  class: "vuecal__views-bar"
};
const _hoisted_3$4 = ["onClick", "innerHTML"];
const _hoisted_4$4 = {
  key: 1,
  class: "vuecal__title-bar"
};
const _hoisted_5$4 = { class: "vuecal__transition-wrap" };
const _hoisted_6$3 = ["disabled", "innerHTML"];
const _sfc_main$6 = {
  __name: "header",
  setup(__props) {
    const vuecal = inject("vuecal");
    const { view, config } = vuecal;
    const onTitleClick = () => {
      if (config.clickToNavigate) view.broader();
    };
    const titleEventHandlers = computed(() => config.clickToNavigate ? { click: onTitleClick } : {});
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1$5, [
        renderSlot(_ctx.$slots, "header", {
          view: unref(view),
          availableViews: unref(config).availableViews,
          vuecal: unref(vuecal)
        }),
        !_ctx.$slots.header ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
          unref(config).viewsBar ? (openBlock(), createElementBlock("div", _hoisted_2$5, [
            (openBlock(true), createElementBlock(Fragment, null, renderList(unref(config).availableViews, (obj, id) => {
              return openBlock(), createElementBlock("button", {
                class: normalizeClass(["vuecal__view-button", { "vuecal__view-button--active": unref(view).id === id }]),
                onClick: ($event) => unref(view).switch(id),
                innerHTML: unref(vuecal).texts[id],
                type: "button"
              }, null, 10, _hoisted_3$4);
            }), 256))
          ])) : createCommentVNode("", true),
          unref(config).titleBar ? (openBlock(), createElementBlock("nav", _hoisted_4$4, [
            createElementVNode("button", {
              class: normalizeClass(["vuecal__nav vuecal__nav--prev", { "vuecal__nav--default": !_ctx.$slots["previous-button"] }]),
              onClick: _cache[0] || (_cache[0] = (...args) => unref(view).previous && unref(view).previous(...args)),
              type: "button"
            }, [
              renderSlot(_ctx.$slots, "previous-button")
            ], 2),
            createElementVNode("div", _hoisted_5$4, [
              createVNode(Transition, {
                name: `vuecal-slide-fade--${unref(view).transitionDirection}`
              }, {
                default: withCtx(() => [
                  (openBlock(), createElementBlock("div", {
                    key: unref(view).id + unref(view).start.getTime()
                  }, [
                    _ctx.$slots.title || _ctx.$slots[`title.${unref(view).id}`] ? (openBlock(), createBlock(resolveDynamicComponent(unref(config).clickToNavigate && unref(view).broaderView ? "button" : "div"), mergeProps({
                      key: 0,
                      class: "vuecal__title"
                    }, toHandlers(titleEventHandlers.value)), {
                      default: withCtx(() => [
                        _ctx.$slots[`title.${unref(view).id}`] ? renderSlot(_ctx.$slots, `title.${unref(view).id}`, normalizeProps(mergeProps({ key: 0 }, unref(view)))) : renderSlot(_ctx.$slots, "title", normalizeProps(mergeProps({ key: 1 }, unref(view))))
                      ]),
                      _: 3
                    }, 16)) : (openBlock(), createBlock(resolveDynamicComponent(unref(config).clickToNavigate && unref(view).broaderView ? "button" : "div"), mergeProps({
                      key: 1,
                      class: "vuecal__title"
                    }, toHandlers(titleEventHandlers.value), {
                      innerHTML: unref(view).title
                    }), null, 16, ["innerHTML"]))
                  ]))
                ]),
                _: 3
              }, 8, ["name"])
            ]),
            unref(config).todayButton ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
              _ctx.$slots["today-button"] ? renderSlot(_ctx.$slots, "today-button", {
                key: 0,
                navigate: () => !unref(view).containsToday && unref(view).goToToday(),
                active: unref(view).containsToday
              }) : (openBlock(), createElementBlock("button", {
                key: 1,
                class: normalizeClass(["vuecal__nav vuecal__nav--today vuecal__nav--default", { "vuecal__nav--active": unref(view).containsToday }]),
                onClick: _cache[1] || (_cache[1] = ($event) => !unref(view).containsToday && unref(view).goToToday()),
                disabled: !!unref(view).containsToday,
                type: "button",
                innerHTML: unref(vuecal).texts.today
              }, null, 10, _hoisted_6$3))
            ], 64)) : createCommentVNode("", true),
            createElementVNode("button", {
              class: normalizeClass(["vuecal__nav vuecal__nav--next", { "vuecal__nav--default": !_ctx.$slots["next-button"] }]),
              onClick: _cache[2] || (_cache[2] = (...args) => unref(view).next && unref(view).next(...args)),
              type: "button"
            }, [
              renderSlot(_ctx.$slots, "next-button")
            ], 2)
          ])) : createCommentVNode("", true)
        ], 64)) : createCommentVNode("", true)
      ]);
    };
  }
};
const _hoisted_1$4 = ["draggable"];
const _hoisted_2$4 = { class: "vuecal__event-details" };
const _hoisted_3$3 = { class: "vuecal__event-title" };
const _hoisted_4$3 = {
  key: 0,
  class: "vuecal__event-time"
};
const _hoisted_5$3 = {
  key: 0,
  class: "vuecal__event-comma"
};
const _hoisted_6$2 = { class: "vuecal__event-start" };
const _hoisted_7$2 = {
  key: 1,
  class: "vuecal__event-end"
};
const _hoisted_8$2 = { key: 0 };
const _hoisted_9$1 = ["innerHTML"];
const RECT_CACHE_DURATION = 16;
const _sfc_main$5 = {
  __name: "event",
  props: {
    event: { type: Object, required: true },
    inAllDayBar: { type: Boolean, default: false },
    cellStart: { type: Date, required: true },
    cellEnd: { type: Date, required: true }
  },
  emits: ["event-drag-start", "event-drag-end", "event-resize-start", "event-resize-end"],
  setup(__props, { emit: __emit }) {
    const props2 = __props;
    const { config, view, dnd, touch: globalTouchState, dateUtils, eventsManager } = inject("vuecal");
    const { handleEventResize } = eventsManager;
    const eventEl = ref(null);
    const event = reactive(props2.event);
    const touch = reactive({
      dragging: false,
      fromResizer: false,
      // If the drag originates from the resizer element.
      holding: false,
      // When the event is clicked and hold for a certain amount of time.
      holdTimer: null,
      // event click and hold detection.
      canTouchAndDrag: null,
      // Wait for 500ms before allowing an event to be dragged after touchstart.
      touchAndDragTimer: null,
      // Timer for canTouchAndDrag.
      startX: 0,
      // The X coords at the start of the drag.
      startY: 0,
      // The Y coords at the start of the drag.
      startPercentageX: 0,
      // The X coords in percentage at the start of the drag.
      startPercentageY: 0,
      // The Y coords in percentage at the start of the drag.
      moveX: 0,
      // The X coords while dragging.
      moveY: 0,
      // The Y coords while dragging.
      movePercentageX: 0,
      // The X coords in percentage while dragging.
      movePercentageY: 0,
      // The Y coords in percentage while dragging.
      documentMouseX: 0,
      // Document mouse X position for horizontal resizing
      documentMouseY: 0,
      // Document mouse Y position for horizontal resizing
      resizeStartDate: null,
      // When resizing and going above the start date (end before start) update the start instead of the end.
      resizingOriginalEvent: null,
      // Store the original event details while resizing.
      resizingLastAcceptedEvent: null,
      // Store the last accepted event details while resizing.
      cellEl: null,
      // Store the cell DOM node for a more efficient resizing calc in mousemove/touchmove.
      schedule: null
    });
    const isDraggable = computed(() => {
      return config.editableEvents.drag && event.draggable !== false && !event.background && touch.canTouchAndDrag !== false;
    });
    const isResizable = computed(() => {
      if (view.isMonth || view.isYear || view.isYears || props2.inAllDayBar) return false;
      if (event._.multiday && !eventEndsInThisCell.value) return false;
      return config.time && config.editableEvents.resize && event.resizable !== false && !event.background;
    });
    computed(() => config.editableEvents.delete && event.deletable !== false && !event.background);
    const classes = computed(() => {
      var _a, _b, _c, _d, _e;
      const isMultiday = !!((_a = event._) == null ? void 0 : _a.multiday);
      return {
        [`vuecal__event--${event._.id}`]: true,
        [event.class]: !!event.class,
        "vuecal__event--recurring": !!event.recurring,
        "vuecal__event--background": !!event.background,
        "vuecal__event--all-day": event.allDay || ((_b = event._) == null ? void 0 : _b.startMinutes) === 0 && ((_c = event._) == null ? void 0 : _c.duration) === 24 * 60,
        "vuecal__event--multiday": isMultiday,
        "vuecal__event--cut-top": !props2.inAllDayBar && (((_d = event._) == null ? void 0 : _d.startMinutes) < config.timeFrom || isMultiday && !eventStartsInThisCell.value),
        "vuecal__event--cut-bottom": !props2.inAllDayBar && (((_e = event._) == null ? void 0 : _e.endMinutes) > config.timeTo || isMultiday && !eventEndsInThisCell.value),
        // Only apply the dragging class on the event copy that is being dragged.
        "vuecal__event--dragging": !event._.draggingGhost && event._.dragging,
        // Only apply the dragging-ghost class on the event original that remains fixed while a copy is being
        // dragged. Sometimes when dragging fast the dragging-ghost class would get stuck and events stays
        // invisible, so if dragging is false, disable the dragging-ghost class as well.
        // On event drop, if the new position of the event is approved, only remove the dragging-ghost class
        // after event deletion (event._.dragging is already false) so the event ghost does not flash in before
        // deletion.
        "vuecal__event--dragging-ghost": event._.draggingGhost,
        "vuecal__event--resizing": globalTouchState.isResizingEvent
      };
    });
    const eventStartsInThisCell = computed(() => {
      if (event._.multiday) {
        return new Date(event.start).setHours(0, 0, 0, 0) === props2.cellStart.getTime();
      }
      return true;
    });
    const eventEndsInThisCell = computed(() => {
      if (event._.multiday) {
        return dateUtils.isSameDate(new Date(new Date(event.end).setMilliseconds(-1)), props2.cellEnd);
      }
      return true;
    });
    const plusDaysIndicator = computed(() => {
      const start = new Date(event.start).setHours(0, 0, 0, 0);
      const end = new Date(event.end).setHours(0, 0, 0, 0);
      return Math.ceil((end - start) / (1e3 * 60 * 60 * 24));
    });
    const styles = computed(() => {
      const hasPosition = (view.isDay || view.isDays || view.isWeek) && config.time && !props2.inAllDayBar;
      const isHzl = config.horizontal;
      if (!hasPosition && !event.backgroundColor && !event.color) return false;
      const styles2 = {
        backgroundColor: event.backgroundColor || null,
        color: event.color || null
      };
      if (hasPosition) {
        let startMinutes = event._.startMinutes;
        let endMinutes = event._.endMinutes;
        if (event._.multiday) {
          if (!eventStartsInThisCell.value) startMinutes = 0;
          if (!eventEndsInThisCell.value) endMinutes = 24 * 60;
        }
        const from = Math.max(config.timeFrom, startMinutes);
        const to = Math.min(config.timeTo, endMinutes) + (event._.duration && !endMinutes ? 24 * 60 : 0);
        const top = minutesToPercentage(from, config);
        const height = minutesToPercentage(to, config) - top;
        styles2[isHzl ? "left" : "top"] = `${top}%`;
        styles2[isHzl ? "width" : "height"] = `${height}%`;
      }
      return styles2;
    });
    const eventListeners = computed(() => {
      const eventListeners2 = { ...config.eventListeners.event };
      for (const [eventListener, handler] of Object.entries(eventListeners2)) {
        if (!["resize-end"].includes(eventListener)) {
          eventListeners2[eventListener] = (e) => {
            if (e.type !== "drop") handler(e.type ? { e, event } : e);
          };
        }
      }
      const externalHandlers = { ...eventListeners2 };
      eventListeners2.touchstart = (e) => {
        var _a;
        e.stopPropagation();
        touch.touchAndDragTimer = setTimeout(() => {
          touch.canTouchAndDrag = true;
        }, 500);
        onMousedown(e);
        (_a = externalHandlers.touchstart) == null ? void 0 : _a.call(externalHandlers, { e, event });
      };
      eventListeners2.mousedown = (e) => {
        var _a;
        e.stopPropagation();
        onMousedown(e);
        (_a = externalHandlers.mousedown) == null ? void 0 : _a.call(externalHandlers, { e, event });
      };
      let clickTimeout = null;
      eventListeners2.click = (e) => {
        var _a;
        (_a = externalHandlers.click) == null ? void 0 : _a.call(externalHandlers, { e, event });
        if (clickTimeout) clickTimeout = clearTimeout(clickTimeout);
        else {
          clickTimeout = setTimeout(() => {
            var _a2;
            clickTimeout = null;
            (_a2 = externalHandlers["delayed-click"]) == null ? void 0 : _a2.call(externalHandlers, { e, event });
          }, 400);
        }
      };
      eventListeners2.dblclick = (e) => {
        if (externalHandlers.dblclick) externalHandlers.dblclick({ e, event });
        else event.delete(1);
      };
      return eventListeners2;
    });
    let cachedRect = null;
    let rectCacheTime = 0;
    const onMousedown = (e) => {
      var _a, _b, _c;
      const domEvent = ((_a = e.touches) == null ? void 0 : _a[0]) || e;
      touch.fromResizer = domEvent.target.closest(".vuecal__event-resizer");
      const now = Date.now();
      if (!cachedRect || now - rectCacheTime > RECT_CACHE_DURATION) {
        cachedRect = eventEl.value.getBoundingClientRect();
        rectCacheTime = now;
      }
      const rect = cachedRect;
      touch.startX = (((_b = e.touches) == null ? void 0 : _b[0]) || e).clientX - rect.left;
      touch.startY = (((_c = e.touches) == null ? void 0 : _c[0]) || e).clientY - rect.top;
      touch.startPercentageX = touch.startX * 100 / rect.width;
      touch.startPercentageY = touch.startY * 100 / rect.height;
      touch.cellEl = eventEl.value.closest(".vuecal__cell");
      touch.resizeStartDate = event.start;
      if (touch.fromResizer) handleEventResize(e, event, eventEl.value);
      touch.holdTimer = setTimeout(() => {
        var _a2, _b2;
        touch.holding = true;
        (_b2 = (_a2 = eventListeners.value).hold) == null ? void 0 : _b2.call(_a2, { e, event });
      }, 1e3);
    };
    onMounted(() => event._.register(eventEl.value));
    onBeforeUnmount(() => {
      if (touch.holdTimer) touch.holdTimer = clearTimeout(touch.holdTimer);
      if (touch.touchAndDragTimer) touch.touchAndDragTimer = clearTimeout(touch.touchAndDragTimer);
      event._.unregister();
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", mergeProps({ class: "vuecal__event" }, toHandlers(eventListeners.value, true), {
        ref_key: "eventEl",
        ref: eventEl,
        class: classes.value,
        style: styles.value,
        draggable: isDraggable.value ? "true" : void 0,
        onDragstart: _cache[2] || (_cache[2] = ($event) => isDraggable.value && unref(dnd).eventDragStart($event, event)),
        onDragend: _cache[3] || (_cache[3] = ($event) => isDraggable.value && unref(dnd).eventDragEnd($event, event))
      }), [
        createElementVNode("div", _hoisted_2$4, [
          _ctx.$slots["event.all-day"] ? renderSlot(_ctx.$slots, "event.all-day", {
            key: 0,
            event
          }) : _ctx.$slots[`event.${unref(view).id}`] ? renderSlot(_ctx.$slots, `event.${unref(view).id}`, {
            key: 1,
            event
          }) : renderSlot(_ctx.$slots, "event", {
            key: 2,
            event
          }, () => [
            createElementVNode("div", _hoisted_3$3, toDisplayString(event.title), 1),
            unref(config).time && !__props.inAllDayBar && !(event._.multiday && !eventStartsInThisCell.value) ? (openBlock(), createElementBlock("div", _hoisted_4$3, [
              unref(view).isMonth ? (openBlock(), createElementBlock("span", _hoisted_5$3, ",")) : createCommentVNode("", true),
              createElementVNode("span", _hoisted_6$2, toDisplayString(event._[`startTimeFormatted${unref(config).twelveHour ? 12 : 24}`]), 1),
              !unref(view).isMonth ? (openBlock(), createElementBlock("span", _hoisted_7$2, [
                createTextVNode(" - " + toDisplayString(event._[`endTimeFormatted${unref(config).twelveHour ? 12 : 24}`]), 1),
                event._.multiday && eventStartsInThisCell.value ? (openBlock(), createElementBlock("span", _hoisted_8$2, "+" + toDisplayString(plusDaysIndicator.value) + "d", 1)) : createCommentVNode("", true)
              ])) : createCommentVNode("", true)
            ])) : createCommentVNode("", true),
            !__props.inAllDayBar ? (openBlock(), createElementBlock("div", {
              key: 1,
              class: "vuecal__event-content",
              innerHTML: event.content
            }, null, 8, _hoisted_9$1)) : createCommentVNode("", true)
          ])
        ]),
        isResizable.value ? (openBlock(), createElementBlock("div", {
          key: 0,
          class: "vuecal__event-resizer",
          onDragstart: _cache[0] || (_cache[0] = withModifiers(() => {
          }, ["prevent", "stop"]))
        }, null, 32)) : createCommentVNode("", true),
        createVNode(Transition, { name: "vuecal-delete-btn" }, {
          default: withCtx(() => [
            event._.deleting ? (openBlock(), createElementBlock("div", {
              key: 0,
              class: "vuecal__event-delete",
              onClick: _cache[1] || (_cache[1] = withModifiers(($event) => event.delete(3), ["stop"]))
            }, "Delete")) : createCommentVNode("", true)
          ]),
          _: 1
        })
      ], 16, _hoisted_1$4);
    };
  }
};
const _hoisted_1$3 = ["data-cell-start"];
const _hoisted_2$3 = ["innerHTML"];
const _hoisted_3$2 = ["data-schedule"];
const _hoisted_4$2 = {
  key: 1,
  class: "vuecal__cell-date"
};
const _hoisted_5$2 = {
  key: 2,
  class: "vuecal__cell-content"
};
const _hoisted_6$1 = {
  key: 3,
  class: "vuecal__cell-events"
};
const _hoisted_7$1 = {
  key: 1,
  class: "vuecal__cell-date"
};
const _hoisted_8$1 = {
  key: 2,
  class: "vuecal__cell-content"
};
const _hoisted_9 = {
  key: 3,
  class: "vuecal__cell-events"
};
const _hoisted_10 = {
  key: 5,
  class: "vuecal__cell-events-count"
};
const _hoisted_11 = ["title"];
const _sfc_main$4 = {
  __name: "cell",
  props: {
    // Even with time=false, the date of the cell will still be provided in order to attach
    // events to a specific date.
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    index: { type: Number, required: true },
    allDay: { type: Boolean, default: false }
    // True when the cell is an all-day cell.
  },
  setup(__props) {
    const props2 = __props;
    const vuecal = inject("vuecal");
    const { view, config, dateUtils, eventsManager, dnd, touch: globalTouchState } = vuecal;
    const isToday2 = computed(() => dateUtils.isToday(props2.start));
    const cellEl = ref(null);
    const eventsDeleted = ref([]);
    const transitioning = ref(false);
    const onEventDelete = (e) => {
      eventsDeleted.value.push(e.detail);
      transitioning.value = true;
    };
    const afterDelete = () => setTimeout(() => transitioning.value = false, 300);
    const touch = reactive({
      dragging: false,
      holding: false,
      // When the cell is clicked and hold for a certain amount of time.
      holdTimer: null,
      // Cell click and hold detection.
      thresholdPassed: false,
      // If the drag threshold has been passed.
      canTouchAndDrag: null,
      // Wait for 500ms before allowing an event to be dragged after touchstart.
      touchAndDragTimer: null,
      // Timer for canTouchAndDrag.
      startX: 0,
      // The x position at the start of the drag (mousedown or touchstart).
      startY: 0,
      // The y position at the start of the drag (mousedown or touchstart).
      moveX: 0,
      moveY: 0,
      startPercentageX: 0,
      // The x position in percentage at the start of the drag (mousedown or touchstart).
      startPercentageY: 0,
      // The y position in percentage at the start of the drag (mousedown or touchstart).
      movePercentageX: 0,
      movePercentageY: 0,
      schedule: null
    });
    const awaitingEventCreation = ref(false);
    const overlappingEvents = ref({ cellOverlaps: {}, longestStreak: 0 });
    const eventPlaceholder = computed(() => {
      let startPercentage = Math.min(touch.startPercentageY, touch.movePercentageY);
      let endPercentage = Math.max(touch.startPercentageY, touch.movePercentageY);
      let startMinutes = percentageToMinutes(startPercentage, config);
      let endMinutes = percentageToMinutes(endPercentage, config);
      if (config.snapToInterval) {
        startMinutes = dateUtils.snapToInterval(startMinutes, config.snapToInterval);
        endMinutes = dateUtils.snapToInterval(endMinutes, config.snapToInterval);
        startPercentage = minutesToPercentage(startMinutes, config);
        endPercentage = minutesToPercentage(endMinutes, config);
      }
      return {
        style: {
          top: `${startPercentage}%`,
          height: `${Math.abs(endPercentage - startPercentage)}%`
        },
        startMinutes,
        endMinutes,
        start: dateUtils.formatMinutes(startMinutes),
        end: dateUtils.formatMinutes(endMinutes),
        ...touch.schedule ? { schedule: touch.schedule } : {}
      };
    });
    const isCreatingEvent = computed(() => {
      const isCreating = config.editableEvents.create && (touch.dragging || awaitingEventCreation.value);
      const hasPassedMinDrag = config.eventCreateMinDrag && touch.thresholdPassed || !config.eventCreateMinDrag;
      const canCreateEvent = touch.canTouchAndDrag !== false;
      return isCreating && hasPassedMinDrag && canCreateEvent;
    });
    const classes = computed(() => {
      var _a;
      const now = /* @__PURE__ */ new Date();
      const viewYear = view.start.getFullYear();
      const viewMonth = view.start.getMonth();
      const y = props2.start.getFullYear();
      const m = props2.start.getMonth();
      const weekday = weekdays[props2.start.getDay()];
      return {
        [`vuecal__cell--${weekday}`]: view.isDay || view.isDays || view.isWeek || view.isMonth,
        [`vuecal__cell--${months$1[m]}`]: view.isYear,
        [`vuecal__cell--${y}`]: view.isYears,
        "vuecal__cell--today": isToday2.value,
        "vuecal__cell--current-month": view.isYear && y === now.getFullYear() && m === now.getMonth(),
        "vuecal__cell--current-year": view.isYears && y === now.getFullYear(),
        "vuecal__cell--out-of-range": view.isMonth && (y !== viewYear || m !== viewMonth),
        "vuecal__cell--before-min": isDisabled.value && isBeforeMinDate.value,
        "vuecal__cell--after-max": isDisabled.value && isAfterMaxDate.value,
        "vuecal__cell--disabled": isDisabled.value,
        "vuecal__cell--selected": view.selectedDate && view.selectedDate.getTime() >= props2.start.getTime() && view.selectedDate.getTime() <= props2.end.getTime(),
        "vuecal__cell--has-schedules": (_a = config.schedules) == null ? void 0 : _a.length,
        "vuecal__cell--dragging": touch.dragging,
        "vuecal__cell--has-events": cellEvents.value.length
      };
    });
    computed(() => dateUtils.formatDate(props2.start));
    const formattedCellDate = computed(() => {
      switch (view.id) {
        case "day":
          return "";
        case "days":
          if (config.availableViews.days.rows > 1) dateUtils.formatDate(props2.start, "D");
          return "";
        case "week":
          return "";
        case "month":
          return dateUtils.formatDate(props2.start, "D");
        case "year":
          return dateUtils.formatDate(props2.start, config.xs ? "MMM" : "MMMM");
        case "years":
          return dateUtils.formatDate(props2.start, "YYYY");
      }
    });
    const cellEvents = computed(() => {
      if (config.datePicker) return [];
      return eventsManager.getEventsInRange(
        props2.start,
        props2.end,
        { excludeIds: eventsDeleted.value, ...config.allDayEvents ? { allDay: props2.allDay } : {} }
      );
    });
    const cellForegroundEvents = computed(() => cellEvents.value.filter((event) => !event.background));
    const cellEventsPerSchedule = computed(() => {
      var _a;
      return (_a = config.schedules) == null ? void 0 : _a.reduce((obj, schedule) => {
        obj[schedule.id] = cellEvents.value.filter((event) => event.schedule === schedule.id);
        return obj;
      }, {});
    });
    const eventStyles = computed(() => {
      if (view.isMonth || view.isYear || view.isYears || props2.allDay) return {};
      const isRTL = typeof document !== "undefined" && document.documentElement.getAttribute("dir") === "rtl";
      const isHzl = config.horizontal;
      const styles = {};
      for (const event of cellEvents.value) {
        const eventId = event._.id;
        const { maxConcurrent = 1, position = 0 } = overlappingEvents.value.cellOverlaps[eventId] || {};
        const rightOrLeft = isRTL ? "right" : "left";
        const widthOrHeight = isHzl ? "height" : "width";
        styles[eventId] = { [isHzl ? "top" : rightOrLeft]: `${100 / maxConcurrent * position}%` };
        if (config.stackEvents) {
          styles[eventId][widthOrHeight] = `${100 / maxConcurrent + (position === maxConcurrent - 1 ? 0 : 15)}%`;
        } else styles[eventId][widthOrHeight] = `${100 / maxConcurrent}%`;
      }
      return styles;
    });
    const eventClasses = computed(() => {
      const classes2 = {};
      for (const event of cellEvents.value) {
        const eventId = event._.id;
        const { maxConcurrent = 1, position = 0 } = overlappingEvents.value.cellOverlaps[eventId] || {};
        classes2[eventId] = `vuecal__event--stack-${position + 1}-${maxConcurrent}`;
      }
      return classes2;
    });
    const showCellEventCount = computed(() => {
      return config.showCellEventCount && cellForegroundEvents.value.length;
    });
    const specialHours = computed(() => {
      var _a;
      if (!config.specialHours || view.isMonth || view.isYear || view.isYears || props2.allDay) return;
      const weekday = weekdays[props2.start.getDay()];
      let daySpecialHours = (_a = config.specialHours) == null ? void 0 : _a[weekday];
      if (!daySpecialHours) return;
      if (!Array.isArray(daySpecialHours)) daySpecialHours = [daySpecialHours];
      return daySpecialHours.map((dayRanges) => {
        let { from, to, class: classes2, label } = dayRanges;
        if (isNaN(from) || isNaN(to) || config.timeFrom >= to || config.timeTo <= from) return;
        from = Math.max(config.timeFrom, from);
        to = Math.min(config.timeTo, to);
        const top = minutesToPercentage(from, config);
        const height = minutesToPercentage(to, config) - top;
        return {
          style: { top: `${top}%`, height: `${height}%` },
          label,
          class: classes2
        };
      }).filter((specialRanges) => !!specialRanges);
    });
    const isBeforeMinDate = computed(() => {
      return config.minTimestamp !== null && config.minTimestamp > props2.end.getTime();
    });
    const isAfterMaxDate = computed(() => {
      return config.maxTimestamp && config.maxTimestamp < props2.start.getTime();
    });
    const isDisabled = computed(() => {
      const { disableDays } = config;
      const isYearsOrYearView = view.isYear || view.isYears;
      if (disableDays.length && disableDays.includes(dateUtils.formatDate(props2.start)) && !isYearsOrYearView) return true;
      return isBeforeMinDate.value || isAfterMaxDate.value;
    });
    const nowLine = reactive({
      show: computed(() => {
        if (!view.isDay && !view.isDays && !view.isWeek) return;
        if (!isToday2.value || !config.time || props2.allDay) return;
        if (config.timeFrom > dateUtils.dateToMinutes(view.now)) return;
        if (dateUtils.dateToMinutes(view.now) > config.timeTo) return;
        return true;
      }),
      nowInMinutes: computed(() => dateUtils.dateToMinutes(view.now)),
      todaysTimePosition: computed(() => minutesToPercentage(nowLine.nowInMinutes, config)),
      style: computed(() => `${config.horizontal ? "left" : "top"}: ${nowLine.todaysTimePosition}%`),
      currentTime: computed(() => dateUtils.formatTime(view.now, config.twelveHour ? "h:mm {am}" : "HH:mm"))
    });
    const cellEventListeners = computed(() => {
      if (isDisabled.value) return {};
      const eventListeners = { ...config.eventListeners.cell };
      for (const [eventListener, handler] of Object.entries(eventListeners)) {
        eventListeners[eventListener] = (e) => {
          var _a, _b, _c;
          if ((_c = (_b = e.target || ((_a = e.e) == null ? void 0 : _a.target)).closest) == null ? void 0 : _c.call(_b, ".vuecal__event")) return;
          handler(e.type ? { e, cell: cellInfo.value, cursor: cursorInfo.value } : e);
        };
      }
      const externalHandlers = { ...eventListeners };
      let clickTimeout = null;
      eventListeners.click = (e) => {
        var _a;
        onCellClick();
        const cursor = getTimeAtCursor(e);
        (_a = externalHandlers.click) == null ? void 0 : _a.call(externalHandlers, { e, cell: cellInfo.value, cursor });
        if (clickTimeout) clickTimeout = clearTimeout(clickTimeout);
        else {
          clickTimeout = setTimeout(() => {
            var _a2;
            clickTimeout = null;
            (_a2 = externalHandlers["delayed-click"]) == null ? void 0 : _a2.call(externalHandlers, { e, cell: cellInfo.value, cursor });
          }, 400);
        }
      };
      if (config.time && view.isDay || view.isDays || view.isWeek) {
        eventListeners.touchstart = (e) => {
          var _a;
          onMousedown(e.e || e);
          (_a = externalHandlers.touchstart) == null ? void 0 : _a.call(externalHandlers, { e, cell: cellInfo.value, cursor: cursorInfo.value });
        };
        eventListeners.mousedown = (e) => {
          var _a;
          onMousedown(e.e || e);
          (_a = externalHandlers.mousedown) == null ? void 0 : _a.call(externalHandlers, { e, cell: cellInfo.value, cursor: cursorInfo.value });
        };
      }
      if (externalHandlers.dblclick) {
        eventListeners.dblclick = (e) => {
          var _a;
          (_a = externalHandlers.dblclick) == null ? void 0 : _a.call(externalHandlers, { e, cell: cellInfo.value, cursor: getTimeAtCursor(e) });
        };
      }
      if (config.editableEvents.drag) {
        eventListeners.dragenter = (e) => dnd.cellDragEnter(e, cellInfo.value);
        eventListeners.dragover = (e) => {
          e.preventDefault();
          dnd.cellDragOver(e, cellInfo.value);
        };
        eventListeners.dragleave = (e) => dnd.cellDragLeave(e, cellInfo.value);
        eventListeners.drop = (e) => dnd.cellDragDrop(e, cellInfo.value, props2.allDay);
      }
      return eventListeners;
    });
    const cellInfo = computed(() => ({
      start: props2.start,
      end: props2.end,
      events: cellEvents,
      ...touch.schedule ? { schedule: touch.schedule } : {},
      goNarrower: () => view.narrower(),
      goBroader: () => view.broader(),
      broader: view.broaderView,
      narrower: view.narrowerView
    }));
    const getTimeAtCursor = (e) => {
      var _a;
      const clientY = (((_a = e.touches) == null ? void 0 : _a[0]) || e).clientY;
      const { top } = cellEl.value.getBoundingClientRect();
      const cursorYPercent = pxToPercentage(clientY - top, cellEl.value);
      const date = new Date(props2.start);
      date.setMinutes(percentageToMinutes(cursorYPercent, config));
      return { y: cursorYPercent, date };
    };
    const cursorInfo = computed(() => {
      const minutes = percentageToMinutes(touch.movePercentageY || touch.startPercentageY, config);
      const date = new Date(props2.start);
      date.setMinutes(minutes);
      return {
        x: touch.movePercentageX || touch.startPercentageX,
        y: touch.movePercentageY || touch.startPercentageY,
        date
      };
    });
    const onCellClick = () => {
      view.updateSelectedDate(props2.start);
      if (config.clickToNavigate) {
        if ((view.isMonth || view.isDays || view.isWeek) && config.availableViews.day) view.switch("day");
        else if (view.isYear && config.availableViews.month) view.switch("month");
        else if (view.isYears && config.availableViews.year) view.switch("year");
      }
      view.updateViewDate(props2.start);
    };
    const onMousedown = (e) => {
      var _a, _b;
      const isTouchEvent = e.type === "touchstart";
      if (isTouchEvent) {
        touch.canTouchAndDrag = false;
        touch.touchAndDragTimer = setTimeout(() => {
          touch.canTouchAndDrag = true;
          if (touch.holding || touch.dragging) e.preventDefault();
        }, 500);
      } else touch.canTouchAndDrag = true;
      touch.schedule = ~~e.target.dataset.schedule;
      const rect = cellEl.value.getBoundingClientRect();
      touch.startX = (((_a = e.touches) == null ? void 0 : _a[0]) || e).clientX - rect.left;
      touch.startY = (((_b = e.touches) == null ? void 0 : _b[0]) || e).clientY - rect.top;
      touch.startPercentageX = touch.startX * 100 / rect.width;
      touch.startPercentageY = touch.startY * 100 / rect.height;
      touch.thresholdPassed = false;
      document.addEventListener(isTouchEvent ? "touchmove" : "mousemove", onDocMousemove, { passive: !isTouchEvent });
      document.addEventListener(isTouchEvent ? "touchend" : "mouseup", onDocMouseup, { once: true });
      touch.holdTimer = setTimeout(() => {
        var _a2, _b2;
        touch.holding = true;
        (_b2 = (_a2 = cellEventListeners.value).hold) == null ? void 0 : _b2.call(_a2, { e, cell: cellInfo.value, cursor: cursorInfo.value });
      }, 1e3);
    };
    const onDocMousemove = (e) => {
      var _a, _b, _c, _d, _e, _f;
      const isTouchEvent = e.type === "touchmove";
      if (isTouchEvent && !touch.canTouchAndDrag) {
        if (touch.touchAndDragTimer) {
          clearTimeout(touch.touchAndDragTimer);
          touch.touchAndDragTimer = null;
        }
        onDocMouseup(e);
        return;
      }
      if (isTouchEvent) {
        e.preventDefault();
      }
      if (!touch.dragging) {
        globalTouchState.isDraggingCell = true;
        (_b = (_a = cellEventListeners.value)["drag-start"]) == null ? void 0 : _b.call(_a, { e, cell: cellInfo.value, cursor: cursorInfo.value });
      }
      touch.dragging = true;
      touch.holdTimer = clearTimeout(touch.holdTimer);
      touch.holding = false;
      const rect = cellEl.value.getBoundingClientRect();
      touch.moveX = (((_c = e.touches) == null ? void 0 : _c[0]) || e).clientX - rect.left;
      touch.moveY = (((_d = e.touches) == null ? void 0 : _d[0]) || e).clientY - rect.top;
      touch.movePercentageX = touch.moveX * 100 / rect.width;
      touch.movePercentageY = touch.moveY * 100 / rect.height;
      if (config.eventCreateMinDrag && Math.abs(touch.startY - touch.moveY) > config.eventCreateMinDrag) {
        touch.thresholdPassed = true;
      }
      (_f = (_e = cellEventListeners.value).drag) == null ? void 0 : _f.call(_e, { e, cell: cellInfo.value, cursor: cursorInfo.value });
    };
    const onDocMouseup = async (e) => {
      var _a, _b;
      const isTouchEvent = e.type === "touchend";
      document.removeEventListener(isTouchEvent ? "touchmove" : "mousemove", onDocMousemove, { passive: false });
      if (touch.touchAndDragTimer) {
        clearTimeout(touch.touchAndDragTimer);
        touch.touchAndDragTimer = null;
      }
      if (touch.dragging) {
        (_b = (_a = cellEventListeners.value)["drag-end"]) == null ? void 0 : _b.call(_a, { e, cell: cellInfo.value, cursor: cursorInfo.value });
        globalTouchState.isDraggingCell = false;
        if (config.editableEvents.create && touch.canTouchAndDrag) {
          awaitingEventCreation.value = true;
          await createEventIfAllowed(e);
          awaitingEventCreation.value = false;
        }
      }
      touch.holdTimer = clearTimeout(touch.holdTimer);
      touch.holding = false;
      touch.dragging = false;
      touch.startX = 0;
      touch.startY = 0;
      touch.moveX = 0;
      touch.moveY = 0;
      touch.startPercentageX = 0;
      touch.startPercentageY = 0;
      touch.movePercentageX = 0;
      touch.movePercentageY = 0;
      touch.thresholdPassed = false;
      touch.schedule = null;
      touch.canTouchAndDrag = null;
    };
    const createEventIfAllowed = async (e) => {
      var _a;
      if (!isCreatingEvent.value) return;
      let { start, end, startMinutes, endMinutes } = eventPlaceholder.value;
      start = new Date(props2.start);
      start.setMinutes(startMinutes);
      end = new Date(props2.start);
      end.setMinutes(endMinutes);
      let eventToCreate = { ...eventPlaceholder.value, start, end };
      const { create: createListener } = config.eventListeners.event;
      if (typeof createListener === "function") {
        const eventCopy = eventToCreate;
        eventToCreate = await new Promise((resolve) => createListener({ e, event: eventToCreate, cell: cellInfo.value, resolve, cursor: cursorInfo.value }));
        if (eventToCreate && typeof eventToCreate === "object") view.createEvent(eventToCreate);
        if (eventToCreate && typeof eventToCreate === "boolean") view.createEvent(eventCopy);
      } else view.createEvent(eventToCreate);
      (_a = navigator.vibrate) == null ? void 0 : _a.call(navigator, 200);
    };
    const removeEventListeners = () => {
      var _a;
      for (const event of Object.keys(cellEventListeners.value)) {
        (_a = cellEl.value) == null ? void 0 : _a.removeEventListener(event, cellEventListeners.value[event]);
      }
    };
    const recalculateOverlaps = () => {
      overlappingEvents.value = eventsManager.getCellOverlappingEvents(props2.start, props2.end, props2.allDay);
    };
    watch(
      // Watch event IDs and start/end dates (only) to detect event resizing/dnd.
      () => !view.isYears && !view.isYear && cellForegroundEvents.value.map((e) => `${e._.id}${e.start.getTime()}${e.end.getTime()}`).join(),
      async () => {
        await nextTick();
        recalculateOverlaps();
      },
      { immediate: true, flush: "post" }
      // Use flush: 'post' to prevent infinite updates.
    );
    onBeforeUnmount(async () => {
      for (const eventId of eventsDeleted.value) eventsManager.deleteEvent(eventId, 3);
      removeEventListeners();
      await nextTick();
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", mergeProps({
        class: ["vuecal__cell", classes.value],
        ref_key: "cellEl",
        ref: cellEl,
        "data-cell-start": props2.start.getTime()
      }, toHandlers(cellEventListeners.value, true)), [
        _ctx.$slots.cell ? renderSlot(_ctx.$slots, "cell", {
          key: 0,
          cell: cellInfo.value
        }) : createCommentVNode("", true),
        specialHours.value ? (openBlock(true), createElementBlock(Fragment, { key: 1 }, renderList(specialHours.value, (range, i) => {
          return openBlock(), createElementBlock("div", {
            class: normalizeClass(["vuecal__special-hours", range.class]),
            style: normalizeStyle(range.style),
            innerHTML: range.label || ""
          }, null, 14, _hoisted_2$3);
        }), 256)) : createCommentVNode("", true),
        !_ctx.$slots.cell && unref(config).schedules ? (openBlock(true), createElementBlock(Fragment, { key: 2 }, renderList(unref(config).schedules, (schedule) => {
          return openBlock(), createElementBlock("div", {
            class: normalizeClass(["vuecal__schedule vuecal__schedule--cell", schedule.class]),
            key: schedule.id,
            style: normalizeStyle(schedule.style || null),
            "data-schedule": schedule.id
          }, [
            _ctx.$slots["cell-events"] ? renderSlot(_ctx.$slots, "cell-events", {
              key: 0,
              cell: cellInfo.value
            }) : createCommentVNode("", true),
            formattedCellDate.value || _ctx.$slots["cell-date"] ? (openBlock(), createElementBlock("div", _hoisted_4$2, [
              renderSlot(_ctx.$slots, "cell-date", { cell: cellInfo.value }, () => [
                createTextVNode(toDisplayString(formattedCellDate.value), 1)
              ])
            ])) : createCommentVNode("", true),
            _ctx.$slots["cell-content"] ? (openBlock(), createElementBlock("div", _hoisted_5$2, [
              renderSlot(_ctx.$slots, "cell-content", { cell: cellInfo.value })
            ])) : createCommentVNode("", true),
            _ctx.$slots["cell-events"] && cellEvents.value.length ? (openBlock(), createElementBlock("div", _hoisted_6$1, [
              renderSlot(_ctx.$slots, "cell-events", { cell: cellInfo.value })
            ])) : cellEvents.value.length || transitioning.value ? (openBlock(), createBlock(TransitionGroup, {
              key: 4,
              class: "vuecal__cell-events",
              name: "vuecal-event-delete",
              onBeforeLeave: _cache[0] || (_cache[0] = ($event) => transitioning.value = true),
              onAfterLeave: afterDelete,
              tag: "div"
            }, {
              default: withCtx(() => [
                (openBlock(true), createElementBlock(Fragment, null, renderList(cellEventsPerSchedule.value[schedule.id], (event) => {
                  return openBlock(), createBlock(_sfc_main$5, {
                    key: event._.id,
                    event,
                    onEventDeleted: onEventDelete,
                    "in-all-day-bar": props2.allDay,
                    "cell-start": props2.start,
                    "cell-end": props2.end,
                    style: normalizeStyle(eventStyles.value[event._.id])
                  }, createSlots({ _: 2 }, [
                    _ctx.$slots["event.all-day"] && props2.allDay ? {
                      name: "event.all-day",
                      fn: withCtx((params) => [
                        renderSlot(_ctx.$slots, "event.all-day", mergeProps({ ref_for: true }, params))
                      ]),
                      key: "0"
                    } : void 0,
                    _ctx.$slots[`event.${unref(view).id}`] ? {
                      name: `event.${unref(view).id}`,
                      fn: withCtx((params) => [
                        renderSlot(_ctx.$slots, `event.${unref(view).id}`, mergeProps({ ref_for: true }, params))
                      ]),
                      key: "1"
                    } : void 0,
                    _ctx.$slots.event ? {
                      name: "event",
                      fn: withCtx((params) => [
                        renderSlot(_ctx.$slots, "event", mergeProps({ ref_for: true }, params))
                      ]),
                      key: "2"
                    } : void 0
                  ]), 1032, ["event", "in-all-day-bar", "cell-start", "cell-end", "style"]);
                }), 128))
              ]),
              _: 2
            }, 1024)) : createCommentVNode("", true),
            isCreatingEvent.value && touch.schedule === schedule.id && !props2.allDay ? (openBlock(), createElementBlock("div", {
              key: 5,
              class: "vuecal__event-placeholder",
              style: normalizeStyle(eventPlaceholder.value.style)
            }, toDisplayString(eventPlaceholder.value.start) + " - " + toDisplayString(eventPlaceholder.value.end), 5)) : createCommentVNode("", true)
          ], 14, _hoisted_3$2);
        }), 128)) : createCommentVNode("", true),
        !_ctx.$slots.cell && !unref(config).schedules ? (openBlock(), createElementBlock(Fragment, { key: 3 }, [
          _ctx.$slots["cell-events"] ? renderSlot(_ctx.$slots, "cell-events", {
            key: 0,
            cell: cellInfo.value
          }) : createCommentVNode("", true),
          formattedCellDate.value || _ctx.$slots["cell-date"] ? (openBlock(), createElementBlock("div", _hoisted_7$1, [
            renderSlot(_ctx.$slots, "cell-date", { cell: cellInfo.value }, () => [
              createTextVNode(toDisplayString(formattedCellDate.value), 1)
            ])
          ])) : createCommentVNode("", true),
          _ctx.$slots["cell-content"] ? (openBlock(), createElementBlock("div", _hoisted_8$1, [
            renderSlot(_ctx.$slots, "cell-content", { cell: cellInfo.value })
          ])) : createCommentVNode("", true),
          _ctx.$slots["cell-events"] && cellEvents.value.length ? (openBlock(), createElementBlock("div", _hoisted_9, [
            renderSlot(_ctx.$slots, "cell-events", { cell: cellInfo.value })
          ])) : !(unref(view).isMonth && !unref(config).eventsOnMonthView) && !unref(view).isYear && !unref(view).isYears && (cellEvents.value.length || transitioning.value) ? (openBlock(), createBlock(TransitionGroup, {
            key: 4,
            class: "vuecal__cell-events",
            name: "vuecal-event-delete",
            onBeforeLeave: _cache[1] || (_cache[1] = ($event) => transitioning.value = true),
            onAfterLeave: afterDelete,
            tag: "div"
          }, {
            default: withCtx(() => [
              (openBlock(true), createElementBlock(Fragment, null, renderList(cellEvents.value, (event) => {
                return openBlock(), createBlock(_sfc_main$5, {
                  key: event._.id,
                  event,
                  onEventDeleted: onEventDelete,
                  "in-all-day-bar": props2.allDay,
                  "cell-start": props2.start,
                  "cell-end": props2.end,
                  class: normalizeClass(eventClasses.value[event._.id]),
                  style: normalizeStyle(eventStyles.value[event._.id])
                }, createSlots({ _: 2 }, [
                  _ctx.$slots["event.all-day"] && props2.allDay ? {
                    name: "event.all-day",
                    fn: withCtx((params) => [
                      renderSlot(_ctx.$slots, "event.all-day", mergeProps({ ref_for: true }, params))
                    ]),
                    key: "0"
                  } : void 0,
                  _ctx.$slots[`event.${unref(view).id}`] ? {
                    name: `event.${unref(view).id}`,
                    fn: withCtx((params) => [
                      renderSlot(_ctx.$slots, `event.${unref(view).id}`, mergeProps({ ref_for: true }, params))
                    ]),
                    key: "1"
                  } : void 0,
                  _ctx.$slots.event ? {
                    name: "event",
                    fn: withCtx((params) => [
                      renderSlot(_ctx.$slots, "event", mergeProps({ ref_for: true }, params))
                    ]),
                    key: "2"
                  } : void 0
                ]), 1032, ["event", "in-all-day-bar", "cell-start", "cell-end", "class", "style"]);
              }), 128))
            ]),
            _: 3
          })) : createCommentVNode("", true),
          isCreatingEvent.value ? (openBlock(), createElementBlock("div", {
            key: 5,
            class: "vuecal__event-placeholder",
            style: normalizeStyle(eventPlaceholder.value.style)
          }, toDisplayString(eventPlaceholder.value.start) + " - " + toDisplayString(eventPlaceholder.value.end), 5)) : createCommentVNode("", true)
        ], 64)) : createCommentVNode("", true),
        _ctx.$slots["event-count"] ? renderSlot(_ctx.$slots, "event-count", {
          key: 4,
          events: cellForegroundEvents.value
        }) : showCellEventCount.value ? (openBlock(), createElementBlock("div", _hoisted_10, toDisplayString(cellForegroundEvents.value.length), 1)) : createCommentVNode("", true),
        nowLine.show ? (openBlock(), createElementBlock("div", {
          key: 6,
          class: "vuecal__now-line",
          style: normalizeStyle(nowLine.style),
          title: nowLine.currentTime
        }, [
          renderSlot(_ctx.$slots, "now-line", {
            now: unref(view).now,
            timeFormatted: nowLine.currentTime
          }, () => [
            createElementVNode("span", null, toDisplayString(nowLine.currentTime), 1)
          ])
        ], 12, _hoisted_11)) : createCommentVNode("", true)
      ], 16, _hoisted_1$3);
    };
  }
};
const _hoisted_1$2 = {
  key: 0,
  class: "vuecal__headings"
};
const _hoisted_2$2 = {
  key: 0,
  class: "vuecal__weekdays-headings"
};
const _hoisted_3$1 = ["onClick"];
const _hoisted_4$1 = { class: "vuecal__weekday-day" };
const _hoisted_5$1 = {
  key: 0,
  class: "vuecal__weekday-date"
};
const _hoisted_6 = {
  key: 1,
  class: "vuecal__schedules-headings w-flex grow"
};
const _hoisted_7 = ["innerHTML"];
const _hoisted_8 = {
  key: 2,
  class: "vuecal__all-day w-flex grow"
};
const _sfc_main$3 = {
  __name: "headings-bar",
  setup(__props) {
    const vuecal = inject("vuecal");
    const $vuecalEl = inject("$vuecalEl");
    const { view, config, dateUtils } = vuecal;
    const dayLabelSize = computed(() => {
      if (config.xs) return "day-xs";
      if (config.sm || view.isDays || view.isMonth) return "day-sm";
      return "day";
    });
    const showHeadings = computed(() => {
      const isDayDaysWeekOrMonthView = view.isDay || view.isDays || view.isWeek || view.isMonth;
      return isDayDaysWeekOrMonthView && !(view.isDay && !config.schedules && !config.allDayEvents);
    });
    const weekDays2 = computed(() => {
      return view.cellDates.slice(0, config.horizontal ? view.rows : view.cols).map(({ start }) => ({
        id: weekdays[start.getDay()],
        date: start,
        dateNumber: start.getDate(),
        day: dateUtils.formatDate(start, "dddd"),
        "day-sm": dateUtils.formatDate(start, "ddd"),
        "day-xs": dateUtils.formatDate(start, "dd"),
        isToday: dateUtils.isToday(start)
      }));
    });
    const domEvents = {
      click: (date) => {
        if (view.isDays || view.isWeek) view.updateSelectedDate(date);
      }
    };
    const allDayResizer = {
      isResizing: ref(false),
      startY: ref(0),
      initialHeight: ref(0),
      defaultHeight: 25,
      // Default height in pixels.
      // Or in the case of horizontal layout.
      startX: ref(0),
      initialWidth: ref(0),
      defaultWidth: 25,
      // Default width in pixels.
      // Cleanup event listeners.
      cleanup() {
        if (typeof document !== "undefined") {
          document.removeEventListener("mousemove", allDayResizer.handleMouseMove);
          document.removeEventListener("mouseup", allDayResizer.cleanup);
          document.removeEventListener("touchmove", allDayResizer.handleTouchMove, { passive: false });
          document.removeEventListener("touchend", allDayResizer.cleanup);
        }
        allDayResizer.isResizing.value = false;
      },
      startResize(clientX, clientY) {
        var _a;
        this.isResizing.value = true;
        const isHzl = config.horizontal;
        this[isHzl ? "startX" : "startY"].value = isHzl ? clientX : clientY;
        const allDayEl = (_a = $vuecalEl.value) == null ? void 0 : _a.querySelector(".vuecal__all-day");
        if (allDayEl) {
          this[isHzl ? "initialWidth" : "initialHeight"].value = allDayEl[isHzl ? "offsetWidth" : "offsetHeight"];
        }
        document.addEventListener("mousemove", allDayResizer.handleMouseMove);
        document.addEventListener("mouseup", allDayResizer.cleanup);
        document.addEventListener("touchmove", allDayResizer.handleTouchMove, { passive: false });
        document.addEventListener("touchend", allDayResizer.cleanup);
      },
      // Update height/width based on mouse/touch movement.
      updateSize(clientX, clientY) {
        var _a;
        if (!this.isResizing.value) return;
        const isHzl = config.horizontal;
        const delta = isHzl ? clientX - this.startX.value : clientY - this.startY.value;
        const newSize = Math.max(20, this[isHzl ? "initialWidth" : "initialHeight"].value + delta);
        (_a = $vuecalEl.value) == null ? void 0 : _a.style.setProperty("--vuecal-all-day-bar-height", `${newSize}px`);
      },
      // Mouse event handlers.
      handleMouseDown(e) {
        this.startResize(e.clientX, e.clientY);
      },
      handleMouseMove(e) {
        allDayResizer.updateSize(e.clientX, e.clientY);
      },
      // Touch event handlers.
      handleTouchStart(e) {
        var _a;
        ((_a = e.touches) == null ? void 0 : _a[0]) && this.startResize(e.touches[0].clientX, e.touches[0].clientY);
      },
      handleTouchMove(e) {
        var _a;
        if ((_a = e.touches) == null ? void 0 : _a[0]) {
          allDayResizer.updateSize(e.touches[0].clientX, e.touches[0].clientY);
          e.preventDefault();
        }
      }
    };
    onBeforeUnmount(() => {
      allDayResizer.cleanup();
    });
    return (_ctx, _cache) => {
      return showHeadings.value ? (openBlock(), createElementBlock("div", _hoisted_1$2, [
        !unref(view).isDay ? (openBlock(), createElementBlock("div", _hoisted_2$2, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(weekDays2.value, (day2, i) => {
            return openBlock(), createElementBlock("div", {
              class: normalizeClass(["vuecal__weekday", { "vuecal__weekday--today": day2.isToday }]),
              key: i,
              onClick: ($event) => domEvents.click(day2.date)
            }, [
              renderSlot(_ctx.$slots, "weekday-heading", {
                label: day2[dayLabelSize.value],
                id: day2.id,
                date: day2.date
              }, () => [
                createElementVNode("span", _hoisted_4$1, toDisplayString(day2[dayLabelSize.value]), 1),
                !unref(view).isMonth ? (openBlock(), createElementBlock("strong", _hoisted_5$1, toDisplayString(day2.dateNumber), 1)) : createCommentVNode("", true)
              ])
            ], 10, _hoisted_3$1);
          }), 128))
        ])) : createCommentVNode("", true),
        unref(config).schedules ? (openBlock(), createElementBlock("div", _hoisted_6, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(weekDays2.value, (day2, i) => {
            return openBlock(), createElementBlock(Fragment, { key: i }, [
              (openBlock(true), createElementBlock(Fragment, null, renderList(unref(config).schedules, (schedule, j) => {
                return openBlock(), createElementBlock(Fragment, { key: j }, [
                  _ctx.$slots["schedule-heading"] ? (openBlock(), createElementBlock("div", {
                    key: 0,
                    class: normalizeClass(["vuecal__schedule vuecal__schedule--heading", schedule.class])
                  }, [
                    renderSlot(_ctx.$slots, "schedule-heading", {
                      schedule,
                      view: unref(view)
                    })
                  ], 2)) : (openBlock(), createElementBlock("div", {
                    key: 1,
                    class: normalizeClass(["vuecal__schedule vuecal__schedule--heading", schedule.class]),
                    innerHTML: schedule.label
                  }, null, 10, _hoisted_7))
                ], 64);
              }), 128))
            ], 64);
          }), 128))
        ])) : createCommentVNode("", true),
        unref(config).allDayEvents ? (openBlock(), createElementBlock("div", _hoisted_8, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(weekDays2.value, (day2, i) => {
            return openBlock(), createBlock(_sfc_main$4, {
              class: normalizeClass(["vuecal__all-day-cell", { "vuecal__weekday--today": day2.isToday }]),
              key: i,
              start: day2.date,
              end: new Date(day2.date.getTime() + 24 * 60 * 60 * 1e3 - 1),
              index: i,
              "all-day": ""
            }, createSlots({ _: 2 }, [
              _ctx.$slots["event.all-day"] ? {
                name: "event.all-day",
                fn: withCtx((params) => [
                  renderSlot(_ctx.$slots, "event.all-day", mergeProps({ ref_for: true }, params))
                ]),
                key: "0"
              } : {
                name: "event",
                fn: withCtx((params) => [
                  renderSlot(_ctx.$slots, "event", mergeProps({ ref_for: true }, params))
                ]),
                key: "1"
              }
            ]), 1032, ["class", "start", "end", "index"]);
          }), 128)),
          createElementVNode("div", {
            class: "vuecal__all-day-resizer",
            onMousedown: _cache[0] || (_cache[0] = (...args) => allDayResizer.handleMouseDown && allDayResizer.handleMouseDown(...args)),
            onTouchstart: _cache[1] || (_cache[1] = (...args) => allDayResizer.handleTouchStart && allDayResizer.handleTouchStart(...args))
          }, null, 32)
        ])) : createCommentVNode("", true)
      ])) : createCommentVNode("", true);
    };
  }
};
const _hoisted_1$1 = { class: "vuecal__time-column" };
const _hoisted_2$1 = {
  key: 0,
  class: "vuecal__all-day-label"
};
const _sfc_main$2 = {
  __name: "time-column",
  setup(__props) {
    const vuecal = inject("vuecal");
    const { config, texts } = vuecal;
    const timeCells = computed(() => {
      const cells = [];
      const noon = 12 * 60;
      for (let i = config.timeFrom; i < config.timeTo; i += config.timeStep) {
        const isLastCell = i + config.timeStep > config.timeTo;
        const hours = ~~(i / 60);
        const mins = i % 60;
        const amPm = texts[i < noon ? "am" : "pm"];
        let cellHeight = null;
        if (isLastCell) {
          const percentageOfFullCell = (config.timeTo - i) / config.timeStep;
          cellHeight = `calc(var(--vuecal-time-cell-height) * ${percentageOfFullCell})`;
        }
        cells.push({
          minutesSum: i,
          // The sum of hours + minutes in minutes.
          hours,
          minutes: mins,
          formatted12: `${!(hours % 12) ? 12 : hours % 12}${mins ? `:${mins.toString().padStart(2, 0)}` : ""}${amPm}`,
          formatted24: `${hours.toString().padStart(2, 0)}:${mins.toString().padStart(2, 0)}`,
          height: cellHeight
        });
      }
      return cells;
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1$1, [
        unref(config).allDayEvents ? (openBlock(), createElementBlock("div", _hoisted_2$1, [
          renderSlot(_ctx.$slots, "all-day-label", {}, () => [
            createTextVNode(toDisplayString(unref(vuecal).texts.allDay), 1)
          ])
        ])) : createCommentVNode("", true),
        (openBlock(true), createElementBlock(Fragment, null, renderList(timeCells.value, (time, i) => {
          return openBlock(), createElementBlock("div", {
            class: "vuecal__time-cell",
            key: i,
            style: normalizeStyle({ height: time.height || null })
          }, [
            renderSlot(_ctx.$slots, "time-cell", {
              index: i,
              minutes: time.minutes,
              hours: time.hours,
              minutesSum: time.minutesSum,
              format12: time.formatted12,
              format24: time.formatted24
            }, () => [
              createElementVNode("label", null, toDisplayString(unref(config).twelveHour ? time.formatted12 : time.formatted24), 1)
            ])
          ], 4);
        }), 128))
      ]);
    };
  }
};
const _sfc_main$1 = {
  __name: "body",
  setup(__props) {
    const vuecal = inject("vuecal");
    const { view, config, dateUtils, touch: globalTouchState, eventsManager } = vuecal;
    const bodyEl = ref(null);
    const cursorYPercent = ref(null);
    const { resizeState } = eventsManager;
    const bodyStyles = computed(() => ({
      "--vuecal-grid-columns": view.cols,
      "--vuecal-grid-rows": view.rows,
      "--vuecal-body-max-height": config.time ? `${config.timeCellHeight * (config.timeTo - config.timeFrom) / config.timeStep}px` : null
    }));
    const timeAtCursor = computed(() => {
      const time = dateUtils.formatTime(percentageToMinutes(cursorYPercent.value, config));
      return {
        style: { top: `${cursorYPercent.value}%` },
        time
      };
    });
    const onBodyMousemove = (e) => {
      var _a;
      if (view.isMonth || view.isYear || view.isYears) return;
      const domEvent = ((_a = e.touches) == null ? void 0 : _a[0]) || e;
      const { clientX, clientY } = domEvent;
      const { top } = bodyEl.value.getBoundingClientRect();
      cursorYPercent.value = pxToPercentage(clientY - top, bodyEl.value);
      if (globalTouchState.isResizingEvent && config.editableEvents.resizeX) {
        resizeState.cellEl = getCellUnderMouse(clientX, clientY);
      }
    };
    const onBodyMouseleave = () => {
      cursorYPercent.value = null;
    };
    const getCellUnderMouse = (mouseX, mouseY) => {
      const element = document.elementFromPoint(mouseX, mouseY);
      console.log(element == null ? void 0 : element.closest(".vuecal__cell"));
      return (element == null ? void 0 : element.closest(".vuecal__cell")) || null;
    };
    onMounted(() => {
      bodyEl.value.addEventListener("mousemove", onBodyMousemove);
      bodyEl.value.addEventListener("touchmove", onBodyMousemove);
      bodyEl.value.addEventListener("mouseleave", onBodyMouseleave);
      bodyEl.value.addEventListener("touchend", onBodyMouseleave);
    });
    onBeforeUnmount(() => {
      if (bodyEl.value) {
        bodyEl.value.removeEventListener("mousemove", onBodyMousemove);
        bodyEl.value.removeEventListener("touchmove", onBodyMousemove);
        bodyEl.value.removeEventListener("mouseleave", onBodyMouseleave);
        bodyEl.value.removeEventListener("touchend", onBodyMouseleave);
      }
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        class: "vuecal__body",
        ref_key: "bodyEl",
        ref: bodyEl,
        style: normalizeStyle(bodyStyles.value)
      }, [
        createVNode(Transition, { name: "vuecal-shrink" }, {
          default: withCtx(() => [
            unref(config).timeAtCursor && cursorYPercent.value !== null ? (openBlock(), createElementBlock("div", {
              key: 0,
              class: "vuecal__time-at-cursor",
              style: normalizeStyle(timeAtCursor.value.style)
            }, [
              createElementVNode("label", null, toDisplayString(timeAtCursor.value.time), 1)
            ], 4)) : createCommentVNode("", true)
          ]),
          _: 1
        }),
        (openBlock(true), createElementBlock(Fragment, null, renderList(unref(view).cellDates, (date, i) => {
          return openBlock(), createBlock(_sfc_main$4, {
            key: i,
            start: date.start,
            end: date.end,
            index: i
          }, createSlots({ _: 2 }, [
            _ctx.$slots.cell ? {
              name: "cell",
              fn: withCtx((params) => [
                renderSlot(_ctx.$slots, "cell", mergeProps({ ref_for: true }, params))
              ]),
              key: "0"
            } : void 0,
            _ctx.$slots["cell-date"] ? {
              name: "cell-date",
              fn: withCtx((params) => [
                renderSlot(_ctx.$slots, "cell-date", mergeProps({ ref_for: true }, params))
              ]),
              key: "1"
            } : void 0,
            _ctx.$slots["cell-content"] ? {
              name: "cell-content",
              fn: withCtx((params) => [
                renderSlot(_ctx.$slots, "cell-content", mergeProps({ ref_for: true }, params))
              ]),
              key: "2"
            } : void 0,
            _ctx.$slots["cell-events"] ? {
              name: "cell-events",
              fn: withCtx((params) => [
                renderSlot(_ctx.$slots, "cell-events", mergeProps({ ref_for: true }, params))
              ]),
              key: "3"
            } : void 0,
            _ctx.$slots[`event.${unref(view).id}`] ? {
              name: `event.${unref(view).id}`,
              fn: withCtx((params) => [
                renderSlot(_ctx.$slots, `event.${unref(view).id}`, mergeProps({ ref_for: true }, params))
              ]),
              key: "4"
            } : void 0,
            _ctx.$slots["event.all-day"] ? {
              name: "event.all-day",
              fn: withCtx((params) => [
                renderSlot(_ctx.$slots, "event.all-day", mergeProps({ ref_for: true }, params))
              ]),
              key: "5"
            } : void 0,
            _ctx.$slots.event ? {
              name: "event",
              fn: withCtx((params) => [
                renderSlot(_ctx.$slots, "event", mergeProps({ ref_for: true }, params))
              ]),
              key: "6"
            } : void 0,
            _ctx.$slots["event-count"] ? {
              name: "event-count",
              fn: withCtx((params) => [
                renderSlot(_ctx.$slots, "event-count", mergeProps({ ref_for: true }, params))
              ]),
              key: "7"
            } : void 0,
            _ctx.$slots["now-line"] ? {
              name: "now-line",
              fn: withCtx((params) => [
                renderSlot(_ctx.$slots, "now-line", mergeProps({ ref_for: true }, params))
              ]),
              key: "8"
            } : void 0
          ]), 1032, ["start", "end", "index"]);
        }), 128))
      ], 4);
    };
  }
};
const _hoisted_1 = ["data-locale"];
const _hoisted_2 = { class: "vuecal__scrollable-wrap" };
const _hoisted_3 = {
  key: 1,
  class: "vuecal__week-numbers"
};
const _hoisted_4 = { class: "vuecal__week-number" };
const _hoisted_5 = { class: "vuecal__body-wrap" };
const _sfc_main = {
  __name: "index",
  props,
  emits: [
    "ready",
    "view-change",
    "update:view",
    "update:selectedDate",
    "update:viewDate",
    "update:events",
    "event-delete",
    "event-created",
    "event-dropped",
    "event-drag-start",
    "event-drag-end"
  ],
  setup(__props, { expose: __expose, emit: __emit }) {
    const props2 = __props;
    const emit = __emit;
    const vuecalEl = useTemplateRef("vuecal-el");
    const vuecal = useVueCal({ props: props2, emit, attrs: useAttrs(), vuecalEl, uid: useId() });
    const { config, view, dateUtils, touch: touchState } = vuecal;
    const hasTimeColumn = computed(() => config.time && (view.isDay || view.isDays || view.isWeek));
    const weekNumbers = computed(() => {
      return Array(view.rows).fill().map((v, i) => {
        return dateUtils.getWeek(dateUtils.addDays(view.firstCellDate, 7 * i));
      });
    });
    const wrapperClasses = computed(() => {
      var _a;
      return {
        "vuecal--ready": config.ready,
        [`vuecal--${config.theme}-theme`]: config.theme,
        [`vuecal--${config.size}`]: true,
        "vuecal--date-picker": config.datePicker,
        "vuecal--dark": config.dark,
        "vuecal--light": !config.dark,
        [`vuecal--${view.id}-view`]: true,
        "vuecal--view-has-time": hasTimeColumn.value,
        "vuecal--timeless": !config.time,
        "vuecal--dragging-cell": touchState.isDraggingCell,
        "vuecal--dragging-event": touchState.isDraggingEvent,
        "vuecal--resizing-event": touchState.isResizingEvent,
        "vuecal--has-schedules": (_a = config.schedules) == null ? void 0 : _a.length,
        "vuecal--horizontal": config.horizontal
      };
    });
    const wrapperStyles = computed(() => ({
      "--vuecal-time-cell-height": config.timeCellHeight && `${config.timeCellHeight}px`
    }));
    const scrollableElClasses = computed(() => {
      var _a, _b;
      return {
        "vuecal__scrollable--row": hasTimeColumn.value || config.weekNumbers && view.isMonth,
        // Keep the states inside the Vue transition wrapper for smooth CSS transitions.
        [`vuecal__scrollable--${view.id}-view`]: true,
        "vuecal__scrollable--has-schedules": (_a = config.schedules) == null ? void 0 : _a.length,
        "vuecal__scrollable--no-schedules": !((_b = config.schedules) == null ? void 0 : _b.length),
        "vuecal__scrollable--no-all-day-bar": !config.allDayEvents,
        "vuecal__scrollable--has-all-day-bar": config.allDayEvents
      };
    });
    const contextMenuHandler = (e) => {
      if (e.target.closest(".vuecal__cell")) e.preventDefault();
    };
    onMounted(async () => {
      if (typeof window !== "undefined" && window.hasOwnProperty("ontouchstart")) {
        vuecalEl.value.addEventListener("contextmenu", contextMenuHandler);
      }
      await nextTick();
      config.ready = true;
      emit("ready", { config, view });
    });
    onBeforeUnmount(() => {
      var _a;
      (_a = vuecalEl == null ? void 0 : vuecalEl.value) == null ? void 0 : _a.removeEventListener("contextmenu", contextMenuHandler);
    });
    provide("vuecal", vuecal);
    provide("$vuecalEl", vuecalEl);
    __expose({ view: vuecal.view });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        class: normalizeClass(["vuecal", wrapperClasses.value]),
        ref: "vuecal-el",
        "data-locale": _ctx.locale,
        style: normalizeStyle(wrapperStyles.value)
      }, [
        _ctx.$slots.diy ? renderSlot(_ctx.$slots, "diy", {
          key: 0,
          vuecal: unref(vuecal)
        }) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
          createVNode(_sfc_main$6, null, createSlots({ _: 2 }, [
            _ctx.$slots.header ? {
              name: "header",
              fn: withCtx((params) => [
                renderSlot(_ctx.$slots, "header", normalizeProps(guardReactiveProps(params)))
              ]),
              key: "0"
            } : void 0,
            !_ctx.$slots.header && _ctx.$slots["previous-button"] ? {
              name: "previous-button",
              fn: withCtx((params) => [
                renderSlot(_ctx.$slots, "previous-button", normalizeProps(guardReactiveProps(params)))
              ]),
              key: "1"
            } : void 0,
            !_ctx.$slots.header && _ctx.$slots["next-button"] ? {
              name: "next-button",
              fn: withCtx((params) => [
                renderSlot(_ctx.$slots, "next-button", normalizeProps(guardReactiveProps(params)))
              ]),
              key: "2"
            } : void 0,
            !_ctx.$slots.header && _ctx.$slots["today-button"] ? {
              name: "today-button",
              fn: withCtx((params) => [
                renderSlot(_ctx.$slots, "today-button", normalizeProps(guardReactiveProps(params)))
              ]),
              key: "3"
            } : void 0,
            !_ctx.$slots.header && _ctx.$slots.title ? {
              name: "title",
              fn: withCtx((params) => [
                renderSlot(_ctx.$slots, "title", normalizeProps(guardReactiveProps(params)))
              ]),
              key: "4"
            } : void 0,
            !_ctx.$slots.header && _ctx.$slots["title.day"] ? {
              name: "title.day",
              fn: withCtx((params) => [
                renderSlot(_ctx.$slots, "title.day", normalizeProps(guardReactiveProps(params)))
              ]),
              key: "5"
            } : void 0,
            !_ctx.$slots.header && _ctx.$slots["title.days"] ? {
              name: "title.days",
              fn: withCtx((params) => [
                renderSlot(_ctx.$slots, "title.days", normalizeProps(guardReactiveProps(params)))
              ]),
              key: "6"
            } : void 0,
            !_ctx.$slots.header && _ctx.$slots["title.week"] ? {
              name: "title.week",
              fn: withCtx((params) => [
                renderSlot(_ctx.$slots, "title.week", normalizeProps(guardReactiveProps(params)))
              ]),
              key: "7"
            } : void 0,
            !_ctx.$slots.header && _ctx.$slots["title.month"] ? {
              name: "title.month",
              fn: withCtx((params) => [
                renderSlot(_ctx.$slots, "title.month", normalizeProps(guardReactiveProps(params)))
              ]),
              key: "8"
            } : void 0,
            !_ctx.$slots.header && _ctx.$slots["title.year"] ? {
              name: "title.year",
              fn: withCtx((params) => [
                renderSlot(_ctx.$slots, "title.year", normalizeProps(guardReactiveProps(params)))
              ]),
              key: "9"
            } : void 0,
            !_ctx.$slots.header && _ctx.$slots["title.years"] ? {
              name: "title.years",
              fn: withCtx((params) => [
                renderSlot(_ctx.$slots, "title.years", normalizeProps(guardReactiveProps(params)))
              ]),
              key: "10"
            } : void 0,
            !_ctx.$slots.header && _ctx.$slots["schedule-heading"] ? {
              name: "schedule-heading",
              fn: withCtx((params) => [
                renderSlot(_ctx.$slots, "schedule-heading", normalizeProps(guardReactiveProps(params)))
              ]),
              key: "11"
            } : void 0
          ]), 1024),
          createElementVNode("div", _hoisted_2, [
            createVNode(Transition, {
              name: `vuecal-slide-fade--${unref(view).transitionDirection}`
            }, {
              default: withCtx(() => [
                (openBlock(), createElementBlock("div", {
                  class: normalizeClass(["vuecal__scrollable", scrollableElClasses.value]),
                  key: unref(view).id + unref(view).start.getTime()
                }, [
                  hasTimeColumn.value ? (openBlock(), createBlock(_sfc_main$2, { key: 0 }, createSlots({ _: 2 }, [
                    _ctx.$slots["time-cell"] ? {
                      name: "time-cell",
                      fn: withCtx((params) => [
                        renderSlot(_ctx.$slots, "time-cell", normalizeProps(guardReactiveProps(params)))
                      ]),
                      key: "0"
                    } : void 0
                  ]), 1024)) : createCommentVNode("", true),
                  unref(config).weekNumbers && unref(view).isMonth ? (openBlock(), createElementBlock("div", _hoisted_3, [
                    (openBlock(true), createElementBlock(Fragment, null, renderList(weekNumbers.value, (i) => {
                      return openBlock(), createElementBlock("div", _hoisted_4, [
                        renderSlot(_ctx.$slots, "week-number", {}, () => [
                          createElementVNode("small", null, toDisplayString(i), 1)
                        ])
                      ]);
                    }), 256))
                  ])) : createCommentVNode("", true),
                  createElementVNode("div", _hoisted_5, [
                    createVNode(_sfc_main$3, null, createSlots({ _: 2 }, [
                      _ctx.$slots["weekday-heading"] ? {
                        name: "weekday-heading",
                        fn: withCtx((params) => [
                          renderSlot(_ctx.$slots, "weekday-heading", normalizeProps(guardReactiveProps(params)))
                        ]),
                        key: "0"
                      } : void 0,
                      _ctx.$slots["schedule-heading"] ? {
                        name: "schedule-heading",
                        fn: withCtx((params) => [
                          renderSlot(_ctx.$slots, "schedule-heading", normalizeProps(guardReactiveProps(params)))
                        ]),
                        key: "1"
                      } : void 0,
                      _ctx.$slots["event.all-day"] ? {
                        name: "event.all-day",
                        fn: withCtx((params) => [
                          renderSlot(_ctx.$slots, "event.all-day", normalizeProps(guardReactiveProps(params)))
                        ]),
                        key: "2"
                      } : void 0,
                      _ctx.$slots.event ? {
                        name: "event",
                        fn: withCtx((params) => [
                          renderSlot(_ctx.$slots, "event", normalizeProps(guardReactiveProps(params)))
                        ]),
                        key: "3"
                      } : void 0
                    ]), 1024),
                    createVNode(_sfc_main$1, null, createSlots({ _: 2 }, [
                      _ctx.$slots.cell ? {
                        name: "cell",
                        fn: withCtx((params) => [
                          renderSlot(_ctx.$slots, "cell", normalizeProps(guardReactiveProps(params)))
                        ]),
                        key: "0"
                      } : void 0,
                      !_ctx.$slots.cell && _ctx.$slots["cell-date"] ? {
                        name: "cell-date",
                        fn: withCtx((params) => [
                          renderSlot(_ctx.$slots, "cell-date", normalizeProps(guardReactiveProps(params)))
                        ]),
                        key: "1"
                      } : void 0,
                      !_ctx.$slots.cell && _ctx.$slots["cell-content"] ? {
                        name: "cell-content",
                        fn: withCtx((params) => [
                          renderSlot(_ctx.$slots, "cell-content", normalizeProps(guardReactiveProps(params)))
                        ]),
                        key: "2"
                      } : void 0,
                      !_ctx.$slots.cell && _ctx.$slots["cell-events"] ? {
                        name: "cell-events",
                        fn: withCtx((params) => [
                          renderSlot(_ctx.$slots, "cell-events", normalizeProps(guardReactiveProps(params)))
                        ]),
                        key: "3"
                      } : void 0,
                      !_ctx.$slots.cell && !_ctx.$slots["cell-events"] && _ctx.$slots["event.all-day"] ? {
                        name: "event.all-day",
                        fn: withCtx((params) => [
                          renderSlot(_ctx.$slots, "event.all-day", normalizeProps(guardReactiveProps(params)))
                        ]),
                        key: "4"
                      } : void 0,
                      !_ctx.$slots.cell && !_ctx.$slots["cell-events"] && _ctx.$slots[`event.${unref(view).id}`] ? {
                        name: `event.${unref(view).id}`,
                        fn: withCtx((params) => [
                          renderSlot(_ctx.$slots, `event.${unref(view).id}`, normalizeProps(guardReactiveProps(params)))
                        ]),
                        key: "5"
                      } : void 0,
                      !_ctx.$slots.cell && !_ctx.$slots["cell-events"] && _ctx.$slots.event ? {
                        name: "event",
                        fn: withCtx((params) => [
                          renderSlot(_ctx.$slots, "event", normalizeProps(guardReactiveProps(params)))
                        ]),
                        key: "6"
                      } : void 0,
                      !_ctx.$slots.cell && _ctx.$slots["event-count"] ? {
                        name: "event-count",
                        fn: withCtx((params) => [
                          renderSlot(_ctx.$slots, "event-count", normalizeProps(guardReactiveProps(params)))
                        ]),
                        key: "7"
                      } : void 0,
                      _ctx.$slots["now-line"] ? {
                        name: "now-line",
                        fn: withCtx((params) => [
                          renderSlot(_ctx.$slots, "now-line", normalizeProps(guardReactiveProps(params)))
                        ]),
                        key: "8"
                      } : void 0
                    ]), 1024)
                  ])
                ], 2))
              ]),
              _: 3
            }, 8, ["name"])
          ])
        ], 64))
      ], 14, _hoisted_1);
    };
  }
};
const useLocale = (texts) => {
  globalState.texts = { ...defaults.texts, ...texts };
  globalState.dateUtils.updateTexts(globalState.texts);
};
const {
  addDatePrototypes,
  removeDatePrototypes,
  updateTexts,
  addDays,
  subtractDays,
  addHours,
  subtractHours,
  addMinutes,
  subtractMinutes,
  getWeek,
  isToday,
  isSameDate,
  isInRange,
  isLeapYear,
  getPreviousFirstDayOfWeek,
  stringToDate,
  dateToMinutes,
  countDays,
  datesInSameTimeStep,
  isValid: isValidDate,
  formatDate,
  formatDateLite,
  formatTime,
  formatTimeLite,
  formatMinutes
} = globalState.dateUtils;
export {
  _sfc_main as VueCal,
  addDatePrototypes,
  addDays,
  addHours,
  addMinutes,
  countDays,
  dateToMinutes,
  datesInSameTimeStep,
  formatDate,
  formatDateLite,
  formatMinutes,
  formatTime,
  formatTimeLite,
  getPreviousFirstDayOfWeek,
  getWeek,
  isInRange,
  isLeapYear,
  isSameDate,
  isToday,
  isValidDate,
  removeDatePrototypes,
  stringToDate,
  subtractDays,
  subtractHours,
  subtractMinutes,
  updateTexts,
  useLocale
};
