import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper for ES modules to handle file paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function checkLocker() {
  const url = 'https://www.vossresort.no/skisenter/skiskap';
  const targetText = "Familieskap Scandic Hotel";
  
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

    // Update logs.json (using relative path)
    const logPath = path.join(process.cwd(), 'logs.json');
    let logs = [];
    if (fs.existsSync(logPath)) {
      logs = JSON.parse(fs.readFileSync(logPath, 'utf8'));
    }
    logs.unshift(result); 
    fs.writeFileSync(logPath, JSON.stringify(logs.slice(0, 20), null, 2));

    console.log(result.found ? "Locker Found!" : "Still booked.");
  } catch (error) {
    console.error("Error checking website:", error.message);
  }
}

checkLocker();