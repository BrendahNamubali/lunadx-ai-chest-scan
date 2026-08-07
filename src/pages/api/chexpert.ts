export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const chunks = [];

    for await (const chunk of req) {
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);

    // Forward image to Hugging Face
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

    const data = await response.json();

    res.status(200).json(data);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Inference failed" });
  }
}