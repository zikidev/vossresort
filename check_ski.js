const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

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

    // Update logs.json
    let logs = [];
    if (fs.existsSync('./logs.json')) {
      logs = JSON.parse(fs.readFileSync('./logs.json', 'utf8'));
    }
    logs.unshift(result); 
    fs.writeFileSync('./logs.json', JSON.stringify(logs.slice(0, 20), null, 2));

    console.log(result.found ? "Locker Found!" : "Still booked.");
    
    // Optional: Add logic here to trigger email only if result.found is true
  } catch (error) {
    console.error("Error checking website:", error.message);
  }
}

checkLocker();