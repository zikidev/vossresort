import { useState } from 'react';

function App() {
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    setStatus("Scanning...");
    try {
      const response = await fetch(`/api/parse?url=${url}&searchString=${text}`);
      const data = await response.json();
      setStatus(data.message || data.error);
    } catch (err) {
      setStatus("Error connecting to the parser.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1>URL Text Parser</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '400px' }}>
        <input 
          placeholder="https://example.com" 
          onChange={(e) => setUrl(e.target.value)} 
        />
        <input 
          placeholder="Text to find..." 
          onChange={(e) => setText(e.target.value)} 
        />
        <button onClick={handleSearch} disabled={loading}>
          {loading ? "Searching..." : "Check URL"}
        </button>
      </div>
      {status && <p><strong>Result:</strong> {status}</p>}
    </div>
  );
}

export default App;