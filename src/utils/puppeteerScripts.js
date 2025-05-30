const puppeteerService = require('./puppeteer');
const logger = require('./logger');
const db = require('./localDb');

/**
 * PuppeteerScripts - Registry of Puppeteer scripts for common telecom issues
 * Each script handles a specific type of support issue
 */
class PuppeteerScripts {
  constructor() {
    // Map intent types to handler functions
    this.scripts = {
      screen_share_issue: this.handleScreenShareIssue.bind(this),
      chat_history_missing: this.handleChatHistoryIssue.bind(this),
      template_issue: this.handleTemplateIssue.bind(this),
      vpn_connection: this.handleVpnConnectionIssue.bind(this),
      notion_basics: this.handleNotionBasics.bind(this)
    };
  }

  /**
   * Run a Puppeteer script based on the intent
   * @param {string} intent - The classified intent
   * @param {string} ticketId - The ID of the support ticket
   * @returns {Promise<Object>} - Result of the script execution
   */
  async runScript(intent, ticketId) {
    try {
      // Check if we have a script for this intent
      if (!this.scripts[intent]) {
        logger.warn(`No script available for intent: ${intent}`);
        return { 
          success: false, 
          error: 'No script available for this intent',
          intent
        };
      }

      // Create a run record in the database
      const runId = await this.createRunRecord(ticketId, intent);

      // Run the script
      logger.info(`Running Puppeteer script for intent: ${intent}, ticket: ${ticketId}, run: ${runId}`);
      const result = await this.scripts[intent](runId, ticketId);

      // Update the run record with the results
      await this.updateRunRecord(runId, result);

      return {
        ...result,
        runId,
        intent
      };
    } catch (error) {
      logger.error(`Error running Puppeteer script for intent ${intent}:`, error);
      return { 
        success: false, 
        error: error.message,
        intent
      };
    }
  }

  /**
   * Create a record for this script run
   * @param {string} ticketId - The ID of the support ticket
   * @param {string} intent - The classified intent
   * @returns {Promise<string>} - The ID of the created run record
   */
  async createRunRecord(ticketId, intent) {
    try {
      const runData = {
        ticket_id: ticketId,
        intent,
        script_name: intent,
        status: 'pending',
        created_at: new Date().toISOString()
      };

      // Insert into database
      const runId = await db.insert('puppeteer_runs', runData);
      logger.info(`Created Puppeteer run record: ${runId}`);
      return runId;
    } catch (error) {
      logger.error('Error creating run record:', error);
      throw error;
    }
  }

  /**
   * Update the run record with results
   * @param {string} runId - The ID of the run record
   * @param {Object} result - The result of the script execution
   * @returns {Promise<void>}
   */
  async updateRunRecord(runId, result) {
    try {
      const updateData = {
        status: result.success ? 'success' : 'error',
        output_urls: result.screenshotUrls || [],
        primary_output_url: result.screenshotUrl || null,
        error_msg: result.error || null,
        console_logs: result.consoleErrors || [],
        completed_at: new Date().toISOString()
      };

      // Update in database
      await db.update('puppeteer_runs', runId, updateData);
      logger.info(`Updated Puppeteer run record: ${runId}`);
    } catch (error) {
      logger.error(`Error updating run record ${runId}:`, error);
    }
  }

