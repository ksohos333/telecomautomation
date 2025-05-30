const express = require('express');
const router = express.Router();
const puppeteerScripts = require('../utils/puppeteerScripts');
const PuppeteerRun = require('../models/puppeteerRun');
const logger = require('../utils/logger');

/**
 * @route POST /api/puppeteer/run
 * @desc Run a Puppeteer script for a specific intent
 * @access Private
 */
router.post('/run', async (req, res) => {
  try {
    const { intent, ticketId, content } = req.body;
    
    logger.info(`Received request to run Puppeteer script with intent: ${intent}, ticket: ${ticketId}`);
    
    if (!intent) {
      logger.warn('Missing intent in request');
      return res.status(400).json({ success: false, error: 'Intent is required' });
    }
    
    if (!ticketId) {
      logger.warn('Missing ticketId in request');
      return res.status(400).json({ success: false, error: 'Ticket ID is required' });
    }
    
    logger.info(`Running Puppeteer script for intent: ${intent}, ticket: ${ticketId}`);
    
    // Check if the script exists
    if (!puppeteerScripts.scripts || !puppeteerScripts.scripts[intent]) {
      logger.error(`Script not found for intent: ${intent}`);
      return res.status(404).json({ 
        success: false, 
        error: `No script available for intent: ${intent}`,
        intent
      });
    }
    
    // Run the Puppeteer script
    const result = await puppeteerScripts.runScript(intent, ticketId);
    
    logger.info(`Script execution completed for intent: ${intent}, success: ${result.success}`);
    
    return res.json({
      success: result.success,
      intent: result.intent,
      runId: result.runId,
      message: result.message || null,
      error: result.error || null,
      screenshots: result.screenshotUrls || [],
      primaryScreenshot: result.screenshotUrl || null
    });
  } catch (error) {
    logger.error('Error running Puppeteer script:', error);
    return res.status(500).json({ 
      success: false, 
      error: `Internal server error: ${error.message}` 
    });
  }
});

/**
 * @route POST /api/puppeteer/tickets/:ticketId/run
 * @desc Run a Puppeteer script for a specific ticket
 * @access Private
 */
router.post('/tickets/:ticketId/run', async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { intent } = req.body;
    
    if (!intent) {
      return res.status(400).json({ error: 'Intent is required' });
    }
    
    logger.info(`Running Puppeteer script for intent: ${intent}, ticket: ${ticketId}`);
    
    // Run the Puppeteer script
    const result = await puppeteerScripts.runScript(intent, ticketId);
    
    return res.json({
      success: result.success,
      intent: result.intent,
      runId: result.runId,
      message: result.message || null,
      error: result.error || null,
      screenshots: result.screenshotUrls || [],
      primaryScreenshot: result.screenshotUrl || null
    });
  } catch (error) {
    logger.error('Error running Puppeteer script:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route GET /api/puppeteer/runs/:runId
 * @desc Get details of a specific Puppeteer run
 * @access Private
 */
router.get('/runs/:runId', async (req, res) => {
  try {
    const { runId } = req.params;
    
    // Find the run in the database
    const run = await PuppeteerRun.findById(runId);
    
    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }
    
    return res.json(run.getSummary());
  } catch (error) {
    logger.error('Error getting Puppeteer run:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route GET /api/puppeteer/tickets/:ticketId/runs
 * @desc Get all Puppeteer runs for a specific ticket
 * @access Private
 */
router.get('/tickets/:ticketId/runs', async (req, res) => {
  try {
    const { ticketId } = req.params;
    
    // Find all runs for this ticket
    const runs = await PuppeteerRun.find({ ticket_id: ticketId }).sort({ created_at: -1 });
    
    return res.json(runs.map(run => run.getSummary()));
  } catch (error) {
    logger.error('Error getting Puppeteer runs for ticket:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route GET /api/puppeteer/scripts
 * @desc Get a list of available Puppeteer scripts
 * @access Private
 */
router.get('/scripts', (req, res) => {
  try {
    logger.info('Received request for available Puppeteer scripts');
    
    // Check if scripts are available
    if (!puppeteerScripts.scripts) {
      logger.error('No scripts available in puppeteerScripts module');
      return res.status(500).json({ 
        success: false, 
        error: 'No scripts available' 
      });
    }
    
    // Get the list of available scripts from the puppeteerScripts module
    const availableScripts = Object.keys(puppeteerScripts.scripts).map(key => ({
      id: key,
      name: key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    }));
    
    logger.info(`Returning ${availableScripts.length} available scripts`);
    
    return res.json({
      success: true,
      scripts: availableScripts
    });
  } catch (error) {
    logger.error('Error getting available Puppeteer scripts:', error);
    return res.status(500).json({ 
      success: false, 
      error: `Internal server error: ${error.message}` 
    });
  }
});

module.exports = router;
