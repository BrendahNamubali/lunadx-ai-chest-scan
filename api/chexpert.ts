export default async function handler(req, res) {
  try {
    // ── 1. Read image buffer (Vercel-safe) ─────────────────────
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // ── 2. Call Hugging Face model ─────────────────────────────
    const response = await fetch(
      "https://api-inference.huggingface.co/models/itsomk/chexpert-densenet121",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.HF_TOKEN}`,
          "Content-Type": "application/octet-stream",
        },
        body: buffer,
      }
    );

    const hf = await response.json();

    // ── 3. Safety checks ────────────────────────────────────────
    if (!Array.isArray(hf) || hf.error || hf[0]?.error) {
      return res.status(503).json({
        error: "Model loading or unavailable",
        raw: hf,
      });
    }

    // ── 4. Score helper ─────────────────────────────────────────
    const getScore = (keywords) =>
      Math.max(
        ...keywords.map(
          (k) =>
            hf.find((x) => x.label.toLowerCase().includes(k))?.score || 0
        )
      );

    // ── 5. Response ─────────────────────────────────────────────
    return res.status(200).json({
      pneumonia_probability: Math.round(
        getScore(["pneumonia", "consolidation", "infiltration"]) * 100
      ),
      tb_probability: Math.round(
        getScore(["fibrosis", "nodule", "mass", "opacity"]) * 100
      ),
      heatmap_overlay_url: null,
      ai_summary: "AI analysis completed via CheXNet model.",
    });

  } catch (error) {
    console.error("CheXpert API error:", error);

    return res.status(500).json({
      error: "Inference failed",
    });
  }
}
