const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

async function sendDirectEmail() {
  console.log('Attempting to send a direct email...');
  
  // Create a transporter with explicit configuration
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'konstantinos.sohos@gmail.com',
      pass: process.env.EMAIL_APP_PASSWORD || 'vzkl klav hpqf xnbv'
    }
  });
  
  // Email content with Notion instructions
  const emailContent = {
    from: process.env.EMAIL_USER || 'konstantinos.sohos@gmail.com',
    to: 'konstantinos.sohos@gmail.com',
    subject: 'How to Use Notion - Getting Started Guide',
    text: `
Hello,

Here's a guide to help you get started with Notion:

1. Create your first page:
   - Click the "+ New Page" button in the left sidebar
   - Choose a template or start with a blank page
   - Give your page a title

2. Add content to your page:
   - Type "/" to see all the block types you can add
   - Try adding headings, bullet points, to-do lists, and tables
   - You can also add images, files, and embed content

3. Organize your content:
   - Create subpages by adding page blocks within pages
   - Use the sidebar to navigate between pages
   - Drag and drop pages to rearrange them

4. Use templates:
   - Click "Templates" in the left sidebar
   - Browse templates for different use cases
   - Click "Duplicate" to use a template

Let me know if you have any specific questions!

Best regards,
Customer Support Team
    `,
    html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #2e3748;">How to Use Notion - Getting Started Guide</h1>
  
  <p>Hello,</p>
  
  <p>Here's a guide to help you get started with Notion:</p>
  
  <h2 style="color: #2e3748;">1. Create your first page</h2>
  <ul>
    <li>Click the "+ New Page" button in the left sidebar</li>
    <li>Choose a template or start with a blank page</li>
    <li>Give your page a title</li>
  </ul>
  
  <h2 style="color: #2e3748;">2. Add content to your page</h2>
  <ul>
    <li>Type "/" to see all the block types you can add</li>
    <li>Try adding headings, bullet points, to-do lists, and tables</li>
    <li>You can also add images, files, and embed content</li>
  </ul>
  
  <h2 style="color: #2e3748;">3. Organize your content</h2>
  <ul>
    <li>Create subpages by adding page blocks within pages</li>
    <li>Use the sidebar to navigate between pages</li>
    <li>Drag and drop pages to rearrange them</li>
  </ul>
  
  <h2 style="color: #2e3748;">4. Use templates</h2>
  <ul>
    <li>Click "Templates" in the left sidebar</li>
    <li>Browse templates for different use cases</li>
    <li>Click "Duplicate" to use a template</li>
  </ul>
  
  <p>Let me know if you have any specific questions!</p>
  
  <p>Best regards,<br>Customer Support Team</p>
</div>
    `
  };
  
  try {
    // Send the email
    const info = await transporter.sendMail(emailContent);
    
    console.log('✓ Direct email sent successfully!');
    console.log('Message ID:', info.messageId);
    
    return true;
  } catch (error) {
    console.log('✗ Error sending direct email:', error.message);
    console.log('Full error:', error);
    
    return false;
  }
}

// Run the function
sendDirectEmail();
