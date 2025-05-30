const request = require('supertest');
const app = require('../src/app');
const whatsappService = require('../src/services/whatsappService');

// Mock the whatsappService.processWhatsAppMessage function
jest.mock('../src/services/whatsappService', () => ({
  processWhatsAppMessage: jest.fn().mockResolvedValue({}),
}));

// Mock the twilio validation middleware
jest.mock('../src/middleware/twilioValidation', () => ({
  validateTwilioRequest: (req, res, next) => next(),
}));

describe('WhatsApp Integration Tests', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  test('POST /api/webhook/whatsapp should process incoming message', async () => {
    const mockMessage = {
      Body: 'Hello, I need help with Notion templates',
      From: 'whatsapp:+1234567890',
      To: 'whatsapp:+0987654321',
    };

    const response = await request(app)
      .post('/api/webhook/whatsapp')
      .send(mockMessage)
      .set('Content-Type', 'application/x-www-form-urlencoded');

    // Verify response
    expect(response.status).toBe(200);
    expect(response.type).toBe('text/xml');
    expect(response.text).toContain('<?xml version="1.0" encoding="UTF-8"?><Response>');

    // Verify service was called with correct parameters
    expect(whatsappService.processWhatsAppMessage).toHaveBeenCalledWith(mockMessage);
  });

  test('POST /api/webhook/whatsapp should handle errors gracefully', async () => {
    // Mock the service to throw an error
    whatsappService.processWhatsAppMessage.mockRejectedValueOnce(new Error('Test error'));

    const mockMessage = {
      Body: 'Hello',
      From: 'whatsapp:+1234567890',
      To: 'whatsapp:+0987654321',
    };

    const response = await request(app)
      .post('/api/webhook/whatsapp')
      .send(mockMessage)
      .set('Content-Type', 'application/x-www-form-urlencoded');

    // Verify response contains error message
    expect(response.status).toBe(200);
    expect(response.type).toBe('text/xml');
    expect(response.text).toContain('Sorry, something went wrong');
  });
});