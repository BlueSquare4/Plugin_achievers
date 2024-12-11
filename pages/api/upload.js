import { IncomingForm } from "formidable";
import AWS from "aws-sdk";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

export const config = {
  api: {
    bodyParser: false, // Disable default body parser to handle file uploads
  },
};

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

export default async function handler(req, res) {
  if (req.method === "POST") {
    const form = new IncomingForm();

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error("Formidable parsing error:", err);
        return res.status(400).json({ error: "File parsing failed", details: err.message });
      }

      // Debugging parsed fields and files
      console.log("Parsed fields:", fields);
      console.log("Parsed files:", files);

      // Access the first file in the array
      const file = files.file && files.file[0]; // Ensure file exists
      if (!file) {
        console.error("No file uploaded");
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Debug file properties
      console.log("File details:", {
        originalFilename: file.originalFilename,
        filepath: file.filepath,
        mimetype: file.mimetype,
        size: file.size,
      });

      // Prepare S3 upload parameters
      const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: `${Date.now()}-${file.originalFilename || "uploaded-file"}`, // Use a unique name
        Body: fs.createReadStream(file.filepath), // File stream
        ContentType: file.mimetype || "application/octet-stream",
      };

      try {
        const data = await s3.upload(params).promise();
        console.log("S3 Upload Success:", data);
        res.status(200).json({ success: true, url: data.Location });
      } catch (uploadError) {
        console.error("S3 Upload Error:", uploadError);
        res.status(500).json({ error: "Error uploading to S3", details: uploadError.message });
      }
    });
  } else {
    console.error("Method Not Allowed");
    res.status(405).json({ message: "Method Not Allowed" });
  }
}