  /**
   * Handle screen share issues in video conferencing apps
   * @param {string} runId - The ID of the run record
   * @param {string} ticketId - The ID of the support ticket
   * @returns {Promise<Object>} - Result of the script execution
   */
  async handleScreenShareIssue(runId, ticketId) {
    const browser = await puppeteerService.launchBrowser();
    try {
      const page = await browser.newPage();
      const screenshotUrls = [];
      
      // Navigate to Zoom web client
      logger.info('Navigating to Zoom web client');
      await page.goto('https://zoom.us/wc/join', { waitUntil: 'networkidle2' });
      
      // Take screenshot of the initial state
      const initialScreenshot = await puppeteerService.takeScreenshot(page, `zoom-initial-${runId}`);
      screenshotUrls.push(initialScreenshot);
      
      // Simulate joining a test meeting
      logger.info('Simulating joining a test meeting');
      await puppeteerService.safeFill(page, 'input#join-confno', '1234567890');
      await puppeteerService.safeFill(page, 'input#join-username', 'Support Agent');
      
      // Take screenshot of the filled form
      const formScreenshot = await puppeteerService.takeScreenshot(page, `zoom-form-${runId}`);
      screenshotUrls.push(formScreenshot);
      
      // Note: In a real implementation, we would click join and navigate through the meeting UI
      // For this demo, we'll simulate the settings page
      
      logger.info('Simulating navigation to settings');
      await page.evaluate(() => {
        // Create a mock settings UI for demonstration
        document.body.innerHTML = `
          <div class="zoom-settings">
            <h2>Zoom Settings</h2>
            <div class="settings-section">
              <h3>Screen Sharing</h3>
              <div class="toggle-container">
                <label class="toggle-label">Enable screen sharing</label>
                <button class="toggle-button">Enable</button>
              </div>
              <div class="toggle-container">
                <label class="toggle-label">Share computer sound</label>
                <button class="toggle-button">Enable</button>
              </div>
              <div class="toggle-container">
                <label class="toggle-label">Optimize for video clip</label>
                <button class="toggle-button">Disable</button>
              </div>
            </div>
          </div>
        `;
      });
      
      // Take screenshot of the settings page
      const settingsScreenshot = await puppeteerService.takeScreenshot(page, `zoom-settings-${runId}`);
      screenshotUrls.push(settingsScreenshot);
      
      // Simulate toggling the screen share setting
      logger.info('Simulating toggling screen share settings');
      await page.evaluate(() => {
        const buttons = document.querySelectorAll('.toggle-button');
        buttons.forEach(button => {
          if (button.textContent === 'Enable') {
            button.textContent = 'Disable';
            button.style.backgroundColor = '#f44336';
          } else {
            button.textContent = 'Enable';
            button.style.backgroundColor = '#4CAF50';
          }
        });
      });
      
      // Take screenshot after changes
      const afterScreenshot = await puppeteerService.takeScreenshot(page, `zoom-after-${runId}`);
      screenshotUrls.push(afterScreenshot);
      
      return {
        success: true,
        screenshotUrls,
        screenshotUrl: afterScreenshot, // Primary screenshot for display
        message: 'Successfully demonstrated screen sharing settings in Zoom'
      };
    } catch (error) {
      logger.error('Error in screen share script:', error);
      return { 
        success: false, 
        error: error.message,
        screenshotUrls: [] 
      };
    } finally {
      await browser.close();
    }
  }

