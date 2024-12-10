import AWS from "aws-sdk";
import { Readable } from "stream";

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

export default async function handler(req, res) {
  if (req.method === "POST") {
    const stream = new Readable();
    stream.push(req.body);
    stream.push(null);

    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: `${Date.now()}.webm`,
      Body: stream,
      ContentType: "video/webm",
    };

    try {
      const data = await s3.upload(params).promise();
      res.status(200).json({ success: true, url: data.Location });
    } catch (error) {
      res.status(500).json({ error: "Error uploading video" });
    }
  } else {
    res.status(405).json({ message: "Method Not Allowed" });
  }
}
