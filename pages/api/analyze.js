import { transcribeAudio } from "../../lib/speechToText";

export default async function handler(req, res) {
  if (req.method === "POST") {
    const { videoUrl } = req.body;

    try {
      const { transcript } = await transcribeAudio(videoUrl);
      res.status(200).json({ transcript });
    } catch (error) {
      res.status(500).json({ error: "Error analyzing speech" });
    }
  } else {
    res.status(405).json({ message: "Method Not Allowed" });
  }
}
