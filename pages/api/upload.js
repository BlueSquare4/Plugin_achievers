import { S3Client, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand } from "@aws-sdk/client-s3";
import { TranscribeClient, StartTranscriptionJobCommand } from "@aws-sdk/client-transcribe";
import { IncomingForm } from "formidable";
import fs from "fs";
import dotenv from "dotenv";
import connectDb from "../../lib/mongodb"; // MongoDB connection
import Video from "../../models/video"; // Video model

dotenv.config();

export const config = {
  api: {
    bodyParser: false, // Disable body parser to handle file uploads
  },
};

// Configure S3 Client with extended timeout and retry settings
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  requestTimeout: 600000,  // Increased to 10 minutes (600,000ms)
  maxAttempts: 3,          // Max retries
});

const transcribe = new TranscribeClient({
  region: process.env.AWS_REGION,
});

// Multipart upload function
async function multipartUpload(file, bucketName, key) {
  const partSize = 10 * 1024 * 1024; // 10 MB parts
  const fileSize = fs.statSync(file.filepath).size;

  // Initiate multipart upload
  const multipartUploadParams = {
    Bucket: bucketName,
    Key: key,
    ContentType: file.mimetype
  };

  const uploadResult = await s3.send(new CreateMultipartUploadCommand(multipartUploadParams));
  const uploadId = uploadResult.UploadId;

  const parts = [];
  let uploadedBytes = 0;
  let partNumber = 1;

  const fileStream = fs.createReadStream(file.filepath, {
    highWaterMark: partSize
  });

  for await (const chunk of fileStream) {
    const partParams = {
      Bucket: bucketName,
      Key: key,
      PartNumber: partNumber,
      UploadId: uploadId,
      Body: chunk
    };

    const uploadPartResult = await s3.send(new UploadPartCommand(partParams));
    parts.push({
      ETag: uploadPartResult.ETag,
      PartNumber: partNumber
    });

    uploadedBytes += chunk.length;
    partNumber++;

    // Optional: Log upload progress
    console.log(`Uploaded ${uploadedBytes} of ${fileSize} bytes (${(uploadedBytes / fileSize * 100).toFixed(2)}%)`);
  }

  // Complete multipart upload
  const completeParams = {
    Bucket: bucketName,
    Key: key,
    UploadId: uploadId,
    MultipartUpload: { Parts: parts }
  };

  const finalResult = await s3.send(new CompleteMultipartUploadCommand(completeParams));
  return finalResult;
}

export default async function handler(req, res) {
  // Set maximum timeout for the entire request
  res.socket.setTimeout(900000); // 15 minutes

  try {
    if (req.method === "POST") {
      const form = new IncomingForm({
        maxFileSize: 1024 * 1024 * 1024, // 1 GB max file size
        keepExtensions: true
      });

      form.parse(req, async (err, fields, files) => {
        if (err) {
          console.error("File parsing error:", err);
          return res.status(400).json({ error: "File parsing failed", details: err.message });
        }

        const file = files.file[0];
        if (!file) {
          return res.status(400).json({ error: "No file uploaded" });
        }

        // Validate file type (optional)
        const allowedTypes = ['video/mp4', 'video/mpeg', 'video/quicktime'];
        if (!allowedTypes.includes(file.mimetype)) {
          return res.status(400).json({ 
            error: "Invalid file type", 
            allowedTypes: allowedTypes 
          });
        }

        // Generate unique file key
        const fileKey = `videos/${Date.now()}-${file.originalFilename}`;

        // Multipart upload with retry mechanism
        let uploadResult;
        let uploadAttempts = 0;
        const MAX_UPLOAD_ATTEMPTS = 3;

        while (uploadAttempts < MAX_UPLOAD_ATTEMPTS) {
          try {
            uploadResult = await multipartUpload(file, process.env.S3_BUCKET_NAME, fileKey);
            break; // Success, exit the loop
          } catch (uploadError) {
            uploadAttempts++;
            console.error(`Upload attempt ${uploadAttempts} failed:`, uploadError);
            
            if (uploadAttempts >= MAX_UPLOAD_ATTEMPTS) {
              return res.status(500).json({ 
                error: "Failed to upload video after multiple attempts", 
                details: uploadError.message 
              });
            }
            
            // Add a delay between retries
            await new Promise(resolve => setTimeout(resolve, 2000 * uploadAttempts));
          }
        }

        // Start transcription job
        const transcriptionJobName = `transcription-${Date.now()}`;
        const mediaFileUri = `s3://${process.env.S3_BUCKET_NAME}/${fileKey}`;
        const transcribeParams = {
          TranscriptionJobName: transcriptionJobName,
          LanguageCode: "en-US",
          Media: { MediaFileUri: mediaFileUri },
          OutputBucketName: process.env.S3_BUCKET_NAME,
        };

        try {
          await transcribe.send(new StartTranscriptionJobCommand(transcribeParams));
          console.log("Transcription job started");
        } catch (transcribeError) {
          console.error("Transcription job error:", transcribeError);
          return res.status(500).json({ 
            error: "Failed to start transcription job", 
            details: transcribeError.message 
          });
        }

        // Save video metadata to database
        try {
          await connectDb();
          const newVideo = new Video({
            videoName: file.originalFilename,
            videoUrl: `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`,
            transcriptionJobName,
            transcriptionStatus: "IN_PROGRESS",
            fileSize: file.size,
            fileType: file.mimetype
          });
          await newVideo.save();
          console.log("Video metadata saved to MongoDB:", newVideo);

          // Respond with success
          res.status(200).json({
            success: true,
            message: "Video uploaded and transcription job started",
            videoUrl: newVideo.videoUrl,
            transcriptionJobName,
            fileDetails: {
              name: file.originalFilename,
              size: file.size,
              type: file.mimetype
            }
          });
        } catch (dbError) {
          console.error("Database error:", dbError);
          return res.status(500).json({ 
            error: "Failed to save video metadata to the database", 
            details: dbError.message 
          });
        }
      });
    } else {
      res.status(405).json({ message: "Method Not Allowed" });
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    res.status(500).json({ 
      error: "Internal Server Error", 
      details: error.message 
    });
  }
}