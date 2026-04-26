import React, { useState } from "react";
async function callCheXpert(file: File) {
  const response = await fetch(
    "https://api-inference.huggingface.co/models/itsomk/chexpert-densenet121",
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

      <input type="file" accept="image/*" />

      {loading && <p>Analyzing X-ray...</p>}

      {results && (
        <div>
          <h3>Results</h3>
          <pre>{JSON.stringify(results, null, 2)}</pre>
        </div>
      )}
    </div>
  );
