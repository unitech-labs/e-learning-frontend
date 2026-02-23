#!/usr/bin/env node
/**
 * Check missing i18n keys in en and it compared to vi (source of truth)
 * Usage: node scripts/check-i18n-keys.mjs
 */

import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const LOCALES_DIR = join(__dirname, '../i18n/locales')

/**
 * Load and merge all JSON files from a locale folder
 */
function loadLocaleFromFolder(locale) {
  const folder = join(LOCALES_DIR, locale)
  const files = readdirSync(folder).filter((f) => f.endsWith('.json'))
  const merged = {}
  for (const file of files) {
    const content = JSON.parse(readFileSync(join(folder, file), 'utf8'))
    Object.assign(merged, content)
  }
  return merged
}

/**
 * Get all leaf key paths (e.g. "global.loading.message")
 */
function getLeafKeyPaths(obj, prefix = '') {
  const paths = []
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      paths.push(...getLeafKeyPaths(value, path))
    } else {
      paths.push(path)
    }
  }
  return paths
}

/**
 * Check if a key path exists in object (supports dot notation)
 */
function hasKey(obj, keyPath) {
  const parts = keyPath.split('.')
  let current = obj
  for (const part of parts) {
    if (current == null || typeof current !== 'object' || !(part in current)) {
      return false
    }
    current = current[part]
  }
  return true
}

function main() {
  console.log('Loading locales (vi = source of truth)...\n')

  const vi = loadLocaleFromFolder('vi')
  const en = loadLocaleFromFolder('en')
  const it = loadLocaleFromFolder('it')

  const viKeys = getLeafKeyPaths(vi)
  const missingEn = viKeys.filter((key) => !hasKey(en, key))
  const missingIt = viKeys.filter((key) => !hasKey(it, key))

  // Report
  if (missingEn.length === 0 && missingIt.length === 0) {
    console.log('✓ All keys are present in en and it. No missing translations.')
    return
  }

  if (missingEn.length > 0) {
    console.log(`❌ Missing in EN (${missingEn.length} keys):`)
    missingEn.sort().forEach((key) => console.log(`   - ${key}`))
    console.log()
  }

  if (missingIt.length > 0) {
    console.log(`❌ Missing in IT (${missingIt.length} keys):`)
    missingIt.sort().forEach((key) => console.log(`   - ${key}`))
    console.log()
  }

  // Summary
  console.log('--- Summary ---')
  console.log(`Total keys in vi: ${viKeys.length}`)
  console.log(`Missing in en: ${missingEn.length}`)
  console.log(`Missing in it: ${missingIt.length}`)

  process.exit(missingEn.length > 0 || missingIt.length > 0 ? 1 : 0)
}

main()
