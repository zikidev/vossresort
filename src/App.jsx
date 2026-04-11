import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    // When deployed, we fetch the log file from the root
    fetch('/logs.json')
      .then(res => res.json())
      .then(data => setLogs(data))
      .catch(e => console.log("No logs yet. Robot needs to run first!"));
  }, []);

  return (
    <div className="App">
      <h1>Voss Ski Locker Monitor</h1>
      <div className="status-card">
        <h2>Latest Status: {logs[0]?.found ? "✅ AVAILABLE" : "❌ BOOKED"}</h2>
      </div>
      
      <h3>Recent History</h3>
      <ul>
        {logs.map((log, i) => (
          <li key={i}>{log.date}: {log.found ? "Available!" : "Full"}</li>
        ))}
      </ul>
    </div>
  );
}

export default App;