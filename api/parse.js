import axios from 'axios';

export default async function handler(req, res) {
  const { url, searchString } = req.query;

  if (!url || !searchString) {
    return res.status(400).json({ error: "Missing URL or search string" });
  }

  try {
    // We fetch the website HTML from the server side to avoid CORS
    const response = await axios.get(url, { timeout: 5000 });
    const html = response.data.toLowerCase();
    const found = html.includes(searchString.toLowerCase());

    res.status(200).json({
      url,
      found,
      message: found ? `Success: "${searchString}" found!` : `Not found.`
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch the URL. It might be blocking scrapers." });
  }
}