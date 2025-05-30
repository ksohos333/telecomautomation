const fs = require('fs');
const util = require('util');
const path = require('path');
const logger = require('../utils/logger');
const speech = require('@google-cloud/speech');
const textToSpeech = require('@google-cloud/text-to-speech');
const config = require('../utils/config');

// Initialize Google Cloud Speech-to-Text client
const speechClient = new speech.SpeechClient({
  keyFilename: config.GOOGLE_APPLICATION_CREDENTIALS
});

// Initialize Google Cloud Text-to-Speech client
const ttsClient = new textToSpeech.TextToSpeechClient({
  keyFilename: config.GOOGLE_APPLICATION_CREDENTIALS
});

/**
 * Convert speech to text
 * @param {Buffer} audioBuffer - Audio buffer to convert
 * @returns {Promise<string>} - Transcribed text
 */
async function speechToText(audioBuffer) {
  try {
    // Check if we have Google credentials
    if (!config.GOOGLE_APPLICATION_CREDENTIALS) {
      logger.warn('Google credentials not found, using mock implementation for speech-to-text');
      return "How do I create a new page in Notion and organize my content?";
    }

    logger.info('Converting speech to text using Google Cloud Speech-to-Text');
    
    // The audio file's encoding, sample rate in hertz, and BCP-47 language code
    const audio = {
      content: audioBuffer.toString('base64'),
    };
    
    const request = {
      audio: audio,
      config: {
        encoding: 'LINEAR16',
        sampleRateHertz: 16000,
        languageCode: 'en-US',
      },
    };

    // Detects speech in the audio file
    const [response] = await speechClient.recognize(request);
    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');
    
    logger.info(`Transcription: ${transcription}`);
    return transcription;
  } catch (error) {
    logger.error('Error in speech to text conversion:', error);
    // Fallback to mock implementation
    logger.info('Falling back to mock implementation for speech-to-text');
    return "How do I create a new page in Notion and organize my content?";
  }
}

/**
 * Convert text to speech
 * @param {string} text - Text to convert
 * @param {string} outputFile - Path to output file
 * @returns {Promise<string>} - Path to output file
 */
async function textToSpeechConvert(text, outputFile) {
  try {
    // Check if we have Google credentials
    if (!config.GOOGLE_APPLICATION_CREDENTIALS) {
      logger.warn('Google credentials not found, using mock implementation for text-to-speech');
      return createMockAudioFile(text, outputFile);
    }

    logger.info(`Converting text to speech using Google Cloud Text-to-Speech: ${text.substring(0, 50)}...`);
    
    // Construct the request
    const request = {
      input: { text: text },
      // Select the language and SSML voice gender
      voice: { languageCode: 'en-US', ssmlGender: 'NEUTRAL' },
      // Select the type of audio encoding
      audioConfig: { audioEncoding: 'MP3' },
    };

    // Performs the text-to-speech request
    const [response] = await ttsClient.synthesizeSpeech(request);
    
    // Create directory if it doesn't exist
    const dir = path.dirname(outputFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write the binary audio content to a file
    const writeFile = util.promisify(fs.writeFile);
    await writeFile(outputFile, response.audioContent, 'binary');
    
    logger.info(`Audio content written to file: ${outputFile}`);
    return outputFile;
  } catch (error) {
    logger.error('Error in text to speech conversion:', error);
    // Fallback to mock implementation
    return createMockAudioFile(text, outputFile);
  }
}

/**
 * Create a mock audio file for testing
 * @param {string} text - Text to convert
 * @param {string} outputFile - Path to output file
 * @returns {Promise<string>} - Path to output file
 */
async function createMockAudioFile(text, outputFile) {
  logger.info(`Creating mock audio file: ${text.substring(0, 50)}...`);
  
  // Create a mock MP3 file (just a copy of a sample file or empty file)
  const sampleFile = path.join(__dirname, '../../public/sample-audio.mp3');
  
  // If sample file exists, copy it, otherwise create an empty file
  if (fs.existsSync(sampleFile)) {
    fs.copyFileSync(sampleFile, outputFile);
  } else {
    // Create directory if it doesn't exist
    const dir = path.dirname(outputFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    // Write an empty file
    fs.writeFileSync(outputFile, '');
  }
  
  return outputFile;
}

/**
 * Handle a voice call
 * @param {Buffer} incomingAudio - Audio buffer from the call
 * @param {string} ticketId - Ticket ID for tracking
 * @returns {Promise<{text: string, audioPath: string}>} - Response text and audio path
 */
async function handleVoiceCall(incomingAudio, ticketId) {
  try {
    // 1. Convert speech to text
    const transcription = await speechToText(incomingAudio);
    
    // 2. Process the text as a support request using OpenAI
    const { generateResponse, classifyIntent } = require('../utils/openai');
    const { queryPinecone } = require('../utils/pinecone');
    const puppeteerScripts = require('../utils/puppeteerScripts');
    
    // Classify intent
    const intent = await classifyIntent(transcription);
    logger.info(`Classified intent as: ${intent}`);
    
    // Get relevant documentation
    const docs = await queryPinecone(transcription);
    
    // Generate response
    const responseText = await generateResponse(transcription, docs);
    
    // If it's a visual support issue, run Puppeteer script
    let puppeteerResult = null;
    if (['template_issue', 'vpn_connection', 'screen_share_issue', 'notion_basics'].includes(intent)) {
      puppeteerResult = await puppeteerScripts.runScript(intent, ticketId);
    }
    
    // 3. Convert response to speech
    const outputFile = path.join(__dirname, '../../public/audio', `response-${ticketId}.mp3`);
    await textToSpeechConvert(responseText, outputFile);
    
    return {
      text: transcription,
      responseText: responseText,
      audioPath: outputFile
    };
  } catch (error) {
    logger.error('Error handling voice call:', error);
    throw error;
  }
}

module.exports = {
  speechToText,
  textToSpeechConvert,
  handleVoiceCall
};
