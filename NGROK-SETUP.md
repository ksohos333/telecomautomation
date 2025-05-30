# Setting Up ngrok for Twilio Webhooks

This guide explains how to use ngrok to expose your local development server to the internet so Twilio can send webhook requests to it.

## What is ngrok?

ngrok is a tool that creates a secure tunnel to your localhost, making your local web server accessible from the internet. This is necessary for services like Twilio to send webhook requests to your application during development.

## Setup Instructions

### 1. Install ngrok

1. Sign up for a free account at [ngrok.com](https://ngrok.com/)
2. Download ngrok for your operating system
3. Extract the downloaded file to a location on your computer

### 2. Connect Your Account

Run this command with your authtoken from the ngrok dashboard:

```
ngrok authtoken YOUR_AUTH_TOKEN_HERE
```

### 3. Start ngrok

1. Make sure your local server is running first (e.g., `npm start`)
2. Run the start-ngrok script:

```
.\start-ngrok.bat
```

3. Copy the HTTPS URL that appears (e.g., `https://a1b2-203-0-113-42.ngrok-free.app`)

### 4. Configure Twilio

1. Go to the [Twilio Console](https://console.twilio.com/)
2. Navigate to Messaging > Settings > WhatsApp Sandbox Settings
3. In the "When a message comes in" field, enter:
   ```
   YOUR_NGROK_URL/api/webhook/whatsapp
   ```
   For example:
   ```
   https://a1b2-203-0-113-42.ngrok-free.app/api/webhook/whatsapp
   ```
4. Save your changes

### 5. Testing

Send a message to your Twilio WhatsApp number. You should see the webhook request appear in your ngrok console and your application should process it.

## Important Notes

1. **Free ngrok limitations**: The free tier of ngrok assigns a random URL each time you start it. You'll need to update your Twilio webhook URL each time you restart ngrok.

2. **Keep ngrok running**: ngrok must be running for Twilio to reach your local server. If you close the ngrok window, your webhook will stop working.

3. **Inspect traffic**: ngrok provides a web interface at http://localhost:4040 where you can inspect all the traffic going through your tunnel.

4. **Upgrade for persistent URLs**: If you need a persistent URL that doesn't change, consider upgrading to a paid ngrok plan.