  /**
   * Handle chat history issues in CRM systems
   * @param {string} runId - The ID of the run record
   * @param {string} ticketId - The ID of the support ticket
   * @returns {Promise<Object>} - Result of the script execution
   */
  async handleChatHistoryIssue(runId, ticketId) {
    const browser = await puppeteerService.launchBrowser();
    try {
      const page = await browser.newPage();
      const screenshotUrls = [];
      
      // Navigate to a mock CRM dashboard
      logger.info('Navigating to mock CRM dashboard');
      await page.goto('about:blank');
      
      // Create a mock CRM interface
      await page.evaluate(() => {
        document.body.innerHTML = `
          <div class="crm-dashboard">
            <header>
              <h1>CRM Dashboard</h1>
              <nav>
                <ul>
                  <li><a href="#" class="active">Dashboard</a></li>
                  <li><a href="#">Contacts</a></li>
                  <li><a href="#">Chat History</a></li>
                  <li><a href="#">Reports</a></li>
                </ul>
              </nav>
            </header>
            <main>
              <div class="dashboard-content">
                <h2>Welcome to the CRM Dashboard</h2>
                <p>Select a module from the navigation menu to get started.</p>
              </div>
            </main>
          </div>
        `;
        
        // Add some basic styling
        const style = document.createElement('style');
        style.textContent = `
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
          .crm-dashboard { max-width: 1200px; margin: 0 auto; }
          header { background-color: #2c3e50; color: white; padding: 1rem; }
          nav ul { display: flex; list-style: none; padding: 0; }
          nav li { margin-right: 1rem; }
          nav a { color: white; text-decoration: none; }
          nav a.active { font-weight: bold; border-bottom: 2px solid white; }
          main { padding: 1rem; }
        `;
        document.head.appendChild(style);
      });
      
      // Take screenshot of the dashboard
      const dashboardScreenshot = await puppeteerService.takeScreenshot(page, `crm-dashboard-${runId}`);
      screenshotUrls.push(dashboardScreenshot);
      
      // Simulate clicking on Chat History
      logger.info('Simulating navigation to Chat History');
      await page.evaluate(() => {
        // Update the active tab
        document.querySelectorAll('nav a').forEach(a => a.classList.remove('active'));
        document.querySelectorAll('nav a')[2].classList.add('active');
        
        // Update the content
        document.querySelector('.dashboard-content').innerHTML = `
          <h2>Chat History</h2>
          <div class="filters">
            <label>Date Range: <input type="text" value="Last 30 days" /></label>
            <label>Agent: <select><option>All Agents</option></select></label>
            <button>Apply Filters</button>
          </div>
          <div class="error-message" style="color: red; padding: 1rem; border: 1px solid red; margin: 1rem 0;">
            <h3>Error Loading Chat History</h3>
            <p>We couldn't load your chat history. This could be due to:</p>
            <ul>
              <li>Temporary server issues</li>
              <li>Missing permissions</li>
              <li>Data retention policy (chats older than 90 days)</li>
            </ul>
          </div>
          <div class="actions">
            <button>Refresh</button>
            <button>Export Logs</button>
            <button>Contact Support</button>
          </div>
        `;
      });
      
      // Take screenshot of the chat history page with error
      const errorScreenshot = await puppeteerService.takeScreenshot(page, `crm-chat-error-${runId}`);
      screenshotUrls.push(errorScreenshot);
      
      // Simulate fixing the issue
      logger.info('Simulating fixing the chat history issue');
      await page.evaluate(() => {
        // Remove the error message
        document.querySelector('.error-message').remove();
        
        // Add chat history table
        const chatHistory = document.createElement('div');
        chatHistory.className = 'chat-history';
        chatHistory.innerHTML = `
          <table style="width: 100%; border-collapse: collapse; margin-top: 1rem;">
            <thead>
              <tr style="background-color: #f2f2f2;">
                <th style="padding: 0.5rem; text-align: left; border: 1px solid #ddd;">Date</th>
                <th style="padding: 0.5rem; text-align: left; border: 1px solid #ddd;">Customer</th>
                <th style="padding: 0.5rem; text-align: left; border: 1px solid #ddd;">Agent</th>
                <th style="padding: 0.5rem; text-align: left; border: 1px solid #ddd;">Duration</th>
                <th style="padding: 0.5rem; text-align: left; border: 1px solid #ddd;">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 0.5rem; border: 1px solid #ddd;">2025-05-12 14:30</td>
                <td style="padding: 0.5rem; border: 1px solid #ddd;">John Smith</td>
                <td style="padding: 0.5rem; border: 1px solid #ddd;">Agent 1</td>
                <td style="padding: 0.5rem; border: 1px solid #ddd;">12m 30s</td>
                <td style="padding: 0.5rem; border: 1px solid #ddd;"><a href="#">View</a> | <a href="#">Export</a></td>
              </tr>
              <tr>
                <td style="padding: 0.5rem; border: 1px solid #ddd;">2025-05-12 10:15</td>
                <td style="padding: 0.5rem; border: 1px solid #ddd;">Jane Doe</td>
                <td style="padding: 0.5rem; border: 1px solid #ddd;">Agent 2</td>
                <td style="padding: 0.5rem; border: 1px solid #ddd;">8m 45s</td>
                <td style="padding: 0.5rem; border: 1px solid #ddd;"><a href="#">View</a> | <a href="#">Export</a></td>
              </tr>
              <tr>
                <td style="padding: 0.5rem; border: 1px solid #ddd;">2025-05-11 16:20</td>
                <td style="padding: 0.5rem; border: 1px solid #ddd;">Robert Johnson</td>
                <td style="padding: 0.5rem; border: 1px solid #ddd;">Agent 1</td>
                <td style="padding: 0.5rem; border: 1px solid #ddd;">5m 10s</td>
                <td style="padding: 0.5rem; border: 1px solid #ddd;"><a href="#">View</a> | <a href="#">Export</a></td>
              </tr>
            </tbody>
          </table>
          <div style="margin-top: 1rem;">
            <p>Showing 3 of 42 conversations. <a href="#">Load more</a></p>
          </div>
        `;
        
        document.querySelector('.dashboard-content').appendChild(chatHistory);
      });
      
      // Take screenshot of the fixed chat history
      const fixedScreenshot = await puppeteerService.takeScreenshot(page, `crm-chat-fixed-${runId}`);
      screenshotUrls.push(fixedScreenshot);
      
      return {
        success: true,
        screenshotUrls,
        screenshotUrl: fixedScreenshot, // Primary screenshot for display
        message: 'Successfully demonstrated chat history troubleshooting in CRM'
      };
    } catch (error) {
      logger.error('Error in chat history script:', error);
      return { 
        success: false, 
        error: error.message,
        screenshotUrls: [] 
      };
    } finally {
      await browser.close();
    }
  }

