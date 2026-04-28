import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    if (!process.env.HF_TOKEN) {
      return res.status(500).json({ error: "Missing HF_TOKEN" });
    }

    const response = await fetch(
      "https://api-inference.huggingface.co/models/keremberke/chest-xray-classification",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.HF_TOKEN}`,
          "Content-Type": "application/octet-stream",
        },
        body: req.body,
      }
    );

    const data = await response.json();

    return res.status(200).json({
      success: true,
      model: "keremberke/chest-xray-classification",
      predictions: data,
    });

  } catch (error: any) {
    return res.status(500).json({
      error: "Inference failed",
      details: error.message,
    });
  }
}
