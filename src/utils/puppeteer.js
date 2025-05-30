const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;
const logger = require('./logger');

/**
 * PuppeteerService - A utility class for Puppeteer operations
 * Provides common functionality for browser automation tasks
 */
class PuppeteerService {
  constructor() {
    this.screenshotsDir = path.join(__dirname, '../../public/screenshots');
    this.ensureDirectoryExists();
  }

  /**
   * Ensure the screenshots directory exists
   */
  async ensureDirectoryExists() {
    try {
      await fs.mkdir(this.screenshotsDir, { recursive: true });
      logger.info(`Screenshots directory ensured at ${this.screenshotsDir}`);
    } catch (error) {
      logger.error('Error creating screenshots directory:', error);
    }
  }

  /**
   * Launch a Puppeteer browser instance
   * @param {Object} options - Additional launch options
   * @returns {Promise<Browser>} - Puppeteer browser instance
   */
  async launchBrowser(options = {}) {
    const defaultOptions = {
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1280, height: 800 }
    };

    const mergedOptions = { ...defaultOptions, ...options };
    
    try {
      logger.info('Launching Puppeteer browser');
      return await puppeteer.launch(mergedOptions);
    } catch (error) {
      logger.error('Error launching browser:', error);
      throw error;
    }
  }

  /**
   * Take a screenshot of the current page
   * @param {Page} page - Puppeteer page object
   * @param {string} name - Base name for the screenshot file
   * @param {Object} options - Screenshot options
   * @returns {Promise<string>} - Path to the screenshot relative to public directory
   */
  async takeScreenshot(page, name, options = {}) {
    const timestamp = Date.now();
    const filename = `${timestamp}-${name}.png`;
    const filepath = path.join(this.screenshotsDir, filename);
    
    const defaultOptions = { fullPage: true };
    const mergedOptions = { ...defaultOptions, ...options, path: filepath };
    
    try {
      logger.info(`Taking screenshot: ${filename}`);
      await page.screenshot(mergedOptions);
      return `/screenshots/${filename}`;
    } catch (error) {
      logger.error(`Error taking screenshot ${name}:`, error);
      throw error;
    }
  }

  /**
   * Capture console errors from the page
   * @param {Page} page - Puppeteer page object
   * @returns {Array<string>} - Array to store console errors
   */
  captureConsoleErrors(page) {
    const errors = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const errorText = msg.text();
        errors.push(errorText);
        logger.error(`Console error: ${errorText}`);
      }
    });
    
    return errors;
  }

  /**
   * Wait for navigation to complete and handle timeouts
   * @param {Page} page - Puppeteer page object
   * @param {Object} options - Navigation options
   * @returns {Promise<Response|null>} - Navigation response
   */
  async safeNavigation(page, options = {}) {
    const defaultOptions = { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    };
    const mergedOptions = { ...defaultOptions, ...options };
    
    try {
      return await page.waitForNavigation(mergedOptions);
    } catch (error) {
      logger.warn(`Navigation timeout or error: ${error.message}`);
      return null;
    }
  }

  /**
   * Safely click an element and wait for navigation
   * @param {Page} page - Puppeteer page object
   * @param {string} selector - Element selector to click
   * @param {Object} options - Navigation options
   * @returns {Promise<boolean>} - Whether the click was successful
   */
  async safeClick(page, selector, options = {}) {
    try {
      // Wait for the selector to be available
      await page.waitForSelector(selector, { timeout: 5000 });
      
      // Click the element
      await Promise.all([
        page.click(selector),
        this.safeNavigation(page, options)
      ]);
      
      logger.info(`Successfully clicked: ${selector}`);
      return true;
    } catch (error) {
      logger.error(`Error clicking ${selector}:`, error);
      return false;
    }
  }

  /**
   * Safely fill a form field
   * @param {Page} page - Puppeteer page object
   * @param {string} selector - Element selector to fill
   * @param {string} value - Value to fill in the field
   * @returns {Promise<boolean>} - Whether the fill was successful
   */
  async safeFill(page, selector, value) {
    try {
      // Wait for the selector to be available
      await page.waitForSelector(selector, { timeout: 5000 });
      
      // Clear the field first
      await page.evaluate(sel => {
        document.querySelector(sel).value = '';
      }, selector);
      
      // Fill the field
      await page.type(selector, value);
      
      logger.info(`Successfully filled ${selector} with value`);
      return true;
    } catch (error) {
      logger.error(`Error filling ${selector}:`, error);
      return false;
    }
  }
}

module.exports = new PuppeteerService();
