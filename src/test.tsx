import React from 'react';
import { createRoot } from 'react-dom/client';

function SimpleTest() {
  return (
    <div style={{ padding: '40px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🏥 LunaDX Test Page</h1>
      <div style={{ background: '#d4edda', padding: '20px', borderRadius: '5px', margin: '20px 0' }}>
        <h2>✅ React is Working!</h2>
        <p>If you can see this page, the frontend is working correctly.</p>
      </div>
      
      <div style={{ background: '#d1ecf1', padding: '20px', borderRadius: '5px', margin: '20px 0' }}>
        <h3>🔗 Next Steps:</h3>
        <ol>
          <li>Go to <a href="http://localhost:8080/">http://localhost:8080/</a></li>
          <li>Login with: admin@lunadx.com / admin123</li>
          <li>Access the full LunaDX dashboard</li>
        </ol>
      </div>
      
      <div style={{ background: '#fff3cd', padding: '20px', borderRadius: '5px', margin: '20px 0' }}>
        <h3>🌐 Server Status:</h3>
        <ul>
          <li><strong>Frontend:</strong> ✅ Running (this page)</li>
          <li><strong>Backend:</strong> <a href="http://127.0.0.1:8000/health" target="_blank">Check Health</a></li>
        </ul>
      </div>
    </div>
  );
}

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<SimpleTest />);
