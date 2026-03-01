(function(global, factory) {
  typeof exports === "object" && typeof module !== "undefined" ? factory(exports, require("vue")) : typeof define === "function" && define.amd ? define(["exports", "vue"], factory) : (global = typeof globalThis !== "undefined" ? globalThis : global || self, factory(global.vuecal = {}, global.Vue));
})(this, (function(exports2, vue) {
  "use strict";/**
  * vue-cal v5.0.1-rc.34
  * (c) 2024-2026 Antoni Andre <antoniandre.web@gmail.com>
  * @license MIT
  */

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
  const months$N = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const weekdays = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const weekdaysMap = weekdays.reduce((obj, day2, i) => {
    obj[day2] = i || 7;
    return obj;
  }, {});
  const useConfig = (vuecal, props2, attrs) => {
    const { dateUtils } = vuecal;
    const ready = false;
    const view = vue.computed(() => {
      if (availableViews.value[props2.view]) return props2.view;
      const fallbackView = props2.datePicker ? "month" : "week";
      const view2 = props2.view || fallbackView;
      if (availableViews.value[view2]) return view2;
      console.warn(
        `Vue Cal: the provided or default view \`${view2}\` is either invalid or not in the list of available views. The first available view will be chosen: \`${Object.keys(availableViews.value)[0]}\`.`
      );
      return Object.keys(availableViews.value)[0];
    });
    const sm = vue.computed(() => props2.sm && !props2.xs);
    const xs = vue.computed(() => props2.xs || props2.datePicker);
    const clickToNavigate = vue.computed(() => props2.clickToNavigate || props2.datePicker && props2.clickToNavigate !== false);
    const eventListeners = vue.computed(() => {
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
    const hideWeekdays = vue.computed(() => {
      var _a;
      const weekDays2 = {};
      if (props2.hideWeekends) (weekDays2[6] = true) && (weekDays2[7] = true);
      if ((_a = props2.hideWeekdays) == null ? void 0 : _a.length) props2.hideWeekdays.forEach((day2) => weekDays2[weekdaysMap[day2]] = true);
      return weekDays2;
    });
    const hideWeekends = vue.computed(() => props2.hideWeekends || hideWeekdays.value[6] && hideWeekdays.value[7]);
    const availableViews = vue.computed(() => {
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
          availViews = Object.entries(views).reduce((obj, [id2, size]) => {
            const { cols, rows } = defaults.availableViews[id2];
            obj[id2] = { cols: size.cols || cols, rows: size.rows || rows };
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
    const defaultView = vue.computed(() => {
      if (props2.datePicker) return "month";
      if (availableViews.value.week) return "week";
      return Object.keys(availableViews.value)[0];
    });
    const selectedDate = vue.computed(() => {
      if (typeof props2.selectedDate === "string") return dateUtils.stringToDate(props2.selectedDate);
      if (props2.selectedDate instanceof Date) return props2.selectedDate;
      if (!props2.selectedDate) console.log("Vue Cal: Info - The provided selected date is undefined.");
      else console.warn("Vue Cal: The provided selected date is invalid:", props2.selectedDate);
    });
    const disableDays = vue.computed(() => {
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
    const minTimestamp = vue.computed(() => {
      let date = null;
      if (props2.minDate && typeof props2.minDate === "string") date = dateUtils.stringToDate(props2.minDate);
      else if (props2.minDate && props2.minDate instanceof Date) date = props2.minDate;
      return (date == null ? void 0 : date.getTime()) || null;
    });
    const maxTimestamp = vue.computed(() => {
      let date = null;
      if (props2.maxDate && typeof props2.maxDate === "string") date = dateUtils.stringToDate(props2.maxDate);
      else if (props2.maxDate && props2.maxDate instanceof Date) date = props2.maxDate;
      return (date == null ? void 0 : date.getTime()) || null;
    });
    const schedules = vue.computed(() => {
      var _a;
      const { view: view2 } = vuecal;
      const show = props2.schedules.length && (view2.isDay || view2.isDays || view2.isWeek);
      return show && ((_a = props2.schedules) == null ? void 0 : _a.map((s, i) => ({ ...s, id: s.id ?? i + 1 }))) || void 0;
    });
    const editableEvents = vue.computed(() => {
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
    const showCellEventCount = vue.computed(() => {
      const { view: view2 } = vuecal;
      const { eventCount } = props2;
      const showEventCount = Array.isArray(eventCount) ? eventCount.includes(view2.id) : eventCount;
      return showEventCount && (view2.isMonth && !props2.eventsOnMonthView || view2.isYear);
    });
    const allDayEvents = vue.computed(() => props2.allDayEvents && props2.time !== false && !view.isMonth);
    const timeAtCursor = vue.computed(() => props2.timeAtCursor && props2.time !== false);
    const loadTexts = async (locale) => {
      var _a;
      let translations = /* @__PURE__ */ Object.assign({ "../i18n/ar.json": () => Promise.resolve().then(() => ar$1).then((m) => m["default"]), "../i18n/bg.json": () => Promise.resolve().then(() => bg$1).then((m) => m["default"]), "../i18n/bn.json": () => Promise.resolve().then(() => bn$1).then((m) => m["default"]), "../i18n/bs.json": () => Promise.resolve().then(() => bs$1).then((m) => m["default"]), "../i18n/ca.json": () => Promise.resolve().then(() => ca$1).then((m) => m["default"]), "../i18n/cs.json": () => Promise.resolve().then(() => cs$1).then((m) => m["default"]), "../i18n/da.json": () => Promise.resolve().then(() => da$1).then((m) => m["default"]), "../i18n/de.json": () => Promise.resolve().then(() => de$1).then((m) => m["default"]), "../i18n/el.json": () => Promise.resolve().then(() => el$1).then((m) => m["default"]), "../i18n/en-gb.json": () => Promise.resolve().then(() => enGb$1).then((m) => m["default"]), "../i18n/en-us.json": () => Promise.resolve().then(() => enUs).then((m) => m["default"]), "../i18n/es.json": () => Promise.resolve().then(() => es$1).then((m) => m["default"]), "../i18n/et.json": () => Promise.resolve().then(() => et$1).then((m) => m["default"]), "../i18n/fa.json": () => Promise.resolve().then(() => fa$1).then((m) => m["default"]), "../i18n/fi.json": () => Promise.resolve().then(() => fi$1).then((m) => m["default"]), "../i18n/fr.json": () => Promise.resolve().then(() => fr$1).then((m) => m["default"]), "../i18n/he.json": () => Promise.resolve().then(() => he$1).then((m) => m["default"]), "../i18n/hr.json": () => Promise.resolve().then(() => hr$1).then((m) => m["default"]), "../i18n/hu.json": () => Promise.resolve().then(() => hu$1).then((m) => m["default"]), "../i18n/id.json": () => Promise.resolve().then(() => id$1).then((m) => m["default"]), "../i18n/is.json": () => Promise.resolve().then(() => is$1).then((m) => m["default"]), "../i18n/it.json": () => Promise.resolve().then(() => it$1).then((m) => m["default"]), "../i18n/ja.json": () => Promise.resolve().then(() => ja$1).then((m) => m["default"]), "../i18n/ka.json": () => Promise.resolve().then(() => ka$1).then((m) => m["default"]), "../i18n/kaa.json": () => Promise.resolve().then(() => kaa$1).then((m) => m["default"]), "../i18n/kk.json": () => Promise.resolve().then(() => kk$1).then((m) => m["default"]), "../i18n/ko.json": () => Promise.resolve().then(() => ko$1).then((m) => m["default"]), "../i18n/ky.json": () => Promise.resolve().then(() => ky$1).then((m) => m["default"]), "../i18n/lt.json": () => Promise.resolve().then(() => lt$1).then((m) => m["default"]), "../i18n/mn.json": () => Promise.resolve().then(() => mn$1).then((m) => m["default"]), "../i18n/nl.json": () => Promise.resolve().then(() => nl$1).then((m) => m["default"]), "../i18n/no.json": () => Promise.resolve().then(() => no$1).then((m) => m["default"]), "../i18n/pl.json": () => Promise.resolve().then(() => pl$1).then((m) => m["default"]), "../i18n/pt-br.json": () => Promise.resolve().then(() => ptBr$1).then((m) => m["default"]), "../i18n/pt-pt.json": () => Promise.resolve().then(() => ptPt$1).then((m) => m["default"]), "../i18n/ro.json": () => Promise.resolve().then(() => ro$1).then((m) => m["default"]), "../i18n/ru.json": () => Promise.resolve().then(() => ru$1).then((m) => m["default"]), "../i18n/sk.json": () => Promise.resolve().then(() => sk$1).then((m) => m["default"]), "../i18n/sl.json": () => Promise.resolve().then(() => sl$1).then((m) => m["default"]), "../i18n/sq.json": () => Promise.resolve().then(() => sq$1).then((m) => m["default"]), "../i18n/sr.json": () => Promise.resolve().then(() => sr$1).then((m) => m["default"]), "../i18n/sv.json": () => Promise.resolve().then(() => sv$1).then((m) => m["default"]), "../i18n/tr.json": () => Promise.resolve().then(() => tr$1).then((m) => m["default"]), "../i18n/uk.json": () => Promise.resolve().then(() => uk$1).then((m) => m["default"]), "../i18n/uz-cryl.json": () => Promise.resolve().then(() => uzCryl$1).then((m) => m["default"]), "../i18n/uz.json": () => Promise.resolve().then(() => uz$1).then((m) => m["default"]), "../i18n/vi.json": () => Promise.resolve().then(() => vi$1).then((m) => m["default"]), "../i18n/zh-cn.json": () => Promise.resolve().then(() => zhCn$1).then((m) => m["default"]), "../i18n/zh-hk.json": () => Promise.resolve().then(() => zhHk$1).then((m) => m["default"]) });
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
    const events = vue.reactive(props2.events || []);
    vue.watch(() => props2.events, (evts) => events.splice(0, events.length, ...evts));
    vue.watch(() => props2.locale, (newLocale) => loadTexts(newLocale || "en-us"));
    if (props2.locale || !vuecal.texts.today) loadTexts(props2.locale || "en-us");
    return {
      ...vue.toRefs(props2),
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
  const viewBeforeDrag = vue.reactive({ id: null, date: null });
  let viewChanged = false;
  let cancelViewChange = true;
  const dragOverCell = vue.reactive({ el: null, cell: null, timeout: null });
  const dragging = vue.reactive({
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
    const texts = vue.ref(initTexts);
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
    const events = vue.computed(() => {
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
    const getEvent = (id2) => events.value.byId[id2];
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
        const id2 = e._.id;
        if (!cellOverlaps[id2]) cellOverlaps[id2] = { overlaps: /* @__PURE__ */ new Set(), maxConcurrent: 1, position: 0 };
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
        cellOverlaps[id2].position = position;
        activeEvents.push(e);
        const inheritedMax = Math.max(1, ...currentOverlaps.map((ev) => {
          var _a;
          return ((_a = cellOverlaps[ev._.id]) == null ? void 0 : _a.maxConcurrent) ?? 1;
        }));
        cellOverlaps[id2].maxConcurrent = Math.max(currentOverlaps.length + 1, inheritedMax);
        for (const activeEvent of currentOverlaps) {
          cellOverlaps[activeEvent._.id].overlaps.add(id2);
          cellOverlaps[id2].overlaps.add(activeEvent._.id);
          cellOverlaps[activeEvent._.id].maxConcurrent = cellOverlaps[id2].maxConcurrent;
        }
        maxConcurrent = Math.max(maxConcurrent, cellOverlaps[id2].maxConcurrent);
      }
      for (const id2 in cellOverlaps) cellOverlaps[id2].overlaps = [...cellOverlaps[id2].overlaps];
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
    const resizeState = vue.reactive({
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
    const viewId = vue.ref(config.view && availableViews[config.view] ? config.view : config.defaultView);
    const selectedDate = vue.ref(config.selectedDate || null);
    const now = vue.ref(/* @__PURE__ */ new Date());
    const viewDate = vue.ref(new Date(config.viewDate || now.value));
    viewDate.value.setHours(0, 0, 0, 0);
    const startTheoretical = vue.ref(new Date(viewDate));
    let timeTickerId = null;
    const start = vue.computed(() => {
      if (viewId.value === "month") return startTheoretical.value;
      return firstCellDate.value;
    });
    const end = vue.computed(() => {
      if (viewId.value === "month") return new Date(startTheoretical.value.getFullYear(), startTheoretical.value.getMonth() + 1, 0, 23, 59, 59, 999);
      return lastCellDate.value;
    });
    const extendedStart = vue.computed(() => {
      if (viewId.value === "week") return dateUtils.getPreviousFirstDayOfWeek(firstCellDate.value, config.startWeekOnSunday);
      if (viewId.value === "month") return firstCellDate.value;
      return start.value;
    });
    const extendedEnd = vue.computed(() => {
      if (viewId.value === "week") {
        const endWeek = dateUtils.addDays(extendedStart.value, 7);
        endWeek.setMilliseconds(-1);
        return endWeek;
      }
      if (viewId.value === "month") return lastCellDate.value;
      return end.value;
    });
    const containsToday = vue.computed(() => {
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
    const cols = vue.computed(() => {
      if (!config.availableViews[viewId.value]) return 1;
      let cols2 = config.availableViews[viewId.value].cols;
      if (config.hasHiddenDays && ["week", "month"].includes(viewId.value)) cols2 -= config.hasHiddenDays;
      return cols2;
    });
    const rows = vue.computed(() => {
      var _a;
      return ((_a = config.availableViews[viewId.value]) == null ? void 0 : _a.rows) || 1;
    });
    const cellsCount = vue.computed(() => cols.value * rows.value);
    const firstCellDate = vue.computed(() => {
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
    const cellDates = vue.computed(() => {
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
    const lastCellDate = vue.computed(() => cellDates.value[cellDates.value.length - 1].end);
    const transitionDirection = vue.ref("right");
    const broaderView = vue.computed(() => {
      const availableViews2 = Object.keys(config.availableViews);
      return availableViews2[availableViews2.indexOf(viewId.value) + 1];
    });
    const narrowerView = vue.computed(() => {
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
    const title = vue.computed(() => {
      const { dateFormat: dateFormat2, months: months2, monthsGenitive: monthsGenitive2, week: weekText, truncations: truncations2 } = texts;
      const locale = config.locale;
      const canTruncate = truncations2 !== false;
      const monthBeforeDay = dateFormat2.indexOf("M") < dateFormat2.indexOf("D");
      const monthsArray = monthsGenitive2 && locale === "el" ? monthsGenitive2 : months2;
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
        await vue.nextTick();
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
    function switchView(id2, emitUpdate = true, date = null) {
      const availableViews2 = Object.keys(config.availableViews);
      if (viewId.value === id2 && !date) return;
      if (availableViews2.includes(id2)) {
        transitionDirection.value = availableViews2.indexOf(id2) < availableViews2.indexOf(viewId.value) ? "left" : "right";
        if (emitUpdate && viewId.value !== id2) emit("update:view", id2);
        viewId.value = id2;
        if (date) updateViewDate(date);
        else updateView();
      } else !!console.warn(`Vue Cal: the \`${id2}\` view is not available.`);
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
    const events = vue.computed(() => eventsManager.getViewEvents(cellDates.value));
    const createEvent2 = eventsManager.createEvent;
    const deleteEvent2 = eventsManager.deleteEvent;
    vue.watch(() => config.view, (view) => switchView(view, false));
    vue.watch(() => config.availableViews, updateViewIfNeeded);
    vue.watch(() => config.datePicker, () => switchView("month"));
    vue.watch(() => config.viewDate, (date) => updateViewDate(date, false));
    vue.watch(() => config.selectedDate, (date) => updateSelectedDate(date, false));
    vue.watch(() => config.startWeekOnSunday, (bool) => switchWeekStart(bool));
    vue.watch(() => config.hideWeekends, (bool) => toggleWeekends(bool));
    vue.watch(() => config.hideWeekdays, toggleWeekdays);
    vue.watch(() => cellsCount.value, () => {
      if (cellsCount.value > 90) console.warn("Vue Cal: high cell count detected. Performance may degrade when interactions are enabled.");
    });
    vue.watch(() => config.watchRealTime, (watchRealTime) => {
      if (watchRealTime && config.time) initTimeTicker();
      else timeTickerId = clearTimeout(timeTickerId);
    });
    updateView();
    if (config.time && config.watchRealTime) initTimeTicker();
    vue.onBeforeUnmount(() => timeTickerId = clearTimeout(timeTickerId));
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
      switch: (id2, date) => switchView(id2, true, date),
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
  const weekDays$M = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const months$M = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const years$M = "Years";
  const year$M = "Year";
  const month$M = "Month";
  const week$M = "Week";
  const days$I = "Days";
  const day$M = "Day";
  const today$M = "Today";
  const noEvent$M = "No Event";
  const allDay$M = "All-day";
  const deleteEvent$M = "Delete";
  const createEvent$M = "Create an event";
  const dateFormat$M = "dddd, MMMM D, YYYY";
  const am$1 = "am";
  const pm$1 = "pm";
  const EnUs = {
    weekDays: weekDays$M,
    months: months$M,
    years: years$M,
    year: year$M,
    month: month$M,
    week: week$M,
    days: days$I,
    day: day$M,
    today: today$M,
    noEvent: noEvent$M,
    allDay: allDay$M,
    deleteEvent: deleteEvent$M,
    createEvent: createEvent$M,
    dateFormat: dateFormat$M,
    am: am$1,
    pm: pm$1
  };
  const enUs = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    allDay: allDay$M,
    am: am$1,
    createEvent: createEvent$M,
    dateFormat: dateFormat$M,
    day: day$M,
    days: days$I,
    default: EnUs,
    deleteEvent: deleteEvent$M,
    month: month$M,
    months: months$M,
    noEvent: noEvent$M,
    pm: pm$1,
    today: today$M,
    week: week$M,
    weekDays: weekDays$M,
    year: year$M,
    years: years$M
  }, Symbol.toStringTag, { value: "Module" }));
  const globalState = vue.reactive({
    texts: { ...defaults.texts },
    // Make texts reactive before a locale is loaded.
    dateUtils: useDateUtils(defaults.texts, EnUs)
    // Some Date utils functions need localized texts.
  });
  const useVueCal = ({ props: props2, emit, attrs, vuecalEl, uid }) => {
    const state = vue.reactive({
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
      const vuecal = vue.inject("vuecal");
      const { view, config } = vuecal;
      const onTitleClick = () => {
        if (config.clickToNavigate) view.broader();
      };
      const titleEventHandlers = vue.computed(() => config.clickToNavigate ? { click: onTitleClick } : {});
      return (_ctx, _cache) => {
        return vue.openBlock(), vue.createElementBlock("div", _hoisted_1$5, [
          vue.renderSlot(_ctx.$slots, "header", {
            view: vue.unref(view),
            availableViews: vue.unref(config).availableViews,
            vuecal: vue.unref(vuecal)
          }),
          !_ctx.$slots.header ? (vue.openBlock(), vue.createElementBlock(vue.Fragment, { key: 0 }, [
            vue.unref(config).viewsBar ? (vue.openBlock(), vue.createElementBlock("div", _hoisted_2$5, [
              (vue.openBlock(true), vue.createElementBlock(vue.Fragment, null, vue.renderList(vue.unref(config).availableViews, (obj, id2) => {
                return vue.openBlock(), vue.createElementBlock("button", {
                  class: vue.normalizeClass(["vuecal__view-button", { "vuecal__view-button--active": vue.unref(view).id === id2 }]),
                  onClick: ($event) => vue.unref(view).switch(id2),
                  innerHTML: vue.unref(vuecal).texts[id2],
                  type: "button"
                }, null, 10, _hoisted_3$4);
              }), 256))
            ])) : vue.createCommentVNode("", true),
            vue.unref(config).titleBar ? (vue.openBlock(), vue.createElementBlock("nav", _hoisted_4$4, [
              vue.createElementVNode("button", {
                class: vue.normalizeClass(["vuecal__nav vuecal__nav--prev", { "vuecal__nav--default": !_ctx.$slots["previous-button"] }]),
                onClick: _cache[0] || (_cache[0] = (...args) => vue.unref(view).previous && vue.unref(view).previous(...args)),
                type: "button"
              }, [
                vue.renderSlot(_ctx.$slots, "previous-button")
              ], 2),
              vue.createElementVNode("div", _hoisted_5$4, [
                vue.createVNode(vue.Transition, {
                  name: `vuecal-slide-fade--${vue.unref(view).transitionDirection}`
                }, {
                  default: vue.withCtx(() => [
                    (vue.openBlock(), vue.createElementBlock("div", {
                      key: vue.unref(view).id + vue.unref(view).start.getTime()
                    }, [
                      _ctx.$slots.title || _ctx.$slots[`title.${vue.unref(view).id}`] ? (vue.openBlock(), vue.createBlock(vue.resolveDynamicComponent(vue.unref(config).clickToNavigate && vue.unref(view).broaderView ? "button" : "div"), vue.mergeProps({
                        key: 0,
                        class: "vuecal__title"
                      }, vue.toHandlers(titleEventHandlers.value)), {
                        default: vue.withCtx(() => [
                          _ctx.$slots[`title.${vue.unref(view).id}`] ? vue.renderSlot(_ctx.$slots, `title.${vue.unref(view).id}`, vue.normalizeProps(vue.mergeProps({ key: 0 }, vue.unref(view)))) : vue.renderSlot(_ctx.$slots, "title", vue.normalizeProps(vue.mergeProps({ key: 1 }, vue.unref(view))))
                        ]),
                        _: 3
                      }, 16)) : (vue.openBlock(), vue.createBlock(vue.resolveDynamicComponent(vue.unref(config).clickToNavigate && vue.unref(view).broaderView ? "button" : "div"), vue.mergeProps({
                        key: 1,
                        class: "vuecal__title"
                      }, vue.toHandlers(titleEventHandlers.value), {
                        innerHTML: vue.unref(view).title
                      }), null, 16, ["innerHTML"]))
                    ]))
                  ]),
                  _: 3
                }, 8, ["name"])
              ]),
              vue.unref(config).todayButton ? (vue.openBlock(), vue.createElementBlock(vue.Fragment, { key: 0 }, [
                _ctx.$slots["today-button"] ? vue.renderSlot(_ctx.$slots, "today-button", {
                  key: 0,
                  navigate: () => !vue.unref(view).containsToday && vue.unref(view).goToToday(),
                  active: vue.unref(view).containsToday
                }) : (vue.openBlock(), vue.createElementBlock("button", {
                  key: 1,
                  class: vue.normalizeClass(["vuecal__nav vuecal__nav--today vuecal__nav--default", { "vuecal__nav--active": vue.unref(view).containsToday }]),
                  onClick: _cache[1] || (_cache[1] = ($event) => !vue.unref(view).containsToday && vue.unref(view).goToToday()),
                  disabled: !!vue.unref(view).containsToday,
                  type: "button",
                  innerHTML: vue.unref(vuecal).texts.today
                }, null, 10, _hoisted_6$3))
              ], 64)) : vue.createCommentVNode("", true),
              vue.createElementVNode("button", {
                class: vue.normalizeClass(["vuecal__nav vuecal__nav--next", { "vuecal__nav--default": !_ctx.$slots["next-button"] }]),
                onClick: _cache[2] || (_cache[2] = (...args) => vue.unref(view).next && vue.unref(view).next(...args)),
                type: "button"
              }, [
                vue.renderSlot(_ctx.$slots, "next-button")
              ], 2)
            ])) : vue.createCommentVNode("", true)
          ], 64)) : vue.createCommentVNode("", true)
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
      const { config, view, dnd, touch: globalTouchState, dateUtils, eventsManager } = vue.inject("vuecal");
      const { handleEventResize } = eventsManager;
      const eventEl = vue.ref(null);
      const event = vue.reactive(props2.event);
      const touch = vue.reactive({
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
      const isDraggable = vue.computed(() => {
        return config.editableEvents.drag && event.draggable !== false && !event.background && touch.canTouchAndDrag !== false;
      });
      const isResizable = vue.computed(() => {
        if (view.isMonth || view.isYear || view.isYears || props2.inAllDayBar) return false;
        if (event._.multiday && !eventEndsInThisCell.value) return false;
        return config.time && config.editableEvents.resize && event.resizable !== false && !event.background;
      });
      vue.computed(() => config.editableEvents.delete && event.deletable !== false && !event.background);
      const classes = vue.computed(() => {
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
      const eventStartsInThisCell = vue.computed(() => {
        if (event._.multiday) {
          return new Date(event.start).setHours(0, 0, 0, 0) === props2.cellStart.getTime();
        }
        return true;
      });
      const eventEndsInThisCell = vue.computed(() => {
        if (event._.multiday) {
          return dateUtils.isSameDate(new Date(new Date(event.end).setMilliseconds(-1)), props2.cellEnd);
        }
        return true;
      });
      const plusDaysIndicator = vue.computed(() => {
        const start = new Date(event.start).setHours(0, 0, 0, 0);
        const end = new Date(event.end).setHours(0, 0, 0, 0);
        return Math.ceil((end - start) / (1e3 * 60 * 60 * 24));
      });
      const styles = vue.computed(() => {
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
      const eventListeners = vue.computed(() => {
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
      vue.onMounted(() => event._.register(eventEl.value));
      vue.onBeforeUnmount(() => {
        if (touch.holdTimer) touch.holdTimer = clearTimeout(touch.holdTimer);
        if (touch.touchAndDragTimer) touch.touchAndDragTimer = clearTimeout(touch.touchAndDragTimer);
        event._.unregister();
      });
      return (_ctx, _cache) => {
        return vue.openBlock(), vue.createElementBlock("div", vue.mergeProps({ class: "vuecal__event" }, vue.toHandlers(eventListeners.value, true), {
          ref_key: "eventEl",
          ref: eventEl,
          class: classes.value,
          style: styles.value,
          draggable: isDraggable.value ? "true" : void 0,
          onDragstart: _cache[2] || (_cache[2] = ($event) => isDraggable.value && vue.unref(dnd).eventDragStart($event, event)),
          onDragend: _cache[3] || (_cache[3] = ($event) => isDraggable.value && vue.unref(dnd).eventDragEnd($event, event))
        }), [
          vue.createElementVNode("div", _hoisted_2$4, [
            _ctx.$slots["event.all-day"] ? vue.renderSlot(_ctx.$slots, "event.all-day", {
              key: 0,
              event
            }) : _ctx.$slots[`event.${vue.unref(view).id}`] ? vue.renderSlot(_ctx.$slots, `event.${vue.unref(view).id}`, {
              key: 1,
              event
            }) : vue.renderSlot(_ctx.$slots, "event", {
              key: 2,
              event
            }, () => [
              vue.createElementVNode("div", _hoisted_3$3, vue.toDisplayString(event.title), 1),
              vue.unref(config).time && !__props.inAllDayBar && !(event._.multiday && !eventStartsInThisCell.value) ? (vue.openBlock(), vue.createElementBlock("div", _hoisted_4$3, [
                vue.unref(view).isMonth ? (vue.openBlock(), vue.createElementBlock("span", _hoisted_5$3, ",")) : vue.createCommentVNode("", true),
                vue.createElementVNode("span", _hoisted_6$2, vue.toDisplayString(event._[`startTimeFormatted${vue.unref(config).twelveHour ? 12 : 24}`]), 1),
                !vue.unref(view).isMonth ? (vue.openBlock(), vue.createElementBlock("span", _hoisted_7$2, [
                  vue.createTextVNode(" - " + vue.toDisplayString(event._[`endTimeFormatted${vue.unref(config).twelveHour ? 12 : 24}`]), 1),
                  event._.multiday && eventStartsInThisCell.value ? (vue.openBlock(), vue.createElementBlock("span", _hoisted_8$2, "+" + vue.toDisplayString(plusDaysIndicator.value) + "d", 1)) : vue.createCommentVNode("", true)
                ])) : vue.createCommentVNode("", true)
              ])) : vue.createCommentVNode("", true),
              !__props.inAllDayBar ? (vue.openBlock(), vue.createElementBlock("div", {
                key: 1,
                class: "vuecal__event-content",
                innerHTML: event.content
              }, null, 8, _hoisted_9$1)) : vue.createCommentVNode("", true)
            ])
          ]),
          isResizable.value ? (vue.openBlock(), vue.createElementBlock("div", {
            key: 0,
            class: "vuecal__event-resizer",
            onDragstart: _cache[0] || (_cache[0] = vue.withModifiers(() => {
            }, ["prevent", "stop"]))
          }, null, 32)) : vue.createCommentVNode("", true),
          vue.createVNode(vue.Transition, { name: "vuecal-delete-btn" }, {
            default: vue.withCtx(() => [
              event._.deleting ? (vue.openBlock(), vue.createElementBlock("div", {
                key: 0,
                class: "vuecal__event-delete",
                onClick: _cache[1] || (_cache[1] = vue.withModifiers(($event) => event.delete(3), ["stop"]))
              }, "Delete")) : vue.createCommentVNode("", true)
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
      const vuecal = vue.inject("vuecal");
      const { view, config, dateUtils, eventsManager, dnd, touch: globalTouchState } = vuecal;
      const isToday2 = vue.computed(() => dateUtils.isToday(props2.start));
      const cellEl = vue.ref(null);
      const eventsDeleted = vue.ref([]);
      const transitioning = vue.ref(false);
      const onEventDelete = (e) => {
        eventsDeleted.value.push(e.detail);
        transitioning.value = true;
      };
      const afterDelete = () => setTimeout(() => transitioning.value = false, 300);
      const touch = vue.reactive({
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
      const awaitingEventCreation = vue.ref(false);
      const overlappingEvents = vue.ref({ cellOverlaps: {}, longestStreak: 0 });
      const eventPlaceholder = vue.computed(() => {
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
      const isCreatingEvent = vue.computed(() => {
        const isCreating = config.editableEvents.create && (touch.dragging || awaitingEventCreation.value);
        const hasPassedMinDrag = config.eventCreateMinDrag && touch.thresholdPassed || !config.eventCreateMinDrag;
        const canCreateEvent = touch.canTouchAndDrag !== false;
        return isCreating && hasPassedMinDrag && canCreateEvent;
      });
      const classes = vue.computed(() => {
        var _a;
        const now = /* @__PURE__ */ new Date();
        const viewYear = view.start.getFullYear();
        const viewMonth = view.start.getMonth();
        const y = props2.start.getFullYear();
        const m = props2.start.getMonth();
        const weekday = weekdays[props2.start.getDay()];
        return {
          [`vuecal__cell--${weekday}`]: view.isDay || view.isDays || view.isWeek || view.isMonth,
          [`vuecal__cell--${months$N[m]}`]: view.isYear,
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
      vue.computed(() => dateUtils.formatDate(props2.start));
      const formattedCellDate = vue.computed(() => {
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
      const cellEvents = vue.computed(() => {
        if (config.datePicker) return [];
        return eventsManager.getEventsInRange(
          props2.start,
          props2.end,
          { excludeIds: eventsDeleted.value, ...config.allDayEvents ? { allDay: props2.allDay } : {} }
        );
      });
      const cellForegroundEvents = vue.computed(() => cellEvents.value.filter((event) => !event.background));
      const cellEventsPerSchedule = vue.computed(() => {
        var _a;
        return (_a = config.schedules) == null ? void 0 : _a.reduce((obj, schedule) => {
          obj[schedule.id] = cellEvents.value.filter((event) => event.schedule === schedule.id);
          return obj;
        }, {});
      });
      const eventStyles = vue.computed(() => {
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
      const eventClasses = vue.computed(() => {
        const classes2 = {};
        for (const event of cellEvents.value) {
          const eventId = event._.id;
          const { maxConcurrent = 1, position = 0 } = overlappingEvents.value.cellOverlaps[eventId] || {};
          classes2[eventId] = `vuecal__event--stack-${position + 1}-${maxConcurrent}`;
        }
        return classes2;
      });
      const showCellEventCount = vue.computed(() => {
        return config.showCellEventCount && cellForegroundEvents.value.length;
      });
      const specialHours = vue.computed(() => {
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
      const isBeforeMinDate = vue.computed(() => {
        return config.minTimestamp !== null && config.minTimestamp > props2.end.getTime();
      });
      const isAfterMaxDate = vue.computed(() => {
        return config.maxTimestamp && config.maxTimestamp < props2.start.getTime();
      });
      const isDisabled = vue.computed(() => {
        const { disableDays } = config;
        const isYearsOrYearView = view.isYear || view.isYears;
        if (disableDays.length && disableDays.includes(dateUtils.formatDate(props2.start)) && !isYearsOrYearView) return true;
        return isBeforeMinDate.value || isAfterMaxDate.value;
      });
      const nowLine = vue.reactive({
        show: vue.computed(() => {
          if (!view.isDay && !view.isDays && !view.isWeek) return;
          if (!isToday2.value || !config.time || props2.allDay) return;
          if (config.timeFrom > dateUtils.dateToMinutes(view.now)) return;
          if (dateUtils.dateToMinutes(view.now) > config.timeTo) return;
          return true;
        }),
        nowInMinutes: vue.computed(() => dateUtils.dateToMinutes(view.now)),
        todaysTimePosition: vue.computed(() => minutesToPercentage(nowLine.nowInMinutes, config)),
        style: vue.computed(() => `${config.horizontal ? "left" : "top"}: ${nowLine.todaysTimePosition}%`),
        currentTime: vue.computed(() => dateUtils.formatTime(view.now, config.twelveHour ? "h:mm {am}" : "HH:mm"))
      });
      const cellEventListeners = vue.computed(() => {
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
      const cellInfo = vue.computed(() => ({
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
      const cursorInfo = vue.computed(() => {
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
      vue.watch(
        // Watch event IDs and start/end dates (only) to detect event resizing/dnd.
        () => !view.isYears && !view.isYear && cellForegroundEvents.value.map((e) => `${e._.id}${e.start.getTime()}${e.end.getTime()}`).join(),
        async () => {
          await vue.nextTick();
          recalculateOverlaps();
        },
        { immediate: true, flush: "post" }
        // Use flush: 'post' to prevent infinite updates.
      );
      vue.onBeforeUnmount(async () => {
        for (const eventId of eventsDeleted.value) eventsManager.deleteEvent(eventId, 3);
        removeEventListeners();
        await vue.nextTick();
      });
      return (_ctx, _cache) => {
        return vue.openBlock(), vue.createElementBlock("div", vue.mergeProps({
          class: ["vuecal__cell", classes.value],
          ref_key: "cellEl",
          ref: cellEl,
          "data-cell-start": props2.start.getTime()
        }, vue.toHandlers(cellEventListeners.value, true)), [
          _ctx.$slots.cell ? vue.renderSlot(_ctx.$slots, "cell", {
            key: 0,
            cell: cellInfo.value
          }) : vue.createCommentVNode("", true),
          specialHours.value ? (vue.openBlock(true), vue.createElementBlock(vue.Fragment, { key: 1 }, vue.renderList(specialHours.value, (range, i) => {
            return vue.openBlock(), vue.createElementBlock("div", {
              class: vue.normalizeClass(["vuecal__special-hours", range.class]),
              style: vue.normalizeStyle(range.style),
              innerHTML: range.label || ""
            }, null, 14, _hoisted_2$3);
          }), 256)) : vue.createCommentVNode("", true),
          !_ctx.$slots.cell && vue.unref(config).schedules ? (vue.openBlock(true), vue.createElementBlock(vue.Fragment, { key: 2 }, vue.renderList(vue.unref(config).schedules, (schedule) => {
            return vue.openBlock(), vue.createElementBlock("div", {
              class: vue.normalizeClass(["vuecal__schedule vuecal__schedule--cell", schedule.class]),
              key: schedule.id,
              style: vue.normalizeStyle(schedule.style || null),
              "data-schedule": schedule.id
            }, [
              _ctx.$slots["cell-events"] ? vue.renderSlot(_ctx.$slots, "cell-events", {
                key: 0,
                cell: cellInfo.value
              }) : vue.createCommentVNode("", true),
              formattedCellDate.value || _ctx.$slots["cell-date"] ? (vue.openBlock(), vue.createElementBlock("div", _hoisted_4$2, [
                vue.renderSlot(_ctx.$slots, "cell-date", { cell: cellInfo.value }, () => [
                  vue.createTextVNode(vue.toDisplayString(formattedCellDate.value), 1)
                ])
              ])) : vue.createCommentVNode("", true),
              _ctx.$slots["cell-content"] ? (vue.openBlock(), vue.createElementBlock("div", _hoisted_5$2, [
                vue.renderSlot(_ctx.$slots, "cell-content", { cell: cellInfo.value })
              ])) : vue.createCommentVNode("", true),
              _ctx.$slots["cell-events"] && cellEvents.value.length ? (vue.openBlock(), vue.createElementBlock("div", _hoisted_6$1, [
                vue.renderSlot(_ctx.$slots, "cell-events", { cell: cellInfo.value })
              ])) : cellEvents.value.length || transitioning.value ? (vue.openBlock(), vue.createBlock(vue.TransitionGroup, {
                key: 4,
                class: "vuecal__cell-events",
                name: "vuecal-event-delete",
                onBeforeLeave: _cache[0] || (_cache[0] = ($event) => transitioning.value = true),
                onAfterLeave: afterDelete,
                tag: "div"
              }, {
                default: vue.withCtx(() => [
                  (vue.openBlock(true), vue.createElementBlock(vue.Fragment, null, vue.renderList(cellEventsPerSchedule.value[schedule.id], (event) => {
                    return vue.openBlock(), vue.createBlock(_sfc_main$5, {
                      key: event._.id,
                      event,
                      onEventDeleted: onEventDelete,
                      "in-all-day-bar": props2.allDay,
                      "cell-start": props2.start,
                      "cell-end": props2.end,
                      style: vue.normalizeStyle(eventStyles.value[event._.id])
                    }, vue.createSlots({ _: 2 }, [
                      _ctx.$slots["event.all-day"] && props2.allDay ? {
                        name: "event.all-day",
                        fn: vue.withCtx((params) => [
                          vue.renderSlot(_ctx.$slots, "event.all-day", vue.mergeProps({ ref_for: true }, params))
                        ]),
                        key: "0"
                      } : void 0,
                      _ctx.$slots[`event.${vue.unref(view).id}`] ? {
                        name: `event.${vue.unref(view).id}`,
                        fn: vue.withCtx((params) => [
                          vue.renderSlot(_ctx.$slots, `event.${vue.unref(view).id}`, vue.mergeProps({ ref_for: true }, params))
                        ]),
                        key: "1"
                      } : void 0,
                      _ctx.$slots.event ? {
                        name: "event",
                        fn: vue.withCtx((params) => [
                          vue.renderSlot(_ctx.$slots, "event", vue.mergeProps({ ref_for: true }, params))
                        ]),
                        key: "2"
                      } : void 0
                    ]), 1032, ["event", "in-all-day-bar", "cell-start", "cell-end", "style"]);
                  }), 128))
                ]),
                _: 2
              }, 1024)) : vue.createCommentVNode("", true),
              isCreatingEvent.value && touch.schedule === schedule.id && !props2.allDay ? (vue.openBlock(), vue.createElementBlock("div", {
                key: 5,
                class: "vuecal__event-placeholder",
                style: vue.normalizeStyle(eventPlaceholder.value.style)
              }, vue.toDisplayString(eventPlaceholder.value.start) + " - " + vue.toDisplayString(eventPlaceholder.value.end), 5)) : vue.createCommentVNode("", true)
            ], 14, _hoisted_3$2);
          }), 128)) : vue.createCommentVNode("", true),
          !_ctx.$slots.cell && !vue.unref(config).schedules ? (vue.openBlock(), vue.createElementBlock(vue.Fragment, { key: 3 }, [
            _ctx.$slots["cell-events"] ? vue.renderSlot(_ctx.$slots, "cell-events", {
              key: 0,
              cell: cellInfo.value
            }) : vue.createCommentVNode("", true),
            formattedCellDate.value || _ctx.$slots["cell-date"] ? (vue.openBlock(), vue.createElementBlock("div", _hoisted_7$1, [
              vue.renderSlot(_ctx.$slots, "cell-date", { cell: cellInfo.value }, () => [
                vue.createTextVNode(vue.toDisplayString(formattedCellDate.value), 1)
              ])
            ])) : vue.createCommentVNode("", true),
            _ctx.$slots["cell-content"] ? (vue.openBlock(), vue.createElementBlock("div", _hoisted_8$1, [
              vue.renderSlot(_ctx.$slots, "cell-content", { cell: cellInfo.value })
            ])) : vue.createCommentVNode("", true),
            _ctx.$slots["cell-events"] && cellEvents.value.length ? (vue.openBlock(), vue.createElementBlock("div", _hoisted_9, [
              vue.renderSlot(_ctx.$slots, "cell-events", { cell: cellInfo.value })
            ])) : !(vue.unref(view).isMonth && !vue.unref(config).eventsOnMonthView) && !vue.unref(view).isYear && !vue.unref(view).isYears && (cellEvents.value.length || transitioning.value) ? (vue.openBlock(), vue.createBlock(vue.TransitionGroup, {
              key: 4,
              class: "vuecal__cell-events",
              name: "vuecal-event-delete",
              onBeforeLeave: _cache[1] || (_cache[1] = ($event) => transitioning.value = true),
              onAfterLeave: afterDelete,
              tag: "div"
            }, {
              default: vue.withCtx(() => [
                (vue.openBlock(true), vue.createElementBlock(vue.Fragment, null, vue.renderList(cellEvents.value, (event) => {
                  return vue.openBlock(), vue.createBlock(_sfc_main$5, {
                    key: event._.id,
                    event,
                    onEventDeleted: onEventDelete,
                    "in-all-day-bar": props2.allDay,
                    "cell-start": props2.start,
                    "cell-end": props2.end,
                    class: vue.normalizeClass(eventClasses.value[event._.id]),
                    style: vue.normalizeStyle(eventStyles.value[event._.id])
                  }, vue.createSlots({ _: 2 }, [
                    _ctx.$slots["event.all-day"] && props2.allDay ? {
                      name: "event.all-day",
                      fn: vue.withCtx((params) => [
                        vue.renderSlot(_ctx.$slots, "event.all-day", vue.mergeProps({ ref_for: true }, params))
                      ]),
                      key: "0"
                    } : void 0,
                    _ctx.$slots[`event.${vue.unref(view).id}`] ? {
                      name: `event.${vue.unref(view).id}`,
                      fn: vue.withCtx((params) => [
                        vue.renderSlot(_ctx.$slots, `event.${vue.unref(view).id}`, vue.mergeProps({ ref_for: true }, params))
                      ]),
                      key: "1"
                    } : void 0,
                    _ctx.$slots.event ? {
                      name: "event",
                      fn: vue.withCtx((params) => [
                        vue.renderSlot(_ctx.$slots, "event", vue.mergeProps({ ref_for: true }, params))
                      ]),
                      key: "2"
                    } : void 0
                  ]), 1032, ["event", "in-all-day-bar", "cell-start", "cell-end", "class", "style"]);
                }), 128))
              ]),
              _: 3
            })) : vue.createCommentVNode("", true),
            isCreatingEvent.value ? (vue.openBlock(), vue.createElementBlock("div", {
              key: 5,
              class: "vuecal__event-placeholder",
              style: vue.normalizeStyle(eventPlaceholder.value.style)
            }, vue.toDisplayString(eventPlaceholder.value.start) + " - " + vue.toDisplayString(eventPlaceholder.value.end), 5)) : vue.createCommentVNode("", true)
          ], 64)) : vue.createCommentVNode("", true),
          _ctx.$slots["event-count"] ? vue.renderSlot(_ctx.$slots, "event-count", {
            key: 4,
            events: cellForegroundEvents.value
          }) : showCellEventCount.value ? (vue.openBlock(), vue.createElementBlock("div", _hoisted_10, vue.toDisplayString(cellForegroundEvents.value.length), 1)) : vue.createCommentVNode("", true),
          nowLine.show ? (vue.openBlock(), vue.createElementBlock("div", {
            key: 6,
            class: "vuecal__now-line",
            style: vue.normalizeStyle(nowLine.style),
            title: nowLine.currentTime
          }, [
            vue.renderSlot(_ctx.$slots, "now-line", {
              now: vue.unref(view).now,
              timeFormatted: nowLine.currentTime
            }, () => [
              vue.createElementVNode("span", null, vue.toDisplayString(nowLine.currentTime), 1)
            ])
          ], 12, _hoisted_11)) : vue.createCommentVNode("", true)
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
      const vuecal = vue.inject("vuecal");
      const $vuecalEl = vue.inject("$vuecalEl");
      const { view, config, dateUtils } = vuecal;
      const dayLabelSize = vue.computed(() => {
        if (config.xs) return "day-xs";
        if (config.sm || view.isDays || view.isMonth) return "day-sm";
        return "day";
      });
      const showHeadings = vue.computed(() => {
        const isDayDaysWeekOrMonthView = view.isDay || view.isDays || view.isWeek || view.isMonth;
        return isDayDaysWeekOrMonthView && !(view.isDay && !config.schedules && !config.allDayEvents);
      });
      const weekDays2 = vue.computed(() => {
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
        isResizing: vue.ref(false),
        startY: vue.ref(0),
        initialHeight: vue.ref(0),
        defaultHeight: 25,
        // Default height in pixels.
        // Or in the case of horizontal layout.
        startX: vue.ref(0),
        initialWidth: vue.ref(0),
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
      vue.onBeforeUnmount(() => {
        allDayResizer.cleanup();
      });
      return (_ctx, _cache) => {
        return showHeadings.value ? (vue.openBlock(), vue.createElementBlock("div", _hoisted_1$2, [
          !vue.unref(view).isDay ? (vue.openBlock(), vue.createElementBlock("div", _hoisted_2$2, [
            (vue.openBlock(true), vue.createElementBlock(vue.Fragment, null, vue.renderList(weekDays2.value, (day2, i) => {
              return vue.openBlock(), vue.createElementBlock("div", {
                class: vue.normalizeClass(["vuecal__weekday", { "vuecal__weekday--today": day2.isToday }]),
                key: i,
                onClick: ($event) => domEvents.click(day2.date)
              }, [
                vue.renderSlot(_ctx.$slots, "weekday-heading", {
                  label: day2[dayLabelSize.value],
                  id: day2.id,
                  date: day2.date
                }, () => [
                  vue.createElementVNode("span", _hoisted_4$1, vue.toDisplayString(day2[dayLabelSize.value]), 1),
                  !vue.unref(view).isMonth ? (vue.openBlock(), vue.createElementBlock("strong", _hoisted_5$1, vue.toDisplayString(day2.dateNumber), 1)) : vue.createCommentVNode("", true)
                ])
              ], 10, _hoisted_3$1);
            }), 128))
          ])) : vue.createCommentVNode("", true),
          vue.unref(config).schedules ? (vue.openBlock(), vue.createElementBlock("div", _hoisted_6, [
            (vue.openBlock(true), vue.createElementBlock(vue.Fragment, null, vue.renderList(weekDays2.value, (day2, i) => {
              return vue.openBlock(), vue.createElementBlock(vue.Fragment, { key: i }, [
                (vue.openBlock(true), vue.createElementBlock(vue.Fragment, null, vue.renderList(vue.unref(config).schedules, (schedule, j) => {
                  return vue.openBlock(), vue.createElementBlock(vue.Fragment, { key: j }, [
                    _ctx.$slots["schedule-heading"] ? (vue.openBlock(), vue.createElementBlock("div", {
                      key: 0,
                      class: vue.normalizeClass(["vuecal__schedule vuecal__schedule--heading", schedule.class])
                    }, [
                      vue.renderSlot(_ctx.$slots, "schedule-heading", {
                        schedule,
                        view: vue.unref(view)
                      })
                    ], 2)) : (vue.openBlock(), vue.createElementBlock("div", {
                      key: 1,
                      class: vue.normalizeClass(["vuecal__schedule vuecal__schedule--heading", schedule.class]),
                      innerHTML: schedule.label
                    }, null, 10, _hoisted_7))
                  ], 64);
                }), 128))
              ], 64);
            }), 128))
          ])) : vue.createCommentVNode("", true),
          vue.unref(config).allDayEvents ? (vue.openBlock(), vue.createElementBlock("div", _hoisted_8, [
            (vue.openBlock(true), vue.createElementBlock(vue.Fragment, null, vue.renderList(weekDays2.value, (day2, i) => {
              return vue.openBlock(), vue.createBlock(_sfc_main$4, {
                class: vue.normalizeClass(["vuecal__all-day-cell", { "vuecal__weekday--today": day2.isToday }]),
                key: i,
                start: day2.date,
                end: new Date(day2.date.getTime() + 24 * 60 * 60 * 1e3 - 1),
                index: i,
                "all-day": ""
              }, vue.createSlots({ _: 2 }, [
                _ctx.$slots["event.all-day"] ? {
                  name: "event.all-day",
                  fn: vue.withCtx((params) => [
                    vue.renderSlot(_ctx.$slots, "event.all-day", vue.mergeProps({ ref_for: true }, params))
                  ]),
                  key: "0"
                } : {
                  name: "event",
                  fn: vue.withCtx((params) => [
                    vue.renderSlot(_ctx.$slots, "event", vue.mergeProps({ ref_for: true }, params))
                  ]),
                  key: "1"
                }
              ]), 1032, ["class", "start", "end", "index"]);
            }), 128)),
            vue.createElementVNode("div", {
              class: "vuecal__all-day-resizer",
              onMousedown: _cache[0] || (_cache[0] = (...args) => allDayResizer.handleMouseDown && allDayResizer.handleMouseDown(...args)),
              onTouchstart: _cache[1] || (_cache[1] = (...args) => allDayResizer.handleTouchStart && allDayResizer.handleTouchStart(...args))
            }, null, 32)
          ])) : vue.createCommentVNode("", true)
        ])) : vue.createCommentVNode("", true);
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
      const vuecal = vue.inject("vuecal");
      const { config, texts } = vuecal;
      const timeCells = vue.computed(() => {
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
        return vue.openBlock(), vue.createElementBlock("div", _hoisted_1$1, [
          vue.unref(config).allDayEvents ? (vue.openBlock(), vue.createElementBlock("div", _hoisted_2$1, [
            vue.renderSlot(_ctx.$slots, "all-day-label", {}, () => [
              vue.createTextVNode(vue.toDisplayString(vue.unref(vuecal).texts.allDay), 1)
            ])
          ])) : vue.createCommentVNode("", true),
          (vue.openBlock(true), vue.createElementBlock(vue.Fragment, null, vue.renderList(timeCells.value, (time, i) => {
            return vue.openBlock(), vue.createElementBlock("div", {
              class: "vuecal__time-cell",
              key: i,
              style: vue.normalizeStyle({ height: time.height || null })
            }, [
              vue.renderSlot(_ctx.$slots, "time-cell", {
                index: i,
                minutes: time.minutes,
                hours: time.hours,
                minutesSum: time.minutesSum,
                format12: time.formatted12,
                format24: time.formatted24
              }, () => [
                vue.createElementVNode("label", null, vue.toDisplayString(vue.unref(config).twelveHour ? time.formatted12 : time.formatted24), 1)
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
      const vuecal = vue.inject("vuecal");
      const { view, config, dateUtils, touch: globalTouchState, eventsManager } = vuecal;
      const bodyEl = vue.ref(null);
      const cursorYPercent = vue.ref(null);
      const { resizeState } = eventsManager;
      const bodyStyles = vue.computed(() => ({
        "--vuecal-grid-columns": view.cols,
        "--vuecal-grid-rows": view.rows,
        "--vuecal-body-max-height": config.time ? `${config.timeCellHeight * (config.timeTo - config.timeFrom) / config.timeStep}px` : null
      }));
      const timeAtCursor = vue.computed(() => {
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
      vue.onMounted(() => {
        bodyEl.value.addEventListener("mousemove", onBodyMousemove);
        bodyEl.value.addEventListener("touchmove", onBodyMousemove);
        bodyEl.value.addEventListener("mouseleave", onBodyMouseleave);
        bodyEl.value.addEventListener("touchend", onBodyMouseleave);
      });
      vue.onBeforeUnmount(() => {
        if (bodyEl.value) {
          bodyEl.value.removeEventListener("mousemove", onBodyMousemove);
          bodyEl.value.removeEventListener("touchmove", onBodyMousemove);
          bodyEl.value.removeEventListener("mouseleave", onBodyMouseleave);
          bodyEl.value.removeEventListener("touchend", onBodyMouseleave);
        }
      });
      return (_ctx, _cache) => {
        return vue.openBlock(), vue.createElementBlock("div", {
          class: "vuecal__body",
          ref_key: "bodyEl",
          ref: bodyEl,
          style: vue.normalizeStyle(bodyStyles.value)
        }, [
          vue.createVNode(vue.Transition, { name: "vuecal-shrink" }, {
            default: vue.withCtx(() => [
              vue.unref(config).timeAtCursor && cursorYPercent.value !== null ? (vue.openBlock(), vue.createElementBlock("div", {
                key: 0,
                class: "vuecal__time-at-cursor",
                style: vue.normalizeStyle(timeAtCursor.value.style)
              }, [
                vue.createElementVNode("label", null, vue.toDisplayString(timeAtCursor.value.time), 1)
              ], 4)) : vue.createCommentVNode("", true)
            ]),
            _: 1
          }),
          (vue.openBlock(true), vue.createElementBlock(vue.Fragment, null, vue.renderList(vue.unref(view).cellDates, (date, i) => {
            return vue.openBlock(), vue.createBlock(_sfc_main$4, {
              key: i,
              start: date.start,
              end: date.end,
              index: i
            }, vue.createSlots({ _: 2 }, [
              _ctx.$slots.cell ? {
                name: "cell",
                fn: vue.withCtx((params) => [
                  vue.renderSlot(_ctx.$slots, "cell", vue.mergeProps({ ref_for: true }, params))
                ]),
                key: "0"
              } : void 0,
              _ctx.$slots["cell-date"] ? {
                name: "cell-date",
                fn: vue.withCtx((params) => [
                  vue.renderSlot(_ctx.$slots, "cell-date", vue.mergeProps({ ref_for: true }, params))
                ]),
                key: "1"
              } : void 0,
              _ctx.$slots["cell-content"] ? {
                name: "cell-content",
                fn: vue.withCtx((params) => [
                  vue.renderSlot(_ctx.$slots, "cell-content", vue.mergeProps({ ref_for: true }, params))
                ]),
                key: "2"
              } : void 0,
              _ctx.$slots["cell-events"] ? {
                name: "cell-events",
                fn: vue.withCtx((params) => [
                  vue.renderSlot(_ctx.$slots, "cell-events", vue.mergeProps({ ref_for: true }, params))
                ]),
                key: "3"
              } : void 0,
              _ctx.$slots[`event.${vue.unref(view).id}`] ? {
                name: `event.${vue.unref(view).id}`,
                fn: vue.withCtx((params) => [
                  vue.renderSlot(_ctx.$slots, `event.${vue.unref(view).id}`, vue.mergeProps({ ref_for: true }, params))
                ]),
                key: "4"
              } : void 0,
              _ctx.$slots["event.all-day"] ? {
                name: "event.all-day",
                fn: vue.withCtx((params) => [
                  vue.renderSlot(_ctx.$slots, "event.all-day", vue.mergeProps({ ref_for: true }, params))
                ]),
                key: "5"
              } : void 0,
              _ctx.$slots.event ? {
                name: "event",
                fn: vue.withCtx((params) => [
                  vue.renderSlot(_ctx.$slots, "event", vue.mergeProps({ ref_for: true }, params))
                ]),
                key: "6"
              } : void 0,
              _ctx.$slots["event-count"] ? {
                name: "event-count",
                fn: vue.withCtx((params) => [
                  vue.renderSlot(_ctx.$slots, "event-count", vue.mergeProps({ ref_for: true }, params))
                ]),
                key: "7"
              } : void 0,
              _ctx.$slots["now-line"] ? {
                name: "now-line",
                fn: vue.withCtx((params) => [
                  vue.renderSlot(_ctx.$slots, "now-line", vue.mergeProps({ ref_for: true }, params))
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
      const vuecalEl = vue.useTemplateRef("vuecal-el");
      const vuecal = useVueCal({ props: props2, emit, attrs: vue.useAttrs(), vuecalEl, uid: vue.useId() });
      const { config, view, dateUtils, touch: touchState } = vuecal;
      const hasTimeColumn = vue.computed(() => config.time && (view.isDay || view.isDays || view.isWeek));
      const weekNumbers = vue.computed(() => {
        return Array(view.rows).fill().map((v, i) => {
          return dateUtils.getWeek(dateUtils.addDays(view.firstCellDate, 7 * i));
        });
      });
      const wrapperClasses = vue.computed(() => {
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
      const wrapperStyles = vue.computed(() => ({
        "--vuecal-time-cell-height": config.timeCellHeight && `${config.timeCellHeight}px`
      }));
      const scrollableElClasses = vue.computed(() => {
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
      vue.onMounted(async () => {
        if (typeof window !== "undefined" && window.hasOwnProperty("ontouchstart")) {
          vuecalEl.value.addEventListener("contextmenu", contextMenuHandler);
        }
        await vue.nextTick();
        config.ready = true;
        emit("ready", { config, view });
      });
      vue.onBeforeUnmount(() => {
        var _a;
        (_a = vuecalEl == null ? void 0 : vuecalEl.value) == null ? void 0 : _a.removeEventListener("contextmenu", contextMenuHandler);
      });
      vue.provide("vuecal", vuecal);
      vue.provide("$vuecalEl", vuecalEl);
      __expose({ view: vuecal.view });
      return (_ctx, _cache) => {
        return vue.openBlock(), vue.createElementBlock("div", {
          class: vue.normalizeClass(["vuecal", wrapperClasses.value]),
          ref: "vuecal-el",
          "data-locale": _ctx.locale,
          style: vue.normalizeStyle(wrapperStyles.value)
        }, [
          _ctx.$slots.diy ? vue.renderSlot(_ctx.$slots, "diy", {
            key: 0,
            vuecal: vue.unref(vuecal)
          }) : (vue.openBlock(), vue.createElementBlock(vue.Fragment, { key: 1 }, [
            vue.createVNode(_sfc_main$6, null, vue.createSlots({ _: 2 }, [
              _ctx.$slots.header ? {
                name: "header",
                fn: vue.withCtx((params) => [
                  vue.renderSlot(_ctx.$slots, "header", vue.normalizeProps(vue.guardReactiveProps(params)))
                ]),
                key: "0"
              } : void 0,
              !_ctx.$slots.header && _ctx.$slots["previous-button"] ? {
                name: "previous-button",
                fn: vue.withCtx((params) => [
                  vue.renderSlot(_ctx.$slots, "previous-button", vue.normalizeProps(vue.guardReactiveProps(params)))
                ]),
                key: "1"
              } : void 0,
              !_ctx.$slots.header && _ctx.$slots["next-button"] ? {
                name: "next-button",
                fn: vue.withCtx((params) => [
                  vue.renderSlot(_ctx.$slots, "next-button", vue.normalizeProps(vue.guardReactiveProps(params)))
                ]),
                key: "2"
              } : void 0,
              !_ctx.$slots.header && _ctx.$slots["today-button"] ? {
                name: "today-button",
                fn: vue.withCtx((params) => [
                  vue.renderSlot(_ctx.$slots, "today-button", vue.normalizeProps(vue.guardReactiveProps(params)))
                ]),
                key: "3"
              } : void 0,
              !_ctx.$slots.header && _ctx.$slots.title ? {
                name: "title",
                fn: vue.withCtx((params) => [
                  vue.renderSlot(_ctx.$slots, "title", vue.normalizeProps(vue.guardReactiveProps(params)))
                ]),
                key: "4"
              } : void 0,
              !_ctx.$slots.header && _ctx.$slots["title.day"] ? {
                name: "title.day",
                fn: vue.withCtx((params) => [
                  vue.renderSlot(_ctx.$slots, "title.day", vue.normalizeProps(vue.guardReactiveProps(params)))
                ]),
                key: "5"
              } : void 0,
              !_ctx.$slots.header && _ctx.$slots["title.days"] ? {
                name: "title.days",
                fn: vue.withCtx((params) => [
                  vue.renderSlot(_ctx.$slots, "title.days", vue.normalizeProps(vue.guardReactiveProps(params)))
                ]),
                key: "6"
              } : void 0,
              !_ctx.$slots.header && _ctx.$slots["title.week"] ? {
                name: "title.week",
                fn: vue.withCtx((params) => [
                  vue.renderSlot(_ctx.$slots, "title.week", vue.normalizeProps(vue.guardReactiveProps(params)))
                ]),
                key: "7"
              } : void 0,
              !_ctx.$slots.header && _ctx.$slots["title.month"] ? {
                name: "title.month",
                fn: vue.withCtx((params) => [
                  vue.renderSlot(_ctx.$slots, "title.month", vue.normalizeProps(vue.guardReactiveProps(params)))
                ]),
                key: "8"
              } : void 0,
              !_ctx.$slots.header && _ctx.$slots["title.year"] ? {
                name: "title.year",
                fn: vue.withCtx((params) => [
                  vue.renderSlot(_ctx.$slots, "title.year", vue.normalizeProps(vue.guardReactiveProps(params)))
                ]),
                key: "9"
              } : void 0,
              !_ctx.$slots.header && _ctx.$slots["title.years"] ? {
                name: "title.years",
                fn: vue.withCtx((params) => [
                  vue.renderSlot(_ctx.$slots, "title.years", vue.normalizeProps(vue.guardReactiveProps(params)))
                ]),
                key: "10"
              } : void 0,
              !_ctx.$slots.header && _ctx.$slots["schedule-heading"] ? {
                name: "schedule-heading",
                fn: vue.withCtx((params) => [
                  vue.renderSlot(_ctx.$slots, "schedule-heading", vue.normalizeProps(vue.guardReactiveProps(params)))
                ]),
                key: "11"
              } : void 0
            ]), 1024),
            vue.createElementVNode("div", _hoisted_2, [
              vue.createVNode(vue.Transition, {
                name: `vuecal-slide-fade--${vue.unref(view).transitionDirection}`
              }, {
                default: vue.withCtx(() => [
                  (vue.openBlock(), vue.createElementBlock("div", {
                    class: vue.normalizeClass(["vuecal__scrollable", scrollableElClasses.value]),
                    key: vue.unref(view).id + vue.unref(view).start.getTime()
                  }, [
                    hasTimeColumn.value ? (vue.openBlock(), vue.createBlock(_sfc_main$2, { key: 0 }, vue.createSlots({ _: 2 }, [
                      _ctx.$slots["time-cell"] ? {
                        name: "time-cell",
                        fn: vue.withCtx((params) => [
                          vue.renderSlot(_ctx.$slots, "time-cell", vue.normalizeProps(vue.guardReactiveProps(params)))
                        ]),
                        key: "0"
                      } : void 0
                    ]), 1024)) : vue.createCommentVNode("", true),
                    vue.unref(config).weekNumbers && vue.unref(view).isMonth ? (vue.openBlock(), vue.createElementBlock("div", _hoisted_3, [
                      (vue.openBlock(true), vue.createElementBlock(vue.Fragment, null, vue.renderList(weekNumbers.value, (i) => {
                        return vue.openBlock(), vue.createElementBlock("div", _hoisted_4, [
                          vue.renderSlot(_ctx.$slots, "week-number", {}, () => [
                            vue.createElementVNode("small", null, vue.toDisplayString(i), 1)
                          ])
                        ]);
                      }), 256))
                    ])) : vue.createCommentVNode("", true),
                    vue.createElementVNode("div", _hoisted_5, [
                      vue.createVNode(_sfc_main$3, null, vue.createSlots({ _: 2 }, [
                        _ctx.$slots["weekday-heading"] ? {
                          name: "weekday-heading",
                          fn: vue.withCtx((params) => [
                            vue.renderSlot(_ctx.$slots, "weekday-heading", vue.normalizeProps(vue.guardReactiveProps(params)))
                          ]),
                          key: "0"
                        } : void 0,
                        _ctx.$slots["schedule-heading"] ? {
                          name: "schedule-heading",
                          fn: vue.withCtx((params) => [
                            vue.renderSlot(_ctx.$slots, "schedule-heading", vue.normalizeProps(vue.guardReactiveProps(params)))
                          ]),
                          key: "1"
                        } : void 0,
                        _ctx.$slots["event.all-day"] ? {
                          name: "event.all-day",
                          fn: vue.withCtx((params) => [
                            vue.renderSlot(_ctx.$slots, "event.all-day", vue.normalizeProps(vue.guardReactiveProps(params)))
                          ]),
                          key: "2"
                        } : void 0,
                        _ctx.$slots.event ? {
                          name: "event",
                          fn: vue.withCtx((params) => [
                            vue.renderSlot(_ctx.$slots, "event", vue.normalizeProps(vue.guardReactiveProps(params)))
                          ]),
                          key: "3"
                        } : void 0
                      ]), 1024),
                      vue.createVNode(_sfc_main$1, null, vue.createSlots({ _: 2 }, [
                        _ctx.$slots.cell ? {
                          name: "cell",
                          fn: vue.withCtx((params) => [
                            vue.renderSlot(_ctx.$slots, "cell", vue.normalizeProps(vue.guardReactiveProps(params)))
                          ]),
                          key: "0"
                        } : void 0,
                        !_ctx.$slots.cell && _ctx.$slots["cell-date"] ? {
                          name: "cell-date",
                          fn: vue.withCtx((params) => [
                            vue.renderSlot(_ctx.$slots, "cell-date", vue.normalizeProps(vue.guardReactiveProps(params)))
                          ]),
                          key: "1"
                        } : void 0,
                        !_ctx.$slots.cell && _ctx.$slots["cell-content"] ? {
                          name: "cell-content",
                          fn: vue.withCtx((params) => [
                            vue.renderSlot(_ctx.$slots, "cell-content", vue.normalizeProps(vue.guardReactiveProps(params)))
                          ]),
                          key: "2"
                        } : void 0,
                        !_ctx.$slots.cell && _ctx.$slots["cell-events"] ? {
                          name: "cell-events",
                          fn: vue.withCtx((params) => [
                            vue.renderSlot(_ctx.$slots, "cell-events", vue.normalizeProps(vue.guardReactiveProps(params)))
                          ]),
                          key: "3"
                        } : void 0,
                        !_ctx.$slots.cell && !_ctx.$slots["cell-events"] && _ctx.$slots["event.all-day"] ? {
                          name: "event.all-day",
                          fn: vue.withCtx((params) => [
                            vue.renderSlot(_ctx.$slots, "event.all-day", vue.normalizeProps(vue.guardReactiveProps(params)))
                          ]),
                          key: "4"
                        } : void 0,
                        !_ctx.$slots.cell && !_ctx.$slots["cell-events"] && _ctx.$slots[`event.${vue.unref(view).id}`] ? {
                          name: `event.${vue.unref(view).id}`,
                          fn: vue.withCtx((params) => [
                            vue.renderSlot(_ctx.$slots, `event.${vue.unref(view).id}`, vue.normalizeProps(vue.guardReactiveProps(params)))
                          ]),
                          key: "5"
                        } : void 0,
                        !_ctx.$slots.cell && !_ctx.$slots["cell-events"] && _ctx.$slots.event ? {
                          name: "event",
                          fn: vue.withCtx((params) => [
                            vue.renderSlot(_ctx.$slots, "event", vue.normalizeProps(vue.guardReactiveProps(params)))
                          ]),
                          key: "6"
                        } : void 0,
                        !_ctx.$slots.cell && _ctx.$slots["event-count"] ? {
                          name: "event-count",
                          fn: vue.withCtx((params) => [
                            vue.renderSlot(_ctx.$slots, "event-count", vue.normalizeProps(vue.guardReactiveProps(params)))
                          ]),
                          key: "7"
                        } : void 0,
                        _ctx.$slots["now-line"] ? {
                          name: "now-line",
                          fn: vue.withCtx((params) => [
                            vue.renderSlot(_ctx.$slots, "now-line", vue.normalizeProps(vue.guardReactiveProps(params)))
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
  const weekDays$L = ["الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"];
  const weekDaysShort$a = ["ن", "ث", "ر", "خ", "ج", "س", "ح"];
  const months$L = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", " ديسمبر"];
  const years$L = "سنوات";
  const year$L = "سنة";
  const month$L = "شهر";
  const week$L = "أسبوع";
  const days$H = "أيام";
  const day$L = "يوم";
  const today$L = "اليوم";
  const noEvent$L = "لا حدث";
  const allDay$L = "طوال اليوم";
  const deleteEvent$L = "حذف";
  const createEvent$L = "إنشاء حدث";
  const dateFormat$L = "dddd D MMMM YYYY";
  const truncations$4 = false;
  const ar = {
    weekDays: weekDays$L,
    weekDaysShort: weekDaysShort$a,
    months: months$L,
    years: years$L,
    year: year$L,
    month: month$L,
    week: week$L,
    days: days$H,
    day: day$L,
    today: today$L,
    noEvent: noEvent$L,
    allDay: allDay$L,
    deleteEvent: deleteEvent$L,
    createEvent: createEvent$L,
    dateFormat: dateFormat$L,
    truncations: truncations$4
  };
  const ar$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    allDay: allDay$L,
    createEvent: createEvent$L,
    dateFormat: dateFormat$L,
    day: day$L,
    days: days$H,
    default: ar,
    deleteEvent: deleteEvent$L,
    month: month$L,
    months: months$L,
    noEvent: noEvent$L,
    today: today$L,
    truncations: truncations$4,
    week: week$L,
    weekDays: weekDays$L,
    weekDaysShort: weekDaysShort$a,
    year: year$L,
    years: years$L
  }, Symbol.toStringTag, { value: "Module" }));
  const weekDays$K = ["Понеделник", "Вторник", "Сряда", "Четвъртък", "Петък", "Събота", "Неделя"];
  const months$K = ["Януари", "Февруари", "Март", "Април", "Май", "Юни", "Юли", "Август", "Септември", "Октомври", "Ноември", "Декември"];
  const years$K = "Години";
  const year$K = "Година";
  const month$K = "Месец";
  const week$K = "Седмица";
  const days$G = "Дни";
  const day$K = "Ден";
  const today$K = "Днес";
  const noEvent$K = "Няма събития";
  const allDay$K = "Цял ден";
  const deleteEvent$K = "Изтрий";
  const createEvent$K = "Създай събитие";
  const dateFormat$K = "dddd D MMMM YYYY";
  const bg = {
    weekDays: weekDays$K,
    months: months$K,
    years: years$K,
    year: year$K,
    month: month$K,
    week: week$K,
    days: days$G,
    day: day$K,
    today: today$K,
    noEvent: noEvent$K,
    allDay: allDay$K,
    deleteEvent: deleteEvent$K,
    createEvent: createEvent$K,
    dateFormat: dateFormat$K
  };
  const bg$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    allDay: allDay$K,
    createEvent: createEvent$K,
    dateFormat: dateFormat$K,
    day: day$K,
    days: days$G,
    default: bg,
    deleteEvent: deleteEvent$K,
    month: month$K,
    months: months$K,
    noEvent: noEvent$K,
    today: today$K,
    week: week$K,
    weekDays: weekDays$K,
    year: year$K,
    years: years$K
  }, Symbol.toStringTag, { value: "Module" }));
  const weekDays$J = ["সোম", "মঙ্গল", "বুধ", "বৃহস্পতি", "শুক্র", "শনি", "রবি"];
  const months$J = ["জানুয়ারি", "ফেব্ুয়ারী", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "অগাস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];
  const years$J = "বছর";
  const year$J = "বছর";
  const month$J = "মাস";
  const week$J = "সপ্তাহ";
  const days$F = "দিন";
  const day$J = "দিন";
  const today$J = "আজ";
  const noEvent$J = "কার্যসূচী";
  const allDay$J = "সারাদিন";
  const deleteEvent$J = "মুছুন";
  const createEvent$J = "কার্যসূচী তৈরি করুন";
  const dateFormat$J = "dddd D MMMM YYYY";
  const bn = {
    weekDays: weekDays$J,
    months: months$J,
    years: years$J,
    year: year$J,
    month: month$J,
    week: week$J,
    days: days$F,
    day: day$J,
    today: today$J,
    noEvent: noEvent$J,
    allDay: allDay$J,
    deleteEvent: deleteEvent$J,
    createEvent: createEvent$J,
    dateFormat: dateFormat$J
  };
  const bn$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    allDay: allDay$J,
    createEvent: createEvent$J,
    dateFormat: dateFormat$J,
    day: day$J,
    days: days$F,
    default: bn,
    deleteEvent: deleteEvent$J,
    month: month$J,
    months: months$J,
    noEvent: noEvent$J,
    today: today$J,
    week: week$J,
    weekDays: weekDays$J,
    year: year$J,
    years: years$J
  }, Symbol.toStringTag, { value: "Module" }));
  const weekDays$I = ["Ponedjeljak", "Utorak", "Srijeda", "Četvrtak", "Petak", "Subota", "Nedjelja"];
  const months$I = ["Januar", "Februar", "Mart", "April", "Maj", "Jun", "Jul", "Avgust", "Septembar", "Oktobar", "Novembar", "Decembar"];
  const years$I = "Godine";
  const year$I = "Godina";
  const month$I = "Mjesec";
  const week$I = "Sedmica";
  const days$E = "Dana";
  const day$I = "Dan";
  const today$I = "Danas";
  const noEvent$I = "Nema događaja";
  const allDay$I = "Cijeli dan";
  const deleteEvent$I = "Obriši";
  const createEvent$I = "Kreiraj događaj";
  const dateFormat$I = "dddd D MMMM YYYY";
  const bs = {
    weekDays: weekDays$I,
    months: months$I,
    years: years$I,
    year: year$I,
    month: month$I,
    week: week$I,
    days: days$E,
    day: day$I,
    today: today$I,
    noEvent: noEvent$I,
    allDay: allDay$I,
    deleteEvent: deleteEvent$I,
    createEvent: createEvent$I,
    dateFormat: dateFormat$I
  };
  const bs$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    allDay: allDay$I,
    createEvent: createEvent$I,
    dateFormat: dateFormat$I,
    day: day$I,
    days: days$E,
    default: bs,
    deleteEvent: deleteEvent$I,
    month: month$I,
    months: months$I,
    noEvent: noEvent$I,
    today: today$I,
    week: week$I,
    weekDays: weekDays$I,
    year: year$I,
    years: years$I
  }, Symbol.toStringTag, { value: "Module" }));
  const weekDays$H = ["Dilluns", "Dimarts", "Dimecres", "Dijous", "Divendres", "Dissabte", "Diumenge"];
  const weekDaysShort$9 = ["Dl", "Dt", "Dc", "Dj", "Dv", "Ds", "Dg"];
  const months$H = ["Gener", "Febrer", "Març", "Abril", "Maig", "Juny", "Juliol", "Agost", "Setembre", "Octubre", "Novembre", "Desembre"];
  const years$H = "Anys";
  const year$H = "Any";
  const month$H = "Mes";
  const week$H = "Setmana";
  const days$D = "Dies";
  const day$H = "Dia";
  const today$H = "Avui";
  const noEvent$H = "No hi ha esdeveniments";
  const allDay$H = "Tot el dia";
  const deleteEvent$H = "Eliminar";
  const createEvent$H = "Crear un esdeveniment";
  const dateFormat$H = "dddd D MMMM YYYY";
  const ca = {
    weekDays: weekDays$H,
    weekDaysShort: weekDaysShort$9,
    months: months$H,
    years: years$H,
    year: year$H,
    month: month$H,
    week: week$H,
    days: days$D,
    day: day$H,
    today: today$H,
    noEvent: noEvent$H,
    allDay: allDay$H,
    deleteEvent: deleteEvent$H,
    createEvent: createEvent$H,
    dateFormat: dateFormat$H
  };
  const ca$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    allDay: allDay$H,
    createEvent: createEvent$H,
    dateFormat: dateFormat$H,
    day: day$H,
    days: days$D,
    default: ca,
    deleteEvent: deleteEvent$H,
    month: month$H,
    months: months$H,
    noEvent: noEvent$H,
    today: today$H,
    week: week$H,
    weekDays: weekDays$H,
    weekDaysShort: weekDaysShort$9,
    year: year$H,
    years: years$H
  }, Symbol.toStringTag, { value: "Module" }));
  const weekDays$G = ["Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota", "Neděle"];
  const months$G = ["Leden", "Únor", "Březen", "Duben", "Květen", "Červen", "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec"];
  const years$G = "Roky";
  const year$G = "Rok";
  const month$G = "Měsíc";
  const week$G = "Týden";
  const days$C = "Dny";
  const day$G = "Den";
  const today$G = "Dnes";
  const noEvent$G = "Bez událostí";
  const allDay$G = "Celý den";
  const deleteEvent$G = "Odstranit";
  const createEvent$G = "Vytvořit událost";
  const dateFormat$G = "dddd D. MMMM YYYY";
  const cs = {
    weekDays: weekDays$G,
    months: months$G,
    years: years$G,
    year: year$G,
    month: month$G,
    week: week$G,
    days: days$C,
    day: day$G,
    today: today$G,
    noEvent: noEvent$G,
    allDay: allDay$G,
    deleteEvent: deleteEvent$G,
    createEvent: createEvent$G,
    dateFormat: dateFormat$G
  };
  const cs$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    allDay: allDay$G,
    createEvent: createEvent$G,
    dateFormat: dateFormat$G,
    day: day$G,
    days: days$C,
    default: cs,
    deleteEvent: deleteEvent$G,
    month: month$G,
    months: months$G,
    noEvent: noEvent$G,
    today: today$G,
    week: week$G,
    weekDays: weekDays$G,
    year: year$G,
    years: years$G
  }, Symbol.toStringTag, { value: "Module" }));
  const weekDays$F = ["Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag", "Søndag"];
  const months$F = ["Januar", "Februar", "Marts", "April", "Maj", "Juni", "Juli", "August", "September", "Oktober", "November", "December"];
  const years$F = "År (flertal)";
  const year$F = "År";
  const month$F = "Måned";
  const week$F = "Uge";
  const days$B = "Dage";
  const day$F = "Dag";
  const today$F = "I dag";
  const noEvent$F = "Ingen begivenhed";
  const allDay$F = "Hele dagen";
  const deleteEvent$F = "Slet";
  const createEvent$F = "Opret et event";
  const dateFormat$F = "dddd D MMMM YYYY";
  const da = {
    weekDays: weekDays$F,
    months: months$F,
    years: years$F,
    year: year$F,
    month: month$F,
    week: week$F,
    days: days$B,
    day: day$F,
    today: today$F,
    noEvent: noEvent$F,
    allDay: allDay$F,
    deleteEvent: deleteEvent$F,
    createEvent: createEvent$F,
    dateFormat: dateFormat$F
  };
  const da$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    allDay: allDay$F,
    createEvent: createEvent$F,
    dateFormat: dateFormat$F,
    day: day$F,
    days: days$B,
    default: da,
    deleteEvent: deleteEvent$F,
    month: month$F,
    months: months$F,
    noEvent: noEvent$F,
    today: today$F,
    week: week$F,
    weekDays: weekDays$F,
    year: year$F,
    years: years$F
  }, Symbol.toStringTag, { value: "Module" }));
  const weekDays$E = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
  const months$E = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
  const years$E = "Jahre";
  const year$E = "Jahr";
  const month$E = "Monat";
  const week$E = "Woche";
  const days$A = "Tage";
  const day$E = "Tag";
  const today$E = "Heute";
  const noEvent$E = "Keine Events";
  const allDay$E = "Ganztägig";
  const deleteEvent$E = "Löschen";
  const createEvent$E = "Event erstellen";
  const dateFormat$E = "dddd D MMMM YYYY";
  const de = {
    weekDays: weekDays$E,
    months: months$E,
    years: years$E,
    year: year$E,
    month: month$E,
    week: week$E,
    days: days$A,
    day: day$E,
    today: today$E,
    noEvent: noEvent$E,
    allDay: allDay$E,
    deleteEvent: deleteEvent$E,
    createEvent: createEvent$E,
    dateFormat: dateFormat$E
  };
  const de$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    allDay: allDay$E,
    createEvent: createEvent$E,
    dateFormat: dateFormat$E,
    day: day$E,
    days: days$A,
    default: de,
    deleteEvent: deleteEvent$E,
    month: month$E,
    months: months$E,
    noEvent: noEvent$E,
    today: today$E,
    week: week$E,
    weekDays: weekDays$E,
    year: year$E,
    years: years$E
  }, Symbol.toStringTag, { value: "Module" }));
  const weekDays$D = ["Δευτέρα", "Τρίτη", "Τετάρτη", "Πέμπτη", "Παρασκευή", "Σάββατο", "Κυριακή"];
  const months$D = ["Ιανουάριος", "Φεβρουάριος", "Μάρτιος", "Απρίλιος", "Μάιος", "Ιούνιος", "Ιούλιος", "Αύγουστος", "Σεπτέμβριος", "Οκτώβριος", "Νοέμβριος", "Δεκέμβριος"];
  const monthsGenitive$1 = ["Ιανουαρίου", "Φεβρουαρίου", "Μαρτίου", "Απριλίου", "Μαΐου", "Ιουνίου", "Ιουλίου", "Αυγούστου", "Σεπτεμβρίου", "Οκτωβρίου", "Νοεμβρίου", "Δεκεμβρίου"];
  const years$D = "Έτη";
  const year$D = "Έτος";
  const month$D = "Μήνας";
  const week$D = "Εβδομάδα";
  const days$z = "Ημέρες";
  const day$D = "Ημέρα";
  const today$D = "Σήμερα";
  const noEvent$D = "Κανένα συμβάν";
  const allDay$D = "Ημερήσιο συμβάν";
  const deleteEvent$D = "Διαγραφή";
  const createEvent$D = "Δημιουργία συμβάντος";
  const dateFormat$D = "dddd D MMMMG YYYY";
  const am = "π.μ.";
  const pm = "μ.μ.";
  const el = {
    weekDays: weekDays$D,
    months: months$D,
    monthsGenitive: monthsGenitive$1,
    years: years$D,
    year: year$D,
    month: month$D,
    week: week$D,
    days: days$z,
    day: day$D,
    today: today$D,
    noEvent: noEvent$D,
    allDay: allDay$D,
    deleteEvent: deleteEvent$D,
    createEvent: createEvent$D,
    dateFormat: dateFormat$D,
    am,
    pm
  };
  const el$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    allDay: allDay$D,
    am,
    createEvent: createEvent$D,
    dateFormat: dateFormat$D,
    day: day$D,
    days: days$z,
    default: el,
    deleteEvent: deleteEvent$D,
    month: month$D,
    months: months$D,
    monthsGenitive: monthsGenitive$1,
    noEvent: noEvent$D,
    pm,
    today: today$D,
    week: week$D,
    weekDays: weekDays$D,
    year: year$D,
    years: years$D
  }, Symbol.toStringTag, { value: "Module" }));
  const weekDays$C = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const months$C = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const years$C = "Years";
  const year$C = "Year";
  const month$C = "Month";
  const week$C = "Week";
  const days$y = "Days";
  const day$C = "Day";
  const today$C = "Today";
  const noEvent$C = "No Event";
  const allDay$C = "All-day";
  const deleteEvent$C = "Delete";
  const createEvent$C = "Create an event";
  const dateFormat$C = "dddd D{S} MMMM YYYY";
  const enGb = {
    weekDays: weekDays$C,
    months: months$C,
    years: years$C,
    year: year$C,
    month: month$C,
    week: week$C,
    days: days$y,
    day: day$C,
    today: today$C,
    noEvent: noEvent$C,
    allDay: allDay$C,
    deleteEvent: deleteEvent$C,
    createEvent: createEvent$C,
    dateFormat: dateFormat$C
  };
  const enGb$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    allDay: allDay$C,
    createEvent: createEvent$C,
    dateFormat: dateFormat$C,
    day: day$C,
    days: days$y,
    default: enGb,
    deleteEvent: deleteEvent$C,
    month: month$C,
    months: months$C,
    noEvent: noEvent$C,
    today: today$C,
    week: week$C,
    weekDays: weekDays$C,
    year: year$C,
    years: years$C
  }, Symbol.toStringTag, { value: "Module" }));
  const weekDays$B = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  const months$B = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const years$B = "Años";
  const year$B = "Año";
  const month$B = "Mes";
  const week$B = "Semana";
  const days$x = "Días";
  const day$B = "Día";
  const today$B = "Hoy";
  const noEvent$B = "No hay evento";
  const allDay$B = "Todo el día";
  const deleteEvent$B = "Borrar";
  const createEvent$B = "Crear un evento";
  const dateFormat$B = "dddd D MMMM YYYY";
  const es = {
    weekDays: weekDays$B,
    months: months$B,
    years: years$B,
    year: year$B,
    month: month$B,
    week: week$B,
    days: days$x,
    day: day$B,
    today: today$B,
    noEvent: noEvent$B,
    allDay: allDay$B,
    deleteEvent: deleteEvent$B,
    createEvent: createEvent$B,
    dateFormat: dateFormat$B
  };
  const es$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    allDay: allDay$B,
    createEvent: createEvent$B,
    dateFormat: dateFormat$B,
    day: day$B,
    days: days$x,
    default: es,
    deleteEvent: deleteEvent$B,
    month: month$B,
    months: months$B,
    noEvent: noEvent$B,
    today: today$B,
    week: week$B,
    weekDays: weekDays$B,
    year: year$B,
    years: years$B
  }, Symbol.toStringTag, { value: "Module" }));
  const weekDays$A = ["Esmaspäev", "Teisipäev", "Kolmapäev", "Neljapäev", "Reede", "Laupäev", "Pühapäev"];
  const months$A = ["Jaanuar", "Veebruar", "Märts", "Aprill", "Mai", "Juuni", "Juuli", "August", "September", "Oktoober", "November", "Detsember"];
  const years$A = "Aastad";
  const year$A = "Aasta";
  const month$A = "Kuu";
  const week$A = "Nädal";
  const days$w = "Päeva";
  const day$A = "Päev";
  const today$A = "Täna";
  const noEvent$A = "Sündmus puudub";
  const allDay$A = "Terve päev";
  const deleteEvent$A = "Kustuta";
  const createEvent$A = "Loo sündmus";
  const dateFormat$A = "dddd D MMMM YYYY";
  const et = {
    weekDays: weekDays$A,
    months: months$A,
    years: years$A,
    year: year$A,
    month: month$A,
    week: week$A,
    days: days$w,
    day: day$A,
    today: today$A,
    noEvent: noEvent$A,
    allDay: allDay$A,
    deleteEvent: deleteEvent$A,
    createEvent: createEvent$A,
    dateFormat: dateFormat$A
  };
  const et$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    allDay: allDay$A,
    createEvent: createEvent$A,
    dateFormat: dateFormat$A,
    day: day$A,
    days: days$w,
    default: et,
    deleteEvent: deleteEvent$A,
    month: month$A,
    months: months$A,
    noEvent: noEvent$A,
    today: today$A,
    week: week$A,
    weekDays: weekDays$A,
    year: year$A,
    years: years$A
  }, Symbol.toStringTag, { value: "Module" }));
  const weekDays$z = ["دوشنبه", "سه شنبه", "چهار شنبه", "پنج شنبه", "جمعه", "شنبه", "یک شنبه"];
  const weekDaysShort$8 = ["د", "س", "چ", "پ", "ج", "ش", "ی"];
  const months$z = ["ژانویه", "فوریه", "مارس", "آوریل", "می", "ژوئن", "ژوئیه", "اوت", "سپتامبر", "اکتبر", "نوامبر", "دسامبر"];
  const years$z = "سالها";
  const year$z = "سال";
  const month$z = "ماه";
  const week$z = "هفته";
  const days$v = "روزها";
  const day$z = "روز";
  const today$z = "امروز";
  const noEvent$z = "رویدادی نیست";
  const allDay$z = "تمام روز";
  const deleteEvent$z = "حذف";
  const createEvent$z = "ایجاد یک رویداد";
  const dateFormat$z = "dddd D MMMM YYYY";
  const truncations$3 = false;
  const fa = {
    weekDays: weekDays$z,
    weekDaysShort: weekDaysShort$8,
    months: months$z,
    years: years$z,
    year: year$z,
    month: month$z,
    week: week$z,
    days: days$v,
    day: day$z,
    today: today$z,
    noEvent: noEvent$z,
    allDay: allDay$z,
    deleteEvent: deleteEvent$z,
    createEvent: createEvent$z,
    dateFormat: dateFormat$z,
    truncations: truncations$3
  };
  const fa$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    allDay: allDay$z,
    createEvent: createEvent$z,
    dateFormat: dateFormat$z,
    day: day$z,
    days: days$v,
    default: fa,
    deleteEvent: deleteEvent$z,
    month: month$z,
    months: months$z,
    noEvent: noEvent$z,
    today: today$z,
    truncations: truncations$3,
    week: week$z,
    weekDays: weekDays$z,
    weekDaysShort: weekDaysShort$8,
    year: year$z,
    years: years$z
  }, Symbol.toStringTag, { value: "Module" }));
  const weekDays$y = ["Maanantai", "Tiistai", "Keskiviikko", "Torstai", "Perjantai", "Lauantai", "Sunnuntai"];
  const months$y = ["Tammikuu", "Helmikuu", "Maaliskuu", "Huhtikuu", "Toukokuu", "Kesäkuu", "Heinäkuu", "Elokuu", "Syyskuu", "Lokakuu", "Marraskuu", "Joulukuu"];
  const years$y = "Vuodet";
  const year$y = "Vuosi";
  const month$y = "Kuukausi";
  const week$y = "Viikko";
  const days$u = "Päivät";
  const day$y = "Päivä";
  const today$y = "Tänään";
  const noEvent$y = "Ei tapahtumia";
  const allDay$y = "Koko päivä";
  const deleteEvent$y = "Poista tapahtuma";
  const createEvent$y = "Luo tapahtuma";
  const dateFormat$y = "dddd, D MMMM YYYY";
  const fi = {
    weekDays: weekDays$y,
    months: months$y,
    years: years$y,
    year: year$y,
    month: month$y,
    week: week$y,
    days: days$u,
    day: day$y,
    today: today$y,
    noEvent: noEvent$y,
    allDay: allDay$y,
    deleteEvent: deleteEvent$y,
    createEvent: createEvent$y,
    dateFormat: dateFormat$y
  };
  const fi$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    allDay: allDay$y,
    createEvent: createEvent$y,
    dateFormat: dateFormat$y,
    day: day$y,
    days: days$u,
    default: fi,
    deleteEvent: deleteEvent$y,
    month: month$y,
    months: months$y,
    noEvent: noEvent$y,
    today: today$y,
    week: week$y,
    weekDays: weekDays$y,
    year: year$y,
    years: years$y
  }, Symbol.toStringTag, { value: "Module" }));
  const weekDays$x = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
  const months$x = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
  const years$x = "Années";
  const year$x = "Année";
  const month$x = "Mois";
  const week$x = "Semaine";
  const days$t = "Jours";
  const day$x = "Jour";
  const today$x = "Aujourd'hui";
  const noEvent$x = "Aucun événement";
  const allDay$x = "Jour entier";
  const deleteEvent$x = "Supprimer";
  const createEvent$x = "Créer un événement";
  const dateFormat$x = "dddd D MMMM YYYY";
  const fr = {
    weekDays: weekDays$x,
    months: months$x,
    years: years$x,
    year: year$x,
    month: month$x,
    week: week$x,
    days: days$t,
    day: day$x,
    today: today$x,
    noEvent: noEvent$x,
    allDay: allDay$x,
    deleteEvent: deleteEvent$x,
    createEvent: createEvent$x,
    dateFormat: dateFormat$x
  };
  const fr$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    allDay: allDay$x,
    createEvent: createEvent$x,
    dateFormat: dateFormat$x,
    day: day$x,
    days: days$t,
    default: fr,
    deleteEvent: deleteEvent$x,
    month: month$x,
    months: months$x,
    noEvent: noEvent$x,
    today: today$x,
    week: week$x,
    weekDays: weekDays$x,
    year: year$x,
    years: years$x
  }, Symbol.toStringTag, { value: "Module" }));
  const weekDays$w = ["שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת", "ראשון"];
  const weekDaysShort$7 = ["ב", "ג", "ד", "ה", "ו", "ש", "א"];
  const months$w = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
  const years$w = "שנים";
  const year$w = "שנה";
  const month$w = "חודש";
  const week$w = "שבוע";
  const days$s = "ימים";
  const day$w = "יום";
  const today$w = "היום";
  const noEvent$w = "אין אירועים";
  const allDay$w = "כל היום";
  const deleteEvent$w = "מחיקה";
  const createEvent$w = "צור אירוע";
  const dateFormat$w = "dddd D MMMM YYYY";
  const truncations$2 = false;
  const he = {
    weekDays: weekDays$w,
    weekDaysShort: weekDaysShort$7,
    months: months$w,
    years: years$w,
    year: year$w,
    month: month$w,
    week: week$w,
    days: days$s,
    day: day$w,
    today: today$w,
    noEvent: noEvent$w,
    allDay: allDay$w,
    deleteEvent: deleteEvent$w,
    createEvent: createEvent$w,
    dateFormat: dateFormat$w,
    truncations: truncations$2
  };
  const he$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    allDay: allDay$w,
    createEvent: createEvent$w,
    dateFormat: dateFormat$w,
    day: day$w,
    days: days$s,
    default: he,
    deleteEvent: deleteEvent$w,
    month: month$w,
    months: months$w,
    noEvent: noEvent$w,
    today: today$w,
    truncations: truncations$2,
    week: week$w,
    weekDays: weekDays$w,
    weekDaysShort: weekDaysShort$7,
    year: year$w,
    years: years$w
  }, Symbol.toStringTag, { value: "Module" }));
  const weekDays$v = ["Ponedjeljak", "Utorak", "Srijeda", "Četvrtak", "Petak", "Subota", "Nedjelja"];
  const months$v = ["Siječanj", "Veljača", "Ožujak", "Travanj", "Svibanj", "Lipanj", "Srpanj", "Kolovoz", "Rujan", "Listopad", "Studeni", "Prosinac"];
  const years$v = "Godine";
  const year$v = "Godina";
  const month$v = "Mjesec";
  const week$v = "Tjedan";
  const days$r = "Dani";
  const day$v = "Dan";
  const today$v = "Današnji dan";
  const noEvent$v = "Nema događaja";
  const allDay$v = "Cijeli dan";
  const deleteEvent$v = "Obriši";
  const createEvent$v = "Kreiraj događaj";
  const dateFormat$v = "dddd D MMMM YYYY";
  const hr = {
    weekDays: weekDays$v,
    months: months$v,
    years: years$v,
    year: year$v,
    month: month$v,
    week: week$v,
    days: days$r,
    day: day$v,
    today: today$v,
    noEvent: noEvent$v,
    allDay: allDay$v,
    deleteEvent: deleteEvent$v,
    createEvent: createEvent$v,
    dateFormat: dateFormat$v
  };
  const hr$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    allDay: allDay$v,
    createEvent: createEvent$v,
    dateFormat: dateFormat$v,
    day: day$v,
    days: days$r,
    default: hr,
    deleteEvent: deleteEvent$v,
    month: month$v,
    months: months$v,
    noEvent: noEvent$v,
    today: today$v,
    week: week$v,
    weekDays: weekDays$v,
    year: year$v,
    years: years$v
  }, Symbol.toStringTag, { value: "Module" }));
  const weekDays$u = ["Hétfo", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat", "Vasárnap"];
  const months$u = ["Január", "Február", "Március", "Április", "Május", "Június", "Július", "Augusztus", "Szeptember", "Október", "November", "December"];
  const years$u = "Évek";
  const year$u = "Év";
  const month$u = "Hónap";
  const week$u = "Hét";
  const days$q = "Napok";
  const day$u = "Nap";
  const today$u = "Mai nap";
  const noEvent$u = "Nincs esemény";
  const allDay$u = "Egész nap";
  const deleteEvent$u = "Esemény törlese";
  const createEvent$u = "Esemény létrehozása";
  const dateFormat$u = "dddd D MMMM YYYY";
  const hu = {
    weekDays: weekDays$u,
    months: months$u,
    years: years$u,
    year: year$u,
    month: month$u,
    week: week$u,
    days: days$q,
    day: day$u,
    today: today$u,
    noEvent: noEvent$u,
    allDay: allDay$u,
    deleteEvent: deleteEvent$u,
    createEvent: createEvent$u,
    dateFormat: dateFormat$u
  };
  const hu$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    allDay: allDay$u,
    createEvent: createEvent$u,
    dateFormat: dateFormat$u,
    day: day$u,
    days: days$q,
    default: hu,
    deleteEvent: deleteEvent$u,
    month: month$u,
    months: months$u,
    noEvent: noEvent$u,
    today: today$u,
    week: week$u,
    weekDays: weekDays$u,
    year: year$u,
    years: years$u
  }, Symbol.toStringTag, { value: "Module" }));
  const weekDays$t = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
  const months$t = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const years$t = "Tahunan";
  const year$t = "Tahun";
  const month$t = "Bulan";
  const week$t = "Minggu";
  const days$p = "Hari";
  const day$t = "Hari";
  const today$t = "Hari Ini";
  const noEvent$t = "Tidak Ada Kegiatan";
  const allDay$t = "Sepanjang Hari";
  const deleteEvent$t = "Hapus";
  const createEvent$t = "Tambah Kegiatan";
  const dateFormat$t = "dddd, D MMMM YYYY";
  const id = {
    weekDays: weekDays$t,
    months: months$t,
    years: years$t,
    year: year$t,
    month: month$t,
    week: week$t,
    days: days$p,
    day: day$t,
    today: today$t,
    noEvent: noEvent$t,
    allDay: allDay$t,
    deleteEvent: deleteEvent$t,
    createEvent: createEvent$t,
    dateFormat: dateFormat$t
  };
  const id$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    allDay: allDay$t,
    createEvent: createEvent$t,
    dateFormat: dateFormat$t,
    day: day$t,
    days: days$p,
    default: id,
    deleteEvent: deleteEvent$t,
    month: month$t,
    months: months$t,
    noEvent: noEvent$t,
    today: today$t,
    week: week$t,
    weekDays: weekDays$t,
    year: year$t,
    years: years$t
  }, Symbol.toStringTag, { value: "Module" }));
  const weekDays$s = ["Mánudagur", "Þriðjudagur", "Miðvikudagur", "Fimmtudagur", "Föstudagur", "Laugardagur", "Sunnudagur"];
  const months$s = ["Janúar", "Febrúar", "Mars", "Apríl", "Maí", "Júní", "Júlí", "Ágúst", "September", "Október", "Nóvember", "Desember"];
  const years$s = "Ár";
  const year$s = "Ár";
  const month$s = "Mánuður";
  const week$s = "Vika";
  const days$o = "Dagar";
  const day$s = "Dagur";
  const today$s = "Í dag";
  const noEvent$s = "Enginn atburður";
  const allDay$s = "Allan daginn";
  const deleteEvent$s = "Eyða";
  const createEvent$s = "Búðu til viðburð";
  const dateFormat$s = "dddd D MMMM YYYY";
  const is = {
    weekDays: weekDays$s,
    months: months$s,
    years: years$s,
    year: year$s,
    month: month$s,
    week: week$s,
    days: days$o,
    day: day$s,
    today: today$s,
    noEvent: noEvent$s,
    allDay: allDay$s,
    deleteEvent: deleteEvent$s,
    createEvent: createEvent$s,
    dateFormat: dateFormat$s
  };
  const is$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    allDay: allDay$s,
    createEvent: createEvent$s,
    dateFormat: dateFormat$s,
    day: day$s,
    days: days$o,
    default: is,
    deleteEvent: deleteEvent$s,
    month: month$s,
    months: months$s,
    noEvent: noEvent$s,
    today: today$s,
    week: week$s,
    weekDays: weekDays$s,
    year: year$s,
    years: years$s
  }, Symbol.toStringTag, { value: "Module" }));
  const weekDays$r = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];
  const months$r = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
  const years$r = "Anni";
  const year$r = "Anno";
  const month$r = "Mese";
  const week$r = "Settimana";
  const days$n = "Giorni";
  const day$r = "Giorno";
  const today$r = "Oggi";
  const noEvent$r = "Nessun evento";
  const allDay$r = "Tutto il giorno";
  const deleteEvent$r = "Cancella";
  const createEvent$r = "Crea evento";
  const dateFormat$r = "dddd D MMMM YYYY";
  const it = {
    weekDays: weekDays$r,
    months: months$r,
    years: years$r,
    year: year$r,
    month: month$r,
    week: week$r,
    days: days$n,
    day: day$r,
    today: today$r,
    noEvent: noEvent$r,
    allDay: allDay$r,
    deleteEvent: deleteEvent$r,
    createEvent: createEvent$r,
    dateFormat: dateFormat$r
  };
  const it$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    allDay: allDay$r,
    createEvent: createEvent$r,
    dateFormat: dateFormat$r,
    day: day$r,
    days: days$n,
    default: it,
    deleteEvent: deleteEvent$r,
    month: month$r,
    months: months$r,
    noEvent: noEvent$r,
    today: today$r,
    week: week$r,
    weekDays: weekDays$r,
    year: year$r,
    years: years$r
  }, Symbol.toStringTag, { value: "Module" }));
  const weekDays$q = ["月", "火", "水", "木", "金", "土", "日"];
  const months$q = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
  const years$q = "年";
  const year$q = "今年";
  const month$q = "月";
  const week$q = "週";
  const days$m = "日々";
  const day$q = "日";
  const today$q = "今日";
  const noEvent$q = "イベントなし";
  const allDay$q = "終日";
  const deleteEvent$q = "削除";
  const createEvent$q = "イベント作成";
  const dateFormat$q = "YYYY年 MMMM D日 (dddd)";
  const truncations$1 = false;
  const ja = {
    weekDays: weekDays$q,
    months: months$q,
    years: years$q,
    year: year$q,
    month: month$q,
    week: week$q,
    days: days$m,
    day: day$q,
    today: today$q,
    noEvent: noEvent$q,
    allDay: allDay$q,
    deleteEvent: deleteEvent$q,
    createEvent: createEvent$q,
    dateFormat: dateFormat$q,
    truncations: truncations$1
  };
  const ja$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    allDay: allDay$q,
    createEvent: createEvent$q,
    dateFormat: dateFormat$q,
    day: day$q,
    days: days$m,
    default: ja,
    deleteEvent: deleteEvent$q,
    month: month$q,
    months: months$q,
    noEvent: noEvent$q,
    today: today$q,
    truncations: truncations$1,
    week: week$q,
    weekDays: weekDays$q,
    year: year$q,
    years: years$q
  }, Symbol.toStringTag, { value: "Module" }));
  const weekDays$p = ["ორშაბათი", "სამშაბათი", "ოთხშაბათი", "ხუთშაბათი", "პარასკევი", "შაბათი", "კვირა"];
  const months$p = ["იანვარი", "თებერვალი", "მარტი", "აპრილი", "მაისი", "ივნისი", "ივლისი", "აგვისტო", "სექტემბერი", "ოქტომბერი", "ნოემბერი", "დეკემბერი"];
  const years$p = "წლები";
  const year$p = "წელი";
  const month$p = "თვე";
  const week$p = "კვირა";
  const days$l = "დღეები";
  const day$p = "დღე";
  const today$p = "დღეს";
  const noEvent$p = "ღონისძიება არ არის";
  const allDay$p = "მთელი დღე";
  const deleteEvent$p = "წაშლა";
  const createEvent$p = "შექმენით ღონისძიება";
  const dateFormat$p = "dddd D MMMM YYYY";
  const ka = {
    weekDays: weekDays$p,
    months: months$p,
    years: years$p,
    year: year$p,
    month: month$p,
    week: week$p,
    days: days$l,
    day: day$p,
    today: today$p,
    noEvent: noEvent$p,
    allDay: allDay$p,
    deleteEvent: deleteEvent$p,
    createEvent: createEvent$p,
    dateFormat: dateFormat$p
  };
  const ka$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    allDay: allDay$p,
    createEvent: createEvent$p,
    dateFormat: dateFormat$p,
    day: day$p,
    days: days$l,
    default: ka,
    deleteEvent: deleteEvent$p,
    month: month$p,
    months: months$p,
    noEvent: noEvent$p,
    today: today$p,
    week: week$p,
    weekDays: weekDays$p,
    year: year$p,
    years: years$p
  }, Symbol.toStringTag, { value: "Module" }));
  const weekDays$o = ["Dúysenbi", "Seysenbi", "Sársenbi", "Beysenbi", "Juma", "Senbi", "Jeksenbi"];
  const months$o = ["Yanwar", "Fevral", "Mart", "Aprel", "May", "Iýn", "Iýl", "Awgust", "Sentýabr", "Októabr", "Nóýabr", "Dekábr"];
  const years$o = "Jıllar";
  const year$o = "Jıl";
  const month$o = "Ay";
  const week$o = "Ha'pte";
  const day$o = "Kún";
  const today$o = "Búgin";
  const noEvent$o = "Ta'dbir joq";
  const allDay$o = "Bárlıq kún";
  const deleteEvent$o = "Óshiriw";
  const createEvent$o = "Ta'dbir sho'lkemlestriw";
  const dateFormat$o = "dddd D MMMM YYYY";
  const kaa = {
    weekDays: weekDays$o,
    months: months$o,
    years: years$o,
    year: year$o,
    month: month$o,
    week: week$o,
    day: day$o,
    today: today$o,
    noEvent: noEvent$o,
    allDay: allDay$o,
    deleteEvent: deleteEvent$o,
    createEvent: createEvent$o,
    dateFormat: dateFormat$o
  };
  const kaa$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    allDay: allDay$o,
    createEvent: createEvent$o,
    dateFormat: dateFormat$o,
    day: day$o,
    default: kaa,
    deleteEvent: deleteEvent$o,
    month: month$o,
    months: months$o,
    noEvent: noEvent$o,
    today: today$o,
    week: week$o,
    weekDays: weekDays$o,
    year: year$o,
    years: years$o
  }, Symbol.toStringTag, { value: "Module" }));
  const weekDays$n = ["Дүйсенбі", "Сейсенбі", "Сәрсенбі", "Бейсенбі", "Жұма", "Сенбі", "Жексенбі"];
  const weekDaysShort$6 = ["Дс", "Сс", "Ср", "Бс", "Жм", "Сб", "Жс"];
  const months$n = ["Қаңтар", "Ақпан", "Наурыз", "Сәуір", "Мамыр", "Маусым", "Шілде", "Тамыз", "Қыркүйек", "Қазан", "Қараша", "Желтоқсан"];
  const years$n = "Жылдар";
  const year$n = "Жыл";
  const month$n = "Ай";
  const week$n = "Апта";
  const days$k = "Күндер";
  const day$n = "Күн";
  const today$n = "Бүгін";
  const noEvent$n = "Іс-шара жоқ";
  const allDay$n = "Күні бойы";
  const deleteEvent$n = "Жою";
  const createEvent$n = "Іс-шара құру";
  const dateFormat$n = "dddd D MMMM YYYY";
  const kk = {
    weekDays: weekDays$n,
    weekDaysShort: weekDaysShort$6,
    months: months$n,
    years: years$n,
    year: year$n,
    month: month$n,
    week: week$n,
    days: days$k,
    day: day$n,
    today: today$n,
    noEvent: noEvent$n,
    allDay: allDay$n,
    deleteEvent: deleteEvent$n,
    createEvent: createEvent$n,
    dateFormat: dateFormat$n
  };
  const kk$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    allDay: allDay$n,
    createEvent: createEvent$n,
    dateFormat: dateFormat$n,
    day: day$n,
    days: days$k,
    default: kk,
    deleteEvent: deleteEvent$n,
    month: month$n,
    months: months$n,
    noEvent: noEvent$n,
    today: today$n,
    week: week$n,
    weekDays: weekDays$n,
    weekDaysShort: weekDaysShort$6,
    year: year$n,
    years: years$n
  }, Symbol.toStringTag, { value: "Module" }));
  const weekDays$m = ["월", "화", "수", "목", "금", "토", "일"];
  const months$m = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
  const years$m = "년도";
  const year$m = "연간";
  const month$m = "월간";
  const week$m = "주간";
  const days$j = "일수";
  const day$m = "일간";
  const today$m = "오늘";
  const noEvent$m = "일정 없음";
  const allDay$m = "하루 종일";
  const deleteEvent$m = "삭제";
  const createEvent$m = "일정 추가";
  const dateFormat$m = "YYYY년 MMMM D일 dddd요일";
  const truncations = false;
  const ko = {
    weekDays: weekDays$m,
    months: months$m,
    years: years$m,
    year: year$m,
    month: month$m,
    week: week$m,
    days: days$j,
    day: day$m,
    today: today$m,
    noEvent: noEvent$m,
    allDay: allDay$m,
    deleteEvent: deleteEvent$m,
    createEvent: createEvent$m,
    dateFormat: dateFormat$m,
    truncations
  };
  const ko$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    allDay: allDay$m,
    createEvent: createEvent$m,
    dateFormat: dateFormat$m,
    day: day$m,
    days: days$j,
    default: ko,
    deleteEvent: deleteEvent$m,
    month: month$m,
    months: months$m,
    noEvent: noEvent$m,
    today: today$m,
    truncations,
    week: week$m,
    weekDays: weekDays$m,
    year: year$m,
    years: years$m
  }, Symbol.toStringTag, { value: "Module" }));
  const weekDays$l = ["Дүйшөмбү", "Шейшемби", "Шаршемби", "Бейшемби", "Жума", "Ишемби", "Жекшемби"];
  const months$l = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
  const years$l = "Жылдар";
  const year$l = "Жыл";
  const month$l = "Ай";
  const week$l = "Жума";
  const day$l = "Күн";
  const today$l = "Бүгүн";
  const noEvent$l = "Иш-чара жок";
  const allDay$l = "Күн бою";
  const deleteEvent$l = "Өчүрүү";
  const createEvent$l = "Иш-чара түзүү";
  const dateFormat$l = "dddd D MMMM YYYY";
  const ky = {
    weekDays: weekDays$l,
    months: months$l,
    years: years$l,
    year: year$l,
    month: month$l,
    week: week$l,
    day: day$l,
    today: today$l,
    noEvent: noEvent$l,
    allDay: allDay$l,
    deleteEvent: deleteEvent$l,
    createEvent: createEvent$l,
    dateFormat: dateFormat$l
  };
  const ky$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    allDay: allDay$l,
    createEvent: createEvent$l,
    dateFormat: dateFormat$l,
    day: day$l,
    default: ky,
    deleteEvent: deleteEvent$l,
    month: month$l,
    months: months$l,
    noEvent: noEvent$l,
    today: today$l,
    week: week$l,
    weekDays: weekDays$l,
    year: year$l,
    years: years$l
  }, Symbol.toStringTag, { value: "Module" }));
  const weekDays$k = ["Pirmadienis", "Antradienis", "Trečiadienis", "Ketvirtadienis", "Penktadienis", "Šeštadienis", "Sekmadienis"];
  const months$k = ["Sausis", "Vasaris", "Kovas", "Balandis", "Gegužė", "Birželis", "Liepa", "Rugpjūtis", "Rugsėjis", "Spalis", "Lapkritis", "Gruodis"];
  const years$k = "Metų pasirinkimas";
  const year$k = "Metai";
  const month$k = "Mėnesis";
  const week$k = "Savaitė";
  const days$i = "Dienos";
  const day$k = "Diena";
  const today$k = "Šiandien";
  const noEvent$k = "Jokių įvykių";
  const allDay$k = "Visa diena";
  const deleteEvent$k = "Ištrinti";
  const createEvent$k = "Sukurti įvykį";
  const dateFormat$k = "dddd, D MMMM YYYY";
  const lt = {
    weekDays: weekDays$k,
    months: months$k,
    years: years$k,
    year: year$k,
    month: month$k,
    week: week$k,
    days: days$i,
    day: day$k,
    today: today$k,
    noEvent: noEvent$k,
    allDay: allDay$k,
    deleteEvent: deleteEvent$k,
    createEvent: createEvent$k,
    dateFormat: dateFormat$k
  };
  const lt$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    allDay: allDay$k,
    createEvent: createEvent$k,
    dateFormat: dateFormat$k,
    day: day$k,
    days: days$i,
    default: lt,
    deleteEvent: deleteEvent$k,
    month: month$k,
    months: months$k,
    noEvent: noEvent$k,
    today: today$k,
    week: week$k,
    weekDays: weekDays$k,
    year: year$k,
    years: years$k
  }, Symbol.toStringTag, { value: "Module" }));
  const weekDays$j = ["Даваа", "Мягмар", "Лхавга", "Пүрэв", "Баасан", "Бямба", "Ням"];
  const months$j = ["1-р сар", "2-р сар", "3-р сар", "4-р сар", "5-р сар", "6-р сар", "7-р сар", "8-р сар", "9-р сар", "10-р сар", "11-р сар", "12-р сар"];
  const years$j = "Жилүүд";
  const year$j = "Жил";
  const month$j = "Сар";
  const week$j = "Долоо хоног";
  const days$h = "Өдрийн";
  const day$j = "Өдөр";
  const today$j = "Өнөөдөр";
  const noEvent$j = "Тэмдэглэлгүй";
  const allDay$j = "Бүх өдөр";
  const deleteEvent$j = "Устгах";
  const createEvent$j = "Шинэ тэмдэглэл";
  const dateFormat$j = "dddd D MMMM YYYY";
  const mn = {
    weekDays: weekDays$j,
    months: months$j,
    years: years$j,
    year: year$j,
    month: month$j,
    week: week$j,
    days: days$h,
    day: day$j,
    today: today$j,
    noEvent: noEvent$j,
    allDay: allDay$j,
    deleteEvent: deleteEvent$j,
    createEvent: createEvent$j,
    dateFormat: dateFormat$j
  };
  const mn$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    allDay: allDay$j,
    createEvent: createEvent$j,
    dateFormat: dateFormat$j,
    day: day$j,
    days: days$h,
    default: mn,
    deleteEvent: deleteEvent$j,
    month: month$j,
    months: months$j,
    noEvent: noEvent$j,
    today: today$j,
    week: week$j,
    weekDays: weekDays$j,
    year: year$j,
    years: years$j
  }, Symbol.toStringTag, { value: "Module" }));
  const weekDays$i = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag"];
  const months$i = ["Januari", "Februari", "Maart", "April", "Mei", "Juni", "Juli", "Augustus", "September", "Oktober", "November", "December"];
  const years$i = "Jaren";
  const year$i = "Jaar";
  const month$i = "Maand";
  const week$i = "Week";
  const days$g = "Dagen";
  const day$i = "Dag";
  const today$i = "Vandaag";
  const noEvent$i = "Geen afspraken";
  const allDay$i = "Hele dag";
  const deleteEvent$i = "Verwijderen";
  const createEvent$i = "Nieuwe afspraak aanmaken";
  const dateFormat$i = "dddd D MMMM YYYY";
  const nl = {
    weekDays: weekDays$i,
    months: months$i,
    years: years$i,
    year: year$i,
    month: month$i,
    week: week$i,
    days: days$g,
    day: day$i,
    today: today$i,
    noEvent: noEvent$i,
    allDay: allDay$i,
    deleteEvent: deleteEvent$i,
    createEvent: createEvent$i,
    dateFormat: dateFormat$i
  };
  const nl$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    allDay: allDay$i,
    createEvent: createEvent$i,
    dateFormat: dateFormat$i,
    day: day$i,
    days: days$g,
    default: nl,
    deleteEvent: deleteEvent$i,
    month: month$i,
    months: months$i,
    noEvent: noEvent$i,
    today: today$i,
    week: week$i,
    weekDays: weekDays$i,
    year: year$i,
    years: years$i
  }, Symbol.toStringTag, { value: "Module" }));
  const weekDays$h = ["Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag", "Søndag"];
  const months$h = ["Januar", "Februar", "Mars", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Desember"];
  const years$h = "Velg år";
  const year$h = "År";
  const month$h = "Måned";
  const week$h = "Uke";
  const days$f = "Dager";
  const day$h = "Dag";
  const today$h = "Idag";
  const noEvent$h = "Ingen hendelse";
  const allDay$h = "Hele dagen";
  const deleteEvent$h = "Ta bort";
  const createEvent$h = "Ny hendelse";
  const dateFormat$h = "dddd, D. MMMM YYYY";
  const no = {
    weekDays: weekDays$h,
    months: months$h,
    years: years$h,
    year: year$h,
    month: month$h,
    week: week$h,
    days: days$f,
    day: day$h,
    today: today$h,
    noEvent: noEvent$h,
    allDay: allDay$h,
    deleteEvent: deleteEvent$h,
    createEvent: createEvent$h,
    dateFormat: dateFormat$h
  };
  const no$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    allDay: allDay$h,
    createEvent: createEvent$h,
    dateFormat: dateFormat$h,
    day: day$h,
    days: days$f,
    default: no,
    deleteEvent: deleteEvent$h,
    month: month$h,
    months: months$h,
    noEvent: noEvent$h,
    today: today$h,
    week: week$h,
    weekDays: weekDays$h,
    year: year$h,
    years: years$h
  }, Symbol.toStringTag, { value: "Module" }));
  const weekDays$g = ["Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota", "Niedziela"];
  const months$g = ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"];
  const years$g = "Lata";
  const year$g = "Rok";
  const month$g = "Miesiąc";
  const week$g = "Tydzień";
  const days$e = "Dni";
  const day$g = "Dzień";
  const today$g = "Dzisiaj";
  const noEvent$g = "Brak wydarzeń";
  const allDay$g = "Cały dzień";
  const deleteEvent$g = "Usuń";
  const createEvent$g = "Utwórz wydarzenie";
  const dateFormat$g = "dddd, D MMMM YYYY";
  const pl = {
    weekDays: weekDays$g,
    months: months$g,
    years: years$g,
    year: year$g,
    month: month$g,
    week: week$g,
    days: days$e,
    day: day$g,
    today: today$g,
    noEvent: noEvent$g,
    allDay: allDay$g,
    deleteEvent: deleteEvent$g,
    createEvent: createEvent$g,
    dateFormat: dateFormat$g
  };
  const pl$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    allDay: allDay$g,
    createEvent: createEvent$g,
    dateFormat: dateFormat$g,
    day: day$g,
    days: days$e,
    default: pl,
    deleteEvent: deleteEvent$g,
    month: month$g,
    months: months$g,
    noEvent: noEvent$g,
    today: today$g,
    week: week$g,
    weekDays: weekDays$g,
    year: year$g,
    years: years$g
  }, Symbol.toStringTag, { value: "Module" }));
  const weekDays$f = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"];
  const months$f = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const years$f = "Anos";
  const year$f = "Ano";
  const month$f = "Mês";
  const week$f = "Semana";
  const days$d = "Dias";
  const day$f = "Dia";
  const today$f = "Hoje";
  const noEvent$f = "Sem eventos";
  const allDay$f = "Dia inteiro";
  const deleteEvent$f = "Remover";
  const createEvent$f = "Criar um evento";
  const dateFormat$f = "dddd D MMMM YYYY";
  const ptBr = {
    weekDays: weekDays$f,
    months: months$f,
    years: years$f,
    year: year$f,
    month: month$f,
    week: week$f,
    days: days$d,
    day: day$f,
    today: today$f,
    noEvent: noEvent$f,
    allDay: allDay$f,
    deleteEvent: deleteEvent$f,
    createEvent: createEvent$f,
    dateFormat: dateFormat$f
  };
  const ptBr$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    allDay: allDay$f,
    createEvent: createEvent$f,
    dateFormat: dateFormat$f,
    day: day$f,
    days: days$d,
    default: ptBr,
    deleteEvent: deleteEvent$f,
    month: month$f,
    months: months$f,
    noEvent: noEvent$f,
    today: today$f,
    week: week$f,
    weekDays: weekDays$f,
    year: year$f,
    years: years$f
  }, Symbol.toStringTag, { value: "Module" }));
  const weekDays$e = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"];
  const months$e = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const years$e = "Anos";
  const year$e = "Ano";
  const month$e = "Mês";
  const week$e = "Semana";
  const days$c = "Dias";
  const day$e = "Dia";
  const today$e = "Hoje";
  const noEvent$e = "Sem eventos";
  const allDay$e = "Dia inteiro";
  const deleteEvent$e = "Remover";
  const createEvent$e = "Criar um evento";
  const dateFormat$e = "dddd D MMMM YYYY";
  const ptPt = {
    weekDays: weekDays$e,
    months: months$e,
    years: years$e,
    year: year$e,
    month: month$e,
    week: week$e,
    days: days$c,
    day: day$e,
    today: today$e,
    noEvent: noEvent$e,
    allDay: allDay$e,
    deleteEvent: deleteEvent$e,
    createEvent: createEvent$e,
    dateFormat: dateFormat$e
  };
  const ptPt$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    allDay: allDay$e,
    createEvent: createEvent$e,
    dateFormat: dateFormat$e,
    day: day$e,
    days: days$c,
    default: ptPt,
    deleteEvent: deleteEvent$e,
    month: month$e,
    months: months$e,
    noEvent: noEvent$e,
    today: today$e,
    week: week$e,
    weekDays: weekDays$e,
    year: year$e,
    years: years$e
  }, Symbol.toStringTag, { value: "Module" }));
  const weekDays$d = ["Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbăta", "Duminică"];
  const months$d = ["Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie", "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"];
  const years$d = "Ani";
  const year$d = "An";
  const month$d = "Lună";
  const week$d = "Săptămână";
  const days$b = "Zile";
  const day$d = "Zi";
  const today$d = "Azi";
  const noEvent$d = "Nici o interacțiune";
  const allDay$d = "Toată ziua";
  const deleteEvent$d = "Șterge";
  const createEvent$d = "Adaugă un eveniment";
  const dateFormat$d = "dddd D MMMM YYYY";
  const ro = {
    weekDays: weekDays$d,
    months: months$d,
    years: years$d,
    year: year$d,
    month: month$d,
    week: week$d,
    days: days$b,
    day: day$d,
    today: today$d,
    noEvent: noEvent$d,
    allDay: allDay$d,
    deleteEvent: deleteEvent$d,
    createEvent: createEvent$d,
    dateFormat: dateFormat$d
  };
  const ro$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    allDay: allDay$d,
    createEvent: createEvent$d,
    dateFormat: dateFormat$d,
    day: day$d,
    days: days$b,
    default: ro,
    deleteEvent: deleteEvent$d,
    month: month$d,
    months: months$d,
    noEvent: noEvent$d,
    today: today$d,
    week: week$d,
    weekDays: weekDays$d,
    year: year$d,
    years: years$d
  }, Symbol.toStringTag, { value: "Module" }));
  const weekDays$c = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];
  const weekDaysShort$5 = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  const months$c = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
  const monthsGenitive = ["Января", "Февраля", "Марта", "Апреля", "Мая", "Июня", "Июля", "Августа", "Сентября", "Октября", "Ноября", "Декабря"];
  const years$c = "Годы";
  const year$c = "Год";
  const month$c = "Месяц";
  const week$c = "Неделя";
  const days$a = "Дни";
  const day$c = "День";
  const today$c = "Сегодня";
  const noEvent$c = "Нет событий";
  const allDay$c = "Весь день";
  const deleteEvent$c = "Удалить";
  const createEvent$c = "Создать событие";
  const dateFormat$c = "dddd D MMMM YYYY";
  const ru = {
    weekDays: weekDays$c,
    weekDaysShort: weekDaysShort$5,
    months: months$c,
    monthsGenitive,
    years: years$c,
    year: year$c,
    month: month$c,
    week: week$c,
    days: days$a,
    day: day$c,
    today: today$c,
    noEvent: noEvent$c,
    allDay: allDay$c,
    deleteEvent: deleteEvent$c,
    createEvent: createEvent$c,
    dateFormat: dateFormat$c
  };
  const ru$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    allDay: allDay$c,
    createEvent: createEvent$c,
    dateFormat: dateFormat$c,
    day: day$c,
    days: days$a,
    default: ru,
    deleteEvent: deleteEvent$c,
    month: month$c,
    months: months$c,
    monthsGenitive,
    noEvent: noEvent$c,
    today: today$c,
    week: week$c,
    weekDays: weekDays$c,
    weekDaysShort: weekDaysShort$5,
    year: year$c,
    years: years$c
  }, Symbol.toStringTag, { value: "Module" }));
  const weekDays$b = ["Pondelok", "Utorok", "Streda", "Štvrtok", "Piatok", "Sobota", "Nedeľa"];
  const months$b = ["Január", "Február", "Marec", "Apríl", "Máj", "Jún", "Júl", "August", "September", "Október", "November", "December"];
  const years$b = "Roky";
  const year$b = "Rok";
  const month$b = "Mesiac";
  const week$b = "Týždeň";
  const days$9 = "Dni";
  const day$b = "Deň";
  const today$b = "Dnes";
  const noEvent$b = "Bez udalosti";
  const allDay$b = "Celý deň";
  const deleteEvent$b = "Odstrániť";
  const createEvent$b = "Vytvoriť udalosť";
  const dateFormat$b = "dddd D. MMMM YYYY";
  const sk = {
    weekDays: weekDays$b,
    months: months$b,
    years: years$b,
    year: year$b,
    month: month$b,
    week: week$b,
    days: days$9,
    day: day$b,
    today: today$b,
    noEvent: noEvent$b,
    allDay: allDay$b,
    deleteEvent: deleteEvent$b,
    createEvent: createEvent$b,
    dateFormat: dateFormat$b
  };
  const sk$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    allDay: allDay$b,
    createEvent: createEvent$b,
    dateFormat: dateFormat$b,
    day: day$b,
    days: days$9,
    default: sk,
    deleteEvent: deleteEvent$b,
    month: month$b,
    months: months$b,
    noEvent: noEvent$b,
    today: today$b,
    week: week$b,
    weekDays: weekDays$b,
    year: year$b,
    years: years$b
  }, Symbol.toStringTag, { value: "Module" }));
  const weekDays$a = ["Ponedeljek", "Torek", "Sreda", "Četrtek", "Petek", "Sobota", "Nedelja"];
  const months$a = ["Januar", "Februar", "Marec", "April", "Maj", "Junij", "Julij", "Avgust", "September", "Oktober", "November", "December"];
  const years$a = "Leta";
  const year$a = "Leto";
  const month$a = "Mesec";
  const week$a = "Teden";
  const days$8 = "Dni";
  const day$a = "Dan";
  const today$a = "Danes";
  const noEvent$a = "Ni dogodkov";
  const allDay$a = "Cel dan";
  const deleteEvent$a = "Odstrani";
  const createEvent$a = "Ustvari dogodek";
  const dateFormat$a = "dddd MMMM D, YYYY";
  const sl = {
    weekDays: weekDays$a,
    months: months$a,
    years: years$a,
    year: year$a,
    month: month$a,
    week: week$a,
    days: days$8,
    day: day$a,
    today: today$a,
    noEvent: noEvent$a,
    allDay: allDay$a,
    deleteEvent: deleteEvent$a,
    createEvent: createEvent$a,
    dateFormat: dateFormat$a
  };
  const sl$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    allDay: allDay$a,
    createEvent: createEvent$a,
    dateFormat: dateFormat$a,
    day: day$a,
    days: days$8,
    default: sl,
    deleteEvent: deleteEvent$a,
    month: month$a,
    months: months$a,
    noEvent: noEvent$a,
    today: today$a,
    week: week$a,
    weekDays: weekDays$a,
    year: year$a,
    years: years$a
  }, Symbol.toStringTag, { value: "Module" }));
  const weekDays$9 = ["E Hënë", "E Martë", "E Mërkurë", "E Enjte", "E Premte", "E Shtunë", "E Diel"];
  const weekDaysShort$4 = ["Hë", "Ma", "Mr", "Enj", "Pr", "Sh", "D"];
  const months$9 = ["Janar", "Shkurt", "Mars", "Prill", "Maj", "Qershor", "Korrik", "Gusht", "Shtator", "Tetor", "Nëntor", "Dhjetor"];
  const years$9 = "Vitet";
  const year$9 = "Viti";
  const month$9 = "Muaji";
  const week$9 = "Java";
  const days$7 = "Ditë";
  const day$9 = "Dita";
  const today$9 = "Sot";
  const noEvent$9 = "Nuk ka event";
  const allDay$9 = "Tërë ditën";
  const deleteEvent$9 = "Fshijë";
  const createEvent$9 = "Krijo një event";
  const dateFormat$9 = "dddd D MMMM YYYY";
  const sq = {
    weekDays: weekDays$9,
    weekDaysShort: weekDaysShort$4,
    months: months$9,
    years: years$9,
    year: year$9,
    month: month$9,
    week: week$9,
    days: days$7,
    day: day$9,
    today: today$9,
    noEvent: noEvent$9,
    allDay: allDay$9,
    deleteEvent: deleteEvent$9,
    createEvent: createEvent$9,
    dateFormat: dateFormat$9
  };
  const sq$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    allDay: allDay$9,
    createEvent: createEvent$9,
    dateFormat: dateFormat$9,
    day: day$9,
    days: days$7,
    default: sq,
    deleteEvent: deleteEvent$9,
    month: month$9,
    months: months$9,
    noEvent: noEvent$9,
    today: today$9,
    week: week$9,
    weekDays: weekDays$9,
    weekDaysShort: weekDaysShort$4,
    year: year$9,
    years: years$9
  }, Symbol.toStringTag, { value: "Module" }));
  const weekDays$8 = ["Ponedeljak", "Utorak", "Sreda", "Četvrtak", "Petak", "Subota", "Nedelja"];
  const months$8 = ["Januar", "Februar", "Mart", "April", "Maj", "Jun", "Jul", "Avgust", "Septembar", "Oktobar", "Novembar", "Decembar"];
  const years$8 = "Godine";
  const year$8 = "Godina";
  const month$8 = "Mesec";
  const week$8 = "Sedmica";
  const days$6 = "Dana";
  const day$8 = "Dan";
  const today$8 = "Danas";
  const noEvent$8 = "Nema događaja";
  const allDay$8 = "Celi dan";
  const deleteEvent$8 = "Obriši";
  const createEvent$8 = "Kreiraj događaj";
  const dateFormat$8 = "dddd D MMMM YYYY";
  const sr = {
    weekDays: weekDays$8,
    months: months$8,
    years: years$8,
    year: year$8,
    month: month$8,
    week: week$8,
    days: days$6,
    day: day$8,
    today: today$8,
    noEvent: noEvent$8,
    allDay: allDay$8,
    deleteEvent: deleteEvent$8,
    createEvent: createEvent$8,
    dateFormat: dateFormat$8
  };
  const sr$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    allDay: allDay$8,
    createEvent: createEvent$8,
    dateFormat: dateFormat$8,
    day: day$8,
    days: days$6,
    default: sr,
    deleteEvent: deleteEvent$8,
    month: month$8,
    months: months$8,
    noEvent: noEvent$8,
    today: today$8,
    week: week$8,
    weekDays: weekDays$8,
    year: year$8,
    years: years$8
  }, Symbol.toStringTag, { value: "Module" }));
  const weekDays$7 = ["Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag", "Lördag", "Söndag"];
  const months$7 = ["Januari", "Februari", "Mars", "April", "Maj", "Juni", "Juli", "Augusti", "September", "Oktober", "November", "December"];
  const years$7 = "År";
  const year$7 = "År";
  const month$7 = "Månad";
  const week$7 = "Vecka";
  const days$5 = "Dagar";
  const day$7 = "Dag";
  const today$7 = "Idag";
  const noEvent$7 = "Ingen händelse";
  const allDay$7 = "Heldag";
  const deleteEvent$7 = "Ta bort";
  const createEvent$7 = "Skapa händelse";
  const dateFormat$7 = "dddd den D MMMM YYYY";
  const sv = {
    weekDays: weekDays$7,
    months: months$7,
    years: years$7,
    year: year$7,
    month: month$7,
    week: week$7,
    days: days$5,
    day: day$7,
    today: today$7,
    noEvent: noEvent$7,
    allDay: allDay$7,
    deleteEvent: deleteEvent$7,
    createEvent: createEvent$7,
    dateFormat: dateFormat$7
  };
  const sv$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    allDay: allDay$7,
    createEvent: createEvent$7,
    dateFormat: dateFormat$7,
    day: day$7,
    days: days$5,
    default: sv,
    deleteEvent: deleteEvent$7,
    month: month$7,
    months: months$7,
    noEvent: noEvent$7,
    today: today$7,
    week: week$7,
    weekDays: weekDays$7,
    year: year$7,
    years: years$7
  }, Symbol.toStringTag, { value: "Module" }));
  const weekDays$6 = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
  const months$6 = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
  const years$6 = "Yıllar";
  const year$6 = "Yıl";
  const month$6 = "Ay";
  const week$6 = "Hafta";
  const days$4 = "Günler";
  const day$6 = "Gün";
  const today$6 = "Bugün";
  const noEvent$6 = "Etkinlik Yok";
  const allDay$6 = "Tüm gün";
  const deleteEvent$6 = "Sil";
  const createEvent$6 = "Etkinlik ekle";
  const dateFormat$6 = "dddd D MMMM YYYY";
  const tr = {
    weekDays: weekDays$6,
    months: months$6,
    years: years$6,
    year: year$6,
    month: month$6,
    week: week$6,
    days: days$4,
    day: day$6,
    today: today$6,
    noEvent: noEvent$6,
    allDay: allDay$6,
    deleteEvent: deleteEvent$6,
    createEvent: createEvent$6,
    dateFormat: dateFormat$6
  };
  const tr$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    allDay: allDay$6,
    createEvent: createEvent$6,
    dateFormat: dateFormat$6,
    day: day$6,
    days: days$4,
    default: tr,
    deleteEvent: deleteEvent$6,
    month: month$6,
    months: months$6,
    noEvent: noEvent$6,
    today: today$6,
    week: week$6,
    weekDays: weekDays$6,
    year: year$6,
    years: years$6
  }, Symbol.toStringTag, { value: "Module" }));
  const weekDays$5 = ["Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця", "Субота", "Неділя"];
  const weekDaysShort$3 = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];
  const months$5 = ["Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень", "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень"];
  const years$5 = "Роки";
  const year$5 = "Рік";
  const month$5 = "Місяць";
  const week$5 = "Тиждень";
  const days$3 = "Дні";
  const day$5 = "День";
  const today$5 = "Сьогодні";
  const noEvent$5 = "Немає подій";
  const allDay$5 = "Весь день";
  const deleteEvent$5 = "Видалити";
  const createEvent$5 = "Створити подію";
  const dateFormat$5 = "dddd D MMMM YYYY";
  const uk = {
    weekDays: weekDays$5,
    weekDaysShort: weekDaysShort$3,
    months: months$5,
    years: years$5,
    year: year$5,
    month: month$5,
    week: week$5,
    days: days$3,
    day: day$5,
    today: today$5,
    noEvent: noEvent$5,
    allDay: allDay$5,
    deleteEvent: deleteEvent$5,
    createEvent: createEvent$5,
    dateFormat: dateFormat$5
  };
  const uk$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    allDay: allDay$5,
    createEvent: createEvent$5,
    dateFormat: dateFormat$5,
    day: day$5,
    days: days$3,
    default: uk,
    deleteEvent: deleteEvent$5,
    month: month$5,
    months: months$5,
    noEvent: noEvent$5,
    today: today$5,
    week: week$5,
    weekDays: weekDays$5,
    weekDaysShort: weekDaysShort$3,
    year: year$5,
    years: years$5
  }, Symbol.toStringTag, { value: "Module" }));
  const weekDays$4 = ["Душанба", "Сешанба", "Чоршанба", "Пайшанба", "Жума", "Шанба", "Якшанба"];
  const months$4 = ["Январ", "Феврал", "Март", "Апрел", "Май", "Июн", "Июл", "Август", "Сентябр", "Октябр", "Ноябр", "Декабр"];
  const years$4 = "Йиллар";
  const year$4 = "Йил";
  const month$4 = "Ой";
  const week$4 = "Ҳафта";
  const day$4 = "Кун";
  const today$4 = "Бугун";
  const noEvent$4 = "Ҳеч қандай тадбир йўқ";
  const allDay$4 = "Кун бўйи";
  const deleteEvent$4 = "Ўчириш";
  const createEvent$4 = "Тадбир яратиш";
  const dateFormat$4 = "dddd D MMMM YYYY";
  const uzCryl = {
    weekDays: weekDays$4,
    months: months$4,
    years: years$4,
    year: year$4,
    month: month$4,
    week: week$4,
    day: day$4,
    today: today$4,
    noEvent: noEvent$4,
    allDay: allDay$4,
    deleteEvent: deleteEvent$4,
    createEvent: createEvent$4,
    dateFormat: dateFormat$4
  };
  const uzCryl$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    allDay: allDay$4,
    createEvent: createEvent$4,
    dateFormat: dateFormat$4,
    day: day$4,
    default: uzCryl,
    deleteEvent: deleteEvent$4,
    month: month$4,
    months: months$4,
    noEvent: noEvent$4,
    today: today$4,
    week: week$4,
    weekDays: weekDays$4,
    year: year$4,
    years: years$4
  }, Symbol.toStringTag, { value: "Module" }));
  const weekDays$3 = ["Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba", "Yakshanba"];
  const months$3 = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr"];
  const years$3 = "Yillar";
  const year$3 = "Yil";
  const month$3 = "Oy";
  const week$3 = "Hafta";
  const day$3 = "Kun";
  const today$3 = "Bugun";
  const noEvent$3 = "Tadbir yo‘q";
  const allDay$3 = "Butun kun";
  const deleteEvent$3 = "O‘chirish";
  const createEvent$3 = "Tadbir yaratish";
  const dateFormat$3 = "dddd D MMMM YYYY";
  const uz = {
    weekDays: weekDays$3,
    months: months$3,
    years: years$3,
    year: year$3,
    month: month$3,
    week: week$3,
    day: day$3,
    today: today$3,
    noEvent: noEvent$3,
    allDay: allDay$3,
    deleteEvent: deleteEvent$3,
    createEvent: createEvent$3,
    dateFormat: dateFormat$3
  };
  const uz$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    allDay: allDay$3,
    createEvent: createEvent$3,
    dateFormat: dateFormat$3,
    day: day$3,
    default: uz,
    deleteEvent: deleteEvent$3,
    month: month$3,
    months: months$3,
    noEvent: noEvent$3,
    today: today$3,
    week: week$3,
    weekDays: weekDays$3,
    year: year$3,
    years: years$3
  }, Symbol.toStringTag, { value: "Module" }));
  const weekDays$2 = ["Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy", "Chủ nhật"];
  const weekDaysShort$2 = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  const months$2 = ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];
  const years$2 = "Năm";
  const year$2 = "Năm nay";
  const month$2 = "Tháng";
  const week$2 = "Tuần";
  const days$2 = "Vài ngày";
  const day$2 = "Ngày";
  const today$2 = "Hôm nay";
  const noEvent$2 = "NKhông có Event";
  const allDay$2 = "Cả ngày";
  const deleteEvent$2 = "Xóa";
  const createEvent$2 = "Tạo event";
  const dateFormat$2 = "dddd MMMM D YYYY";
  const vi = {
    weekDays: weekDays$2,
    weekDaysShort: weekDaysShort$2,
    months: months$2,
    years: years$2,
    year: year$2,
    month: month$2,
    week: week$2,
    days: days$2,
    day: day$2,
    today: today$2,
    noEvent: noEvent$2,
    allDay: allDay$2,
    deleteEvent: deleteEvent$2,
    createEvent: createEvent$2,
    dateFormat: dateFormat$2
  };
  const vi$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    allDay: allDay$2,
    createEvent: createEvent$2,
    dateFormat: dateFormat$2,
    day: day$2,
    days: days$2,
    default: vi,
    deleteEvent: deleteEvent$2,
    month: month$2,
    months: months$2,
    noEvent: noEvent$2,
    today: today$2,
    week: week$2,
    weekDays: weekDays$2,
    weekDaysShort: weekDaysShort$2,
    year: year$2,
    years: years$2
  }, Symbol.toStringTag, { value: "Module" }));
  const weekDays$1 = ["星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"];
  const weekDaysShort$1 = ["一", "二", "三", "四", "五", "六", "日"];
  const months$1 = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];
  const years$1 = "年";
  const year$1 = "本年";
  const month$1 = "月";
  const week$1 = "周";
  const days$1 = "多日";
  const day$1 = "日";
  const today$1 = "今日";
  const noEvent$1 = "暂无活动";
  const allDay$1 = "整天";
  const deleteEvent$1 = "删除";
  const createEvent$1 = "新建活动";
  const dateFormat$1 = "YYYY MMMM D dddd";
  const zhCn = {
    weekDays: weekDays$1,
    weekDaysShort: weekDaysShort$1,
    months: months$1,
    years: years$1,
    year: year$1,
    month: month$1,
    week: week$1,
    days: days$1,
    day: day$1,
    today: today$1,
    noEvent: noEvent$1,
    allDay: allDay$1,
    deleteEvent: deleteEvent$1,
    createEvent: createEvent$1,
    dateFormat: dateFormat$1
  };
  const zhCn$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    allDay: allDay$1,
    createEvent: createEvent$1,
    dateFormat: dateFormat$1,
    day: day$1,
    days: days$1,
    default: zhCn,
    deleteEvent: deleteEvent$1,
    month: month$1,
    months: months$1,
    noEvent: noEvent$1,
    today: today$1,
    week: week$1,
    weekDays: weekDays$1,
    weekDaysShort: weekDaysShort$1,
    year: year$1,
    years: years$1
  }, Symbol.toStringTag, { value: "Module" }));
  const weekDays = ["星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"];
  const weekDaysShort = ["一", "二", "三", "四", "五", "六", "日"];
  const months = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];
  const years = "年";
  const year = "本年";
  const month = "月";
  const week = "周";
  const days = "多日";
  const day = "日";
  const today = "今日";
  const noEvent = "暫無活動";
  const allDay = "整天";
  const deleteEvent = "刪除";
  const createEvent = "新建活動";
  const dateFormat = "YYYY MMMM D dddd";
  const zhHk = {
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
  const zhHk$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    allDay,
    createEvent,
    dateFormat,
    day,
    days,
    default: zhHk,
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
  }, Symbol.toStringTag, { value: "Module" }));
  exports2.VueCal = _sfc_main;
  exports2.addDatePrototypes = addDatePrototypes;
  exports2.addDays = addDays;
  exports2.addHours = addHours;
  exports2.addMinutes = addMinutes;
  exports2.countDays = countDays;
  exports2.dateToMinutes = dateToMinutes;
  exports2.datesInSameTimeStep = datesInSameTimeStep;
  exports2.formatDate = formatDate;
  exports2.formatDateLite = formatDateLite;
  exports2.formatMinutes = formatMinutes;
  exports2.formatTime = formatTime;
  exports2.formatTimeLite = formatTimeLite;
  exports2.getPreviousFirstDayOfWeek = getPreviousFirstDayOfWeek;
  exports2.getWeek = getWeek;
  exports2.isInRange = isInRange;
  exports2.isLeapYear = isLeapYear;
  exports2.isSameDate = isSameDate;
  exports2.isToday = isToday;
  exports2.isValidDate = isValidDate;
  exports2.removeDatePrototypes = removeDatePrototypes;
  exports2.stringToDate = stringToDate;
  exports2.subtractDays = subtractDays;
  exports2.subtractHours = subtractHours;
  exports2.subtractMinutes = subtractMinutes;
  exports2.updateTexts = updateTexts;
  exports2.useLocale = useLocale;
  Object.defineProperty(exports2, Symbol.toStringTag, { value: "Module" });
}));
