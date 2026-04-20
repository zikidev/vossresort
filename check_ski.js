/* global process */
import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';

// Helper for ES modules to handle file paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseBoolean(value, defaultValue = false) {
  if (value === undefined) return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function getMailerConfig() {
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_SECURE,
    SMTP_USER,
    SMTP_PASS,
    ALERT_TO_EMAIL,
    ALERT_FROM_EMAIL,
  } = process.env;

  const isConfigured = Boolean(
    SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS && ALERT_TO_EMAIL,
  );

  return {
    isConfigured,
    smtp: {
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: parseBoolean(SMTP_SECURE, Number(SMTP_PORT) === 465),
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    },
    from: ALERT_FROM_EMAIL || SMTP_USER,  
    to: ALERT_TO_EMAIL,
  };
}

async function sendFoundEmailAlert(result) {
  const mailerConfig = getMailerConfig();
  if (!mailerConfig.isConfigured) {
    console.log('Email alert skipped: SMTP/alert env vars are missing.');
    return;
  }

  const transporter = nodemailer.createTransport(mailerConfig.smtp);
  await transporter.sendMail({
    from: mailerConfig.from,
    to: mailerConfig.to,
    subject: 'Voss Ski Locker Alert: Availability Found',
    text: [
      'Good news - a matching locker appears to be available.',
      `Checked at: ${result.date}`,
      `Link: ${result.link || 'No direct link found'}`,
    ].join('\n'),
    html: `
      <p><strong>Good news</strong> - a matching locker appears to be available.</p>
      <p><strong>Checked at:</strong> ${result.date}</p>
      <p><strong>Link:</strong> ${result.link ? `<a href="${result.link}">${result.link}</a>` : 'No direct link found'}</p>
    `,
  });

  console.log(`Email alert sent to ${mailerConfig.to}.`);
}

async function checkLocker() {
  const url = 'https://www.vossresort.no/skisenter/skiskap';
  const targetText = "Familieskap Scandic Hotel";
  const forceEmailAlert = parseBoolean(process.env.FORCE_EMAIL_ALERT);
  
  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    
    // Check if the specific text exists inside a link
    const linkFound = $('a').filter(function() {
      return $(this).text().includes(targetText);
    }).attr('href');

    const result = {
      date: new Date().toLocaleString("en-GB", { timeZone: "Europe/Oslo" }),
      found: !!linkFound,
      link: linkFound ? (linkFound.startsWith('http') ? linkFound : `https://www.vossresort.no${linkFound}`) : null
    };

    // Store logs in Vite's public folder so the browser can fetch /logs.json.
    const logPath = path.join(process.cwd(), 'public', 'logs.json');
    const legacyLogPath = path.join(process.cwd(), 'logs.json');
    let logs = [];
    if (fs.existsSync(logPath)) {
      logs = JSON.parse(fs.readFileSync(logPath, 'utf8'));
    } else if (fs.existsSync(legacyLogPath)) {
      // One-time fallback to keep history after path migration.
      logs = JSON.parse(fs.readFileSync(legacyLogPath, 'utf8'));
    }
    logs.unshift(result); 
    fs.writeFileSync(logPath, JSON.stringify(logs.slice(0, 20), null, 2));

    if (result.found || forceEmailAlert) {
      try {
        await sendFoundEmailAlert({
          ...result,
          link: result.link || url,
        });
      } catch (emailError) {
        console.error('Locker found but failed to send email alert:', emailError.message);
      }
    }

    console.log(result.found ? "Locker Found!" : "Still booked.");
  } catch (error) {
    console.error("Error checking website:", error.message);
  }
}

checkLocker();