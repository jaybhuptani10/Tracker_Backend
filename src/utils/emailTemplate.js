export const getEmailTemplate = ({
  title,
  body,
  footerText = "Keep crushing your goals! 🚀",
}) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f3f4f6; }
        .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); }
        .header { background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); padding: 30px; text-align: center; }
        .logo { color: white; font-size: 24px; font-weight: bold; text-decoration: none; display: inline-block; }
        .content { padding: 40px 30px; color: #374151; line-height: 1.6; }
        .title { font-size: 20px; font-weight: 700; color: #111827; margin-bottom: 20px; }
        .message { font-size: 16px; color: #4b5563; margin-bottom: 30px; }
        .task-card { background: #f9fafb; border-left: 4px solid #8b5cf6; padding: 15px 20px; border-radius: 8px; margin: 20px 0; }
        .task-content { font-size: 18px; font-weight: 600; color: #1f2937; margin: 0; }
        .footer { background: #f9fafb; padding: 20px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb; }
        .highlight { color: #7c3aed; font-weight: 600; }
        .cta-button { display: inline-block; background-color: #4f46e5; color: #ffffff !important; padding: 12px 24px; border-radius: 8px; text-decoration: none !important; font-weight: bold; margin-top: 10px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">DuoTrack ⚡</div>
        </div>
        <div class="content">
          <div class="title">${title}</div>
          <div class="message">${body}</div>
        </div>
        <div class="footer">
          <p>${footerText}</p>
          <p>© ${new Date().getFullYear()} DuoTrack. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};
