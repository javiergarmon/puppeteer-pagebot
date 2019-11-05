'use strict'

const Promise = require('bluebird')
const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

const randomBetween = (min, max) => Math.floor(Math.random() * max) + min
const randomFloatBetween = (min, max, divisor = 100) => randomBetween(min * divisor, max * divisor) / divisor

const getCoordinatesToClick = rect => {
  const { x, y, width, height } = rect
  const pointX = x + width * randomFloatBetween(0.2, 0.8)
  const pointY = y + height * randomFloatBetween(0.2, 0.8)
  return { x: pointX, y: pointY }
}

class PageBot {
  constructor() {
    this.browser = null
    this.page = null
    this.userSpeed = null
  }

  async start(url, options = {}) {
    if (this.browser) throw new Error('Bot started already')

    const browserOptions = options.browser || PageBot.DEFAULT_BROWSER_CONFIG
    const pageOptions = options.page || PageBot.DEFAULT_PAGE_CONFIG
    this.browser = await puppeteer.launch(browserOptions)
    this.page = await this.browser.newPage(browserOptions)
    this.userSpeed = PageBot.DEFAULT_SPEED[options.userSpeed] ? options.userSpeed : 'slow'
    await this.page.goto(url, pageOptions)
  }

  async close() {
    await this.browser.close()
  }

  async getItemText(selector) {
    return this.page.evaluate(`Array.from(document.querySelector('${selector}'), element => element.textContent)`)
  }

  async getItemsText(selector) {
    return this.page.evaluate(`Array.from(document.querySelectorAll('${selector}'), element => element.textContent)`)
  }

  async click(selector, options = {}) {
    const pressTime = options.pressTime || PageBot.getClickConfig(this.userSpeed).pressTime
    const delay = options.delay || PageBot.getClickConfig(this.userSpeed).delay
    const item = await this.page.$(selector)
    const rect = await this.page.evaluate(item => JSON.parse(JSON.stringify(item.getBoundingClientRect())), item)
    const point = getCoordinatesToClick(rect)

    await Promise.delay(typeof delay === 'function' ? delay() : delay)
    await this.page.mouse.click(point.x, point.y, { delay: typeof pressTime === 'function' ? pressTime() : pressTime })
  }

  async type(text, options = {}) {
    const pressTime = options.pressTime || PageBot.getTypeConfig(this.userSpeed).pressTime
    const delay = options.delay || PageBot.getTypeConfig(this.userSpeed).delay

    await Promise.delay(typeof delay === 'function' ? delay() : delay)

    for (var i of text) {
      await this.page.keyboard.press(i, { delay: typeof pressTime === 'function' ? pressTime() : pressTime })
      await Promise.delay(typeof delay === 'function' ? delay() : delay)
    }
  }

  getItem(selector) {
    return this.page.$(selector)
  }

  async waitForItem(selector, options = {}) {
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

  async waitForNavigation(options = {}) {
    const timeout = options.timeout || 0
    const waitUntil = options.waitForNavigation || 'networkidle2'

    await this.page.waitForNavigation({ timeout, waitUntil })
  }

  static get DEFAULT_BROWSER_CONFIG() {
    return { headless: false }
  }

  static get DEFAULT_PAGE_CONFIG() {
    return { waitUntil: 'networkidle2' }
  }

  static get DEFAULT_SPEED() {
    return {
      fast: {
        delay: [10, 40],
        pressTime: [10, 30]
      },
      slow: {
        delay: [40, 160],
        pressTime: [30, 90]
      }
    }
  }

  static getTypeConfig(type) {
    type = PageBot.DEFAULT_SPEED[type] ? type : 'slow'

    return {
      delay: randomBetween.apply(null, PageBot.DEFAULT_SPEED[type].delay),
      pressTime: randomFloatBetween.apply(null, PageBot.DEFAULT_SPEED[type].pressTime)
    }
  }

  static getClickConfig(type) {
    type = PageBot.DEFAULT_SPEED[type] ? type : 'slow'

    return {
      delay: randomBetween.apply(null, PageBot.DEFAULT_SPEED[type].delay),
      pressTime: randomFloatBetween.apply(null, PageBot.DEFAULT_SPEED[type].pressTime)
    }
  }

  static get DEFAULT_WAITITEM_CONFIG() {
    return { interval: 100, timeout: 15 * 1000 }
  }
}

module.exports = PageBot
