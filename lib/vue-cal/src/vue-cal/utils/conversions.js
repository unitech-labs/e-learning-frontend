/**
 * Converts minutes in the day to a percentage position.
 *
 * @param {number} minutes time in minutes
 */
export function minutesToPercentage(minutes, config) {
  const dayRangeMinutes = config.timeTo - config.timeFrom
  return (minutes - config.timeFrom) * 100 / dayRangeMinutes
}

/**
 * Converts percentage position to minutes in the day.
 *
 * @param {number} percentage time in percentage
 */
export function percentageToMinutes(percentage, config) {
  const dayRangeMinutes = config.timeTo - config.timeFrom
  return ~~((percentage * dayRangeMinutes / 100) + config.timeFrom)
}

/**
 * Converts a pixel value to a percentage of the height of a container element.
 *
 * @param {number} y - The pixel value to be converted.
 * @param {HTMLElement} containerEl - The container element whose height is used for the conversion.
 * @returns {number} The percentage value corresponding to the pixel value.
 */
export function pxToPercentage(y, containerEl) {
  const containerElHeight = containerEl.clientHeight
  return (y * 100 / containerElHeight)
}