  /**
   * Handle template issues in Notion
   * @param {string} runId - The ID of the run record
   * @param {string} ticketId - The ID of the support ticket
   * @returns {Promise<Object>} - Result of the script execution
   */
  async handleTemplateIssue(runId, ticketId) {
    const browser = await puppeteerService.launchBrowser();
    try {
      const page = await browser.newPage();
      const screenshotUrls = [];
      
      // Capture console errors
      const consoleErrors = puppeteerService.captureConsoleErrors(page);
      
      // Navigate to Notion login page
      logger.info('Navigating to Notion login page');
      await page.goto('https://www.notion.so/login', { waitUntil: 'networkidle2' });
      
      // Take screenshot of login page
      const loginScreenshot = await puppeteerService.takeScreenshot(page, `notion-login-${runId}`);
      screenshotUrls.push(loginScreenshot);
      
      // Note: In a real implementation, we would log in with test credentials
      // For this demo, we'll simulate the templates page
      
      logger.info('Simulating navigation to templates page');
      await page.evaluate(() => {
        document.body.innerHTML = `
          <div class="notion-app">
            <div class="sidebar">
              <div class="workspace-header">
                <h3>Workspace</h3>
              </div>
              <div class="sidebar-items">
                <div class="sidebar-item">Home</div>
                <div class="sidebar-item">Shared</div>
                <div class="sidebar-item">Templates</div>
                <div class="sidebar-item">Trash</div>
              </div>
            </div>
            <div class="main-content">
              <div class="templates-header">
                <h1>Templates</h1>
                <p>Browse and use templates to get started quickly.</p>
              </div>
              <div class="templates-grid">
                <div class="template-card">
                  <div class="template-image" style="background-color: #f2f2f2; height: 120px;"></div>
                  <div class="template-info">
                    <h3>Project Management</h3>
                    <p>Track projects, tasks, and deadlines</p>
                    <button class="duplicate-button">Duplicate</button>
                  </div>
                </div>
                <div class="template-card">
                  <div class="template-image" style="background-color: #f2f2f2; height: 120px;"></div>
                  <div class="template-info">
                    <h3>Meeting Notes</h3>
                    <p>Organize your meeting notes</p>
                    <button class="duplicate-button">Duplicate</button>
                  </div>
                </div>
                <div class="template-card">
                  <div class="template-image" style="background-color: #f2f2f2; height: 120px;"></div>
                  <div class="template-info">
                    <h3>Weekly Planner</h3>
                    <p>Plan your week effectively</p>
                    <button class="duplicate-button">Duplicate</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
        
        // Add some basic styling
        const style = document.createElement('style');
        style.textContent = `
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, sans-serif; margin: 0; padding: 0; }
          .notion-app { display: flex; height: 100vh; }
          .sidebar { width: 240px; background-color: #f7f6f3; padding: 1rem; }
          .main-content { flex: 1; padding: 2rem; }
          .templates-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1rem; margin-top: 2rem; }
          .template-card { border: 1px solid #e0e0e0; border-radius: 4px; overflow: hidden; }
          .template-info { padding: 1rem; }
          .duplicate-button { background-color: #2eaadc; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; }
        `;
        document.head.appendChild(style);
      });
      
      // Take screenshot of templates page
      const templatesScreenshot = await puppeteerService.takeScreenshot(page, `notion-templates-${runId}`);
      screenshotUrls.push(templatesScreenshot);
      
      // Simulate clicking duplicate button
      logger.info('Simulating clicking duplicate button');
      await page.evaluate(() => {
        // Show error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.cssText = 'background-color: #ffebee; color: #c62828; padding: 1rem; margin-top: 1rem; border-radius: 4px;';
        errorDiv.innerHTML = `
          <h3>Error Duplicating Template</h3>
          <p>We couldn't duplicate this template. This could be due to:</p>
          <ul>
            <li>Network connectivity issues</li>
            <li>Insufficient permissions</li>
            <li>Template is no longer available</li>
          </ul>
          <button style="background-color: #c62828; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;">Try Again</button>
        `;
        
        document.querySelector('.main-content').appendChild(errorDiv);
        
        // Add a logger error for demonstration
        logger.error('Failed to duplicate template: NetworkError');
      });
      
      // Take screenshot of error
      const errorScreenshot = await puppeteerService.takeScreenshot(page, `notion-error-${runId}`);
      screenshotUrls.push(errorScreenshot);
      
      // Simulate fixing the issue
      logger.info('Simulating fixing the template issue');
      await page.evaluate(() => {
        // Remove error message
        document.querySelector('.error-message').remove();
        
        // Show success message
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.style.cssText = 'background-color: #e8f5e9; color: #2e7d32; padding: 1rem; margin-top: 1rem; border-radius: 4px;';
        successDiv.innerHTML = `
          <h3>Template Duplicated Successfully</h3>
          <p>The template has been added to your workspace.</p>
          <button style="background-color: #2e7d32; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;">Open Template</button>
        `;
        
        document.querySelector('.main-content').appendChild(successDiv);
      });
      
      // Take screenshot of success
      const successScreenshot = await puppeteerService.takeScreenshot(page, `notion-success-${runId}`);
      screenshotUrls.push(successScreenshot);
      
      return {
        success: true,
        screenshotUrls,
        screenshotUrl: successScreenshot, // Primary screenshot for display
        consoleErrors,
        message: 'Successfully demonstrated template troubleshooting in Notion'
      };
    } catch (error) {
      logger.error('Error in template issue script:', error);
      return { 
        success: false, 
        error: error.message,
        screenshotUrls: [] 
      };
    } finally {
      await browser.close();
    }
  }

  /**
   * Handle VPN connection issues
   * @param {string} runId - The ID of the run record
   * @param {string} ticketId - The ID of the support ticket
   * @returns {Promise<Object>} - Result of the script execution
   */
  /**
   * Handle Notion basics - creating new pages, etc.
   * @param {string} runId - The ID of the run record
   * @param {string} ticketId - The ID of the support ticket
   * @returns {Promise<Object>} - Result of the script execution
   */
  async handleNotionBasics(runId, ticketId) {
    const browser = await puppeteerService.launchBrowser();
    try {
      const page = await browser.newPage();
      const screenshotUrls = [];
      
      // Navigate to Notion login page
      logger.info('Navigating to Notion login page');
      await page.goto('https://www.notion.so/login', { waitUntil: 'networkidle2' });
      
      // Take screenshot of login page
      const loginScreenshot = await puppeteerService.takeScreenshot(page, `notion-login-${runId}`);
      screenshotUrls.push(loginScreenshot);
      
      // Simulate logged in Notion workspace
      logger.info('Simulating Notion workspace');
      await page.evaluate(() => {
        document.body.innerHTML = `
          <div class="notion-app">
            <div class="sidebar">
              <div class="workspace-header">
                <h3>Workspace</h3>
              </div>
              <div class="sidebar-items">
                <div class="sidebar-item active">Home</div>
                <div class="sidebar-item">Shared</div>
                <div class="sidebar-item">Templates</div>
                <div class="sidebar-item">Trash</div>
              </div>
              <div class="sidebar-pages">
                <div class="sidebar-section">
                  <h4>PAGES</h4>
                  <button class="new-page-button">+ New Page</button>
                </div>
                <div class="page-list">
                  <div class="page-item">Meeting Notes</div>
                  <div class="page-item">Project Tracker</div>
                  <div class="page-item">Reading List</div>
                </div>
              </div>
            </div>
            <div class="main-content">
              <div class="content-header">
                <h1>Home</h1>
              </div>
              <div class="content-body">
                <p>Welcome to your Notion workspace!</p>
                <p>Click "+ New Page" in the sidebar to create a new page.</p>
              </div>
            </div>
          </div>
        `;
        
        // Add some basic styling
        const style = document.createElement('style');
        style.textContent = `
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, sans-serif; margin: 0; padding: 0; }
          .notion-app { display: flex; height: 100vh; }
          .sidebar { width: 240px; background-color: #f7f6f3; padding: 1rem; display: flex; flex-direction: column; }
          .main-content { flex: 1; padding: 2rem; }
          .sidebar-item { padding: 0.5rem; cursor: pointer; }
          .sidebar-item.active { font-weight: bold; }
          .sidebar-pages { margin-top: 2rem; }
          .new-page-button { background: none; border: none; color: #2eaadc; cursor: pointer; padding: 0.5rem 0; text-align: left; }
          .page-item { padding: 0.5rem; cursor: pointer; }
        `;
        document.head.appendChild(style);
      });
      
      // Take screenshot of the workspace
      const workspaceScreenshot = await puppeteerService.takeScreenshot(page, `notion-workspace-${runId}`);
      screenshotUrls.push(workspaceScreenshot);
      
      // Simulate clicking the "+ New Page" button
      logger.info('Simulating clicking "+ New Page" button');
      await page.evaluate(() => {
        // Show template selection
        document.querySelector('.main-content').innerHTML = `
          <div class="content-header">
            <h1>Create a new page</h1>
          </div>
          <div class="template-selection">
            <h2>Select a template</h2>
            <div class="template-grid">
              <div class="template-card">
                <div class="template-icon">📄</div>
                <div class="template-name">Empty Page</div>
              </div>
              <div class="template-card">
                <div class="template-icon">📝</div>
                <div class="template-name">To-do List</div>
              </div>
              <div class="template-card">
                <div class="template-icon">📅</div>
                <div class="template-name">Calendar</div>
              </div>
              <div class="template-card">
                <div class="template-icon">📊</div>
                <div class="template-name">Database</div>
              </div>
            </div>
          </div>
        `;
        
        // Add styles for template selection
        const style = document.createElement('style');
        style.textContent = `
          .template-selection { margin-top: 2rem; }
          .template-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 1rem; margin-top: 1rem; }
          .template-card { border: 1px solid #e0e0e0; border-radius: 4px; padding: 1rem; cursor: pointer; text-align: center; }
          .template-card:hover { background-color: #f5f5f5; }
          .template-icon { font-size: 2rem; margin-bottom: 0.5rem; }
        `;
        document.head.appendChild(style);
      });
      
      // Take screenshot of template selection
      const templateSelectionScreenshot = await puppeteerService.takeScreenshot(page, `notion-template-selection-${runId}`);
      screenshotUrls.push(templateSelectionScreenshot);
      
      // Simulate selecting the "Empty Page" template
      logger.info('Simulating selecting "Empty Page" template');
      await page.evaluate(() => {
        // Show new page editor
        document.querySelector('.main-content').innerHTML = `
          <div class="page-editor">
            <div class="editor-header">
              <input type="text" class="page-title" placeholder="Untitled" value="My New Page">
            </div>
            <div class="editor-body">
              <div class="editor-block">
                <div contenteditable="true" class="editor-content" placeholder="Type '/' for commands">
                  Welcome to my new Notion page!
                </div>
              </div>
              <div class="editor-block">
                <div contenteditable="true" class="editor-content" placeholder="Type '/' for commands">
                  <br>
                </div>
              </div>
            </div>
          </div>
        `;
        
        // Add styles for page editor
        const style = document.createElement('style');
        style.textContent = `
          .page-editor { height: 100%; }
          .editor-header { margin-bottom: 2rem; }
          .page-title { font-size: 2.5rem; font-weight: bold; border: none; background: transparent; width: 100%; }
          .editor-block { margin-bottom: 0.5rem; }
          .editor-content { padding: 0.25rem 0; min-height: 1.5rem; }
          .editor-content:focus { outline: none; }
          .editor-content:empty:before { content: attr(placeholder); color: #aaa; }
        `;
        document.head.appendChild(style);
      });
      
      // Take screenshot of new page
      const newPageScreenshot = await puppeteerService.takeScreenshot(page, `notion-new-page-${runId}`);
      screenshotUrls.push(newPageScreenshot);
      
      return {
        success: true,
        screenshotUrls,
        screenshotUrl: newPageScreenshot, // Primary screenshot for display
        message: 'Successfully demonstrated creating a new page in Notion'
      };
    } catch (error) {
      logger.error('Error in Notion basics script:', error);
      return { 
        success: false, 
        error: error.message,
        screenshotUrls: [] 
      };
    } finally {
      await browser.close();
    }
  }

  async handleVpnConnectionIssue(runId, ticketId) {
    const browser = await puppeteerService.launchBrowser();
    try {
      const page = await browser.newPage();
      const screenshotUrls = [];
      
      // Navigate to a mock VPN portal
      logger.info('Navigating to mock VPN portal');
      await page.goto('about:blank');
      
      // Create a mock VPN portal interface
      await page.evaluate(() => {
        document.body.innerHTML = `
          <div class="vpn-portal">
            <header>
              <h1>Corporate VPN Portal</h1>
            </header>
            <main>
              <div class="login-form">
                <h2>Connect to VPN</h2>
                <form>
                  <div class="form-group">
                    <label for="username">Username:</label>
                    <input type="text" id="username" placeholder="Enter your username">
                  </div>
                  <div class="form-group">
                    <label for="password">Password:</label>
                    <input type="password" id="password" placeholder="Enter your password">
                  </div>
                  <div class="form-group">
                    <label for="auth-method">Authentication Method:</label>
                    <select id="auth-method">
                      <option value="password">Password</option>
                      <option value="certificate">Certificate</option>
                      <option value="2fa">Two-Factor Authentication</option>
                    </select>
                  </div>
                  <button type="button" id="connect-button">Connect</button>
                </form>
              </div>
            </main>
          </div>
        `;
        
        // Add some basic styling
        const style = document.createElement('style');
        style.textContent = `
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
          .vpn-portal { max-width: 800px; margin: 0 auto; background-color: white; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          header { background-color: #003366; color: white; padding: 1rem; text-align: center; }
          main { padding: 2rem; }
          .login-form { max-width: 400px; margin: 0 auto; }
          .form-group { margin-bottom: 1rem; }
          label { display: block; margin-bottom: 0.5rem; }
          input, select { width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; }
          button { background-color: #003366; color: white; border: none; padding: 0.75rem 1rem; border-radius: 4px; cursor: pointer; width: 100%; }
        `;
        document.head.appendChild(style);
      });
      
      // Take screenshot of the login form
      const loginScreenshot = await puppeteerService.takeScreenshot(page, `vpn-login-${runId}`);
      screenshotUrls.push(loginScreenshot);
      
      // Simulate filling the form
      logger.info('Simulating filling the VPN login form');
      await puppeteerService.safeFill(page, '#username', 'test.user');
      await puppeteerService.safeFill(page, '#password', '********');
      
      // Take screenshot of the filled form
      const filledFormScreenshot = await puppeteerService.takeScreenshot(page, `vpn-filled-form-${runId}`);
      screenshotUrls.push(filledFormScreenshot);
      
      // Simulate connection error
      logger.info('Simulating VPN connection error');
      await page.evaluate(() => {
        // Add error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.cssText = 'background-color: #ffebee; color: #c62828; padding: 1rem; margin-top: 1rem; border-radius: 4px;';
        errorDiv.innerHTML = `
          <h3>Connection Failed</h3>
          <p>Unable to establish VPN connection. Error code: VPN-1042</p>
          <ul>
            <li>Check your network connection</li>
            <li>Verify your credentials</li>
            <li>Ensure VPN client is up to date</li>
            <li>Contact IT support if the issue persists</li>
          </ul>
        `;
        
        document.querySelector('.login-form').appendChild(errorDiv);
      });
      
      // Take screenshot of the error
      const errorScreenshot = await puppeteerService.takeScreenshot(page, `vpn-error-${runId}`);
      screenshotUrls.push(errorScreenshot);
      
      // Simulate troubleshooting steps
      logger.info('Simulating VPN troubleshooting steps');
      await page.evaluate(() => {
        // Replace error with troubleshooting steps
        document.querySelector('.error-message').remove();
        
        const troubleshootingDiv = document.createElement('div');
        troubleshootingDiv.className = 'troubleshooting';
        troubleshootingDiv.style.cssText = 'background-color: #e3f2fd; color: #0d47a1; padding: 1rem; margin-top: 1rem; border-radius: 4px;';
        troubleshootingDiv.innerHTML = `
          <h3>Troubleshooting Steps</h3>
          <ol>
            <li>
              <strong>Check Network Settings</strong>
              <p>Ensure you're not connected to any conflicting networks</p>
              <div class="status">✅ No conflicts detected</div>
            </li>
            <li>
              <strong>Verify VPN Client Version</strong>
              <p>Your client version: 8.2.1 (Latest: 8.2.3)</p>
              <div class="status">❌ Update required</div>
              <button style="background-color: #0d47a1; margin-top: 0.5rem;">Update Client</button>
            </li>
            <li>
              <strong>Test Connection</strong>
              <p>Testing connection to VPN servers...</p>
              <div class="status">✅ Servers reachable</div>
            </li>
          </ol>
        `;
        
        document.querySelector('.login-form').appendChild(troubleshootingDiv);
      });
      
      // Take screenshot of troubleshooting
      const troubleshootingScreenshot = await puppeteerService.takeScreenshot(page, `vpn-troubleshooting-${runId}`);
      screenshotUrls.push(troubleshootingScreenshot);
      
      // Simulate successful connection
      logger.info('Simulating successful VPN connection');
      await page.evaluate(() => {
        // Replace content with connected state
        document.querySelector('.troubleshooting').remove();
        document.querySelector('form').remove();
        
        const connectedDiv = document.createElement('div');
        connectedDiv.className = 'connected-state';
        connectedDiv.style.cssText = 'text-align: center;';
        connectedDiv.innerHTML = `
          <div style="margin: 2rem 0;">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" fill="#4CAF50" />
              <path d="M9 12L11 14L15 10" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>
          <h2 style="color: #4CAF50;">VPN Connected</h2>
          <p>You are now connected to the corporate network.</p>
          <div style="margin-top: 1rem;">
            <div style="background-color: #f5f5f5; padding: 1rem; border-radius: 4px; text-align: left;">
              <div><strong>IP Address:</strong> 10.45.67.89</div>
              <div><strong>Connection Time:</strong> 0:00:15</div>
              <div><strong>Server:</strong> VPN-EAST-05</div>
              <div><strong>Protocol:</strong> SSL</div>
            </div>
          </div>
          <button style="background-color: #f44336; margin-top: 1rem; width: auto; padding: 0.5rem 2rem;">Disconnect</button>
        `;
        
        document.querySelector('.login-form').appendChild(connectedDiv);
      });
      
      // Take screenshot of connected state
      const connectedScreenshot = await puppeteerService.takeScreenshot(page, `vpn-connected-${runId}`);
      screenshotUrls.push(connectedScreenshot);
      
      return {
        success: true,
        screenshotUrls,
        screenshotUrl: connectedScreenshot, // Primary screenshot for display
        message: 'Successfully demonstrated VPN connection troubleshooting'
      };
    } catch (error) {
      logger.error('Error in VPN connection script:', error);
      return { 
        success: false, 
        error: error.message,
        screenshotUrls: [] 
      };
    } finally {
      await browser.close();
    }
  }
}

module.exports = new PuppeteerScripts();
