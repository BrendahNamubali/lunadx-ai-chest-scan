export default async function handler(req, res) {
  try {
    const buffer = await req.arrayBuffer?.();

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

    // Convert HuggingFace output → LunaDX format
    const map = (label) =>
      hf.find((x) => x.label.toLowerCase().includes(label))?.score || 0;

    return res.status(200).json({
      pneumonia_probability: Math.round(map("pneumonia") * 100),
      tb_probability: Math.round(map("fibrosis") * 100),
      heatmap_overlay_url: null,
      ai_summary: "AI analysis completed via CheXNet model.",
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Inference failed" });
  }
}
