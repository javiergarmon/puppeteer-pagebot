'use strict'

const Promise = require('bluebird')
const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

const randomBetween = (min, max) => Math.floor(Math.random() * max) + min
const randomFloatBetween = (min, max, divisor = 100) => randomBetween(min * divisor, max * divisor) / divisor

const getCoordinatesToClick = rect => {
  const { x, y, width, height } = rect
  let pointX = x + width * randomFloatBetween(0.2, 0.8)
  let pointY = y + height * randomFloatBetween(0.2, 0.8)
  return { x: pointX, y: pointY }
}

class PageBot {
  constructor() {
    this.browser = null
    this.page = null
  }

  async start(url, options = {}) {
    if (this.browser) throw new Error('Bot started already')

    const browserOptions = options.browser || PageBot.DEFAULT_BROWSER_CONFIG
    const pageOptions = options.page || PageBot.DEFAULT_PAGE_CONFIG
    this.browser = await puppeteer.launch(browserOptions)
    this.page = await this.browser.newPage(browserOptions)
    await this.page.goto(url, pageOptions)
  }

  async close() {
    await this.browser.close()
  }

  async click(selector, options = {}) {
    const pressTime = options.pressTime || PageBot.DEFAULT_CLICK_CONFIG.pressTime
    const delay = options.delay || PageBot.DEFAULT_CLICK_CONFIG.delay
    const item = await this.page.$(selector)
    const rect = await this.page.evaluate(item => JSON.parse(JSON.stringify(item.getBoundingClientRect())), item)
    const point = getCoordinatesToClick(rect)

    await Promise.delay(typeof delay === 'function' ? delay() : delay)
    await this.page.mouse.click(point.x, point.y, { delay: typeof pressTime === 'function' ? pressTime() : pressTime })
  }

  async type(text, options = {}) {
    const pressTime = options.pressTime || PageBot.DEFAULT_TYPE_CONFIG.pressTime
    const delay = options.delay || PageBot.DEFAULT_TYPE_CONFIG.delay

    await Promise.delay(typeof delay === 'function' ? delay() : delay)

    for (var i of text) {
      await this.page.keyboard.press(i, { delay: typeof pressTime === 'function' ? pressTime() : pressTime })
      await Promise.delay(typeof delay === 'function' ? delay() : delay)
    }
  }

  getItem(selector) {
    return this.page.$(selector)
  }

  async waitItem(selector, options = {}) {
    const interval = options.interval || PageBot.DEFAULT_WAITITEM_CONFIG.interval
    const timeout = options.timeout || PageBot.DEFAULT_WAITITEM_CONFIG.timeout
    const start = Date.now()

    while (start + timeout >= Date.now()) {
      const item = await this.getItem(selector)
      if (item) return item
      await Promise.delay(typeof interval === 'function' ? interval() : interval)
    }

    throw new Error('Timeout')
  }

  static get DEFAULT_BROWSER_CONFIG() {
    return { headless: false }
  }

  static get DEFAULT_PAGE_CONFIG() {
    return { waitUntil: 'networkidle2' }
  }

  static get DEFAULT_TYPE_CONFIG() {
    return { delay: () => randomBetween(40, 160), pressTime: () => randomFloatBetween(30, 90) }
  }

  static get DEFAULT_CLICK_CONFIG() {
    return { delay: () => randomBetween(40, 160), pressTime: () => randomFloatBetween(30, 90) }
  }

  static get DEFAULT_WAITITEM_CONFIG() {
    return { interval: 100, timeout: 15 * 1000 }
  }
}

module.exports = PageBot
