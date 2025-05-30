# Teleperformance Automation

An AI-powered automation system for customer support and tech support roles, specifically designed for Notion support.

## Features

- AI-powered intent classification
- Vector search for relevant documentation
- Automated response generation
- Edge case handling (refunds, missing info, etc.)
- n8n workflow integration

## Prerequisites

- Node.js (v14 or higher)
- npm
- n8n (for workflow automation)
- Pinecone account (for vector database)
- OpenAI API key

## Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file with the following variables:
   ```
   OPENAI_API_KEY=your_openai_api_key
   PINECONE_API_KEY=your_pinecone_api_key
   PINECONE_ENVIRONMENT=your_pinecone_environment
   MONGODB_URI=your_mongodb_connection_string
   MONGODB_DB_NAME=telecom_support
   PORT=3001
   
   # Email integration with Twilio SendGrid
   ENABLE_EMAIL_LISTENER=true
   TWILIO_EMAIL_HOST=smtp.sendgrid.net
   TWILIO_EMAIL_PORT=587
   TWILIO_EMAIL_USER=your_sendgrid_api_key
   TWILIO_EMAIL_PASSWORD=your_sendgrid_password
   TWILIO_FROM_EMAIL=support@yourdomain.com
   ```
4. Create a Pinecone index named `notion-support` with dimension 1536 (for OpenAI embeddings)
5. Populate Pinecone with sample data:
   ```
   npm run populate-pinecone
   ```
6. Start the server:
   ```
   npm start
   ```

## n8n Workflow

1. Import the `n8n-workflow.json` file into n8n
2. Activate the workflow
3. Use the webhook URL to trigger the workflow

## API Endpoints

### POST /support

Process a support request.

**Request Body:**
```json
{
  "ticketId": "12345",
  "content": "I'm having trouble with my Notion template",
  "userEmail": "user@example.com"
}
```

**Response:**
```json
{
  "ticketId": "12345",
  "reply": "Here's how to fix your template issue...",
  "status": "completed",
  "intent": "template_issue"
}
```

## Architecture

The system consists of the following components:

1. **MCP Server**: Express.js server that handles support requests
2. **Intent Classification**: OpenAI-powered classification of support requests
3. **Vector Search**: Pinecone-powered search for relevant documentation
4. **Response Generation**: OpenAI-powered generation of responses
5. **n8n Workflow**: Workflow for ticket ingestion, processing, and routing

## Extending the System

### Adding New Intents

1. Update the `classifyIntent` function in `src/utils/openai.js`
2. Add handling for the new intent in `src/controllers/supportController.js`

### Adding New Documentation

1. Update the `notionDocs` array in `src/utils/populatePinecone.js`
2. Run `npm run populate-pinecone` to update the vector database

## License

ISC

