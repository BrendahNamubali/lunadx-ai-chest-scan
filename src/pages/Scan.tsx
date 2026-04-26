import React, { useState } from "react";
async function callCheXpert(file: File) {
  const response = await fetch("/api/chexpert", {
    method: "POST",
    body: file,
  });

  return await response.json();
}
    {
      method: "POST",
      headers: {
        Authorization: "Bearer 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",
        "Content-Type": "application/octet-stream",
      },
      body: file,
    }
  );

  return await response.json();
}
export default function Scan() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  return (
    <div style={{ padding: 40 }}>
      <h1>LunaDX Chest X-Ray Scan</h1>

      <input
  type="file"
  accept="image/*"
  onChange={async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setResults(null);

    try {
      const data = await callCheXpert(file);
      setResults(data);
      console.log("AI RESULT:", data);
    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  }}
/>

      {loading && <p>Analyzing X-ray...</p>}

      {results && (
        <div>
          <h3>Results</h3>
          <pre>{JSON.stringify(results, null, 2)}</pre>
        </div>
      )}
    </div>
  );
