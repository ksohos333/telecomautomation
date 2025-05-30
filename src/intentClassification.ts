import Imap from 'imap';
import { simpleParser } from 'mailparser';
import { Readable } from 'stream';

// Define ticket interface
interface Ticket {
  subject: string;
  body: string;
  sender: string;
  date: Date;
}

export default function startImapListener(onTicket: (ticket: Ticket) => void): Imap {
  // Proper configuration with type safety
  const imap = new Imap({
    user: process.env.EMAIL_USER || '',  // Use empty string as fallback
    password: process.env.EMAIL_APP_PASSWORD || '',  // Use empty string as fallback
    host: process.env.EMAIL_HOST || 'imap.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '993'),
    tls: true,
    tlsOptions: { rejectUnauthorized: false }
  });

  imap.once('ready', () => {
    imap.openBox('INBOX', false, (err: Error | null) => {
      if (err) {
        console.error('Error opening inbox:', err);
        return;
      }

      imap.on('mail', () => {
        // Process new emails
        const fetch = imap.seq.fetch('1:*', {
          bodies: ['HEADER', 'TEXT'],
          markSeen: false
        });

        fetch.on('message', (msg) => {
          const ticket: Partial<Ticket> = {};

          msg.on('body', (stream, info) => {
            // Convert to Node.js Readable stream which is compatible with mailparser
            const readableStream = Readable.from(stream as any);
            simpleParser(readableStream, (err: Error | null, parsed: any) => {
              if (err) {
                console.error('Error parsing email:', err);
                return;
              }

              ticket.subject = parsed.subject || 'No Subject';
              ticket.body = parsed.text || '';
              ticket.sender = parsed.from?.text || '';
              ticket.date = parsed.date || new Date();

              // Call the callback with the complete ticket
              if (ticket.subject && ticket.body && ticket.sender && ticket.date) {
                onTicket(ticket as Ticket);
              }
            });
          });
        });

        fetch.once('error', (err: Error) => {
          console.error('Fetch error:', err);
        });
      });
    });
  });

  // Add error handling
  imap.once('error', (err: Error) => {
    console.error('IMAP connection error:', err);
  });

  imap.once('end', () => {
    console.log('IMAP connection ended');
  });

  // Connect to the server
  imap.connect();

  // Return the imap instance for cleanup
  return imap;
}
