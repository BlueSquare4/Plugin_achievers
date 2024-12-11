import { S3Client, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand } from "@aws-sdk/client-s3";
import { TranscribeClient, StartTranscriptionJobCommand } from "@aws-sdk/client-transcribe";
import { IncomingForm } from "formidable";
import fs from "fs";
import path from "path";
import os from "os";
import dotenv from "dotenv";
import connectDb from "../../lib/mongodb";
import Video from "../../models/video";

dotenv.config();

export const config = {
  api: {
    bodyParser: false,
  },
};

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  requestTimeout: 600000,
  maxAttempts: 3,
});

const transcribe = new TranscribeClient({
  region: process.env.AWS_REGION,
});

// Multipart upload function
async function multipartUpload(file, bucketName, key) {
  const partSize = 10 * 1024 * 1024; // 10 MB parts
  const fileSize = file.size || fs.statSync(file.filepath).size;

  const multipartUploadParams = {
    Bucket: bucketName,
    Key: key,
    ContentType: file.mimetype || 'video/webm'
  };

  const uploadResult = await s3.send(new CreateMultipartUploadCommand(multipartUploadParams));
  const uploadId = uploadResult.UploadId;

  const parts = [];
  let uploadedBytes = 0;
  let partNumber = 1;

  const fileStream = file.filepath 
    ? fs.createReadStream(file.filepath, { highWaterMark: partSize })
    : file;

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

    console.log(`Uploaded ${uploadedBytes} of ${fileSize} bytes (${(uploadedBytes / fileSize * 100).toFixed(2)}%)`);
  }

  const completeParams = {
    Bucket: bucketName,
    Key: key,
    UploadId: uploadId,
    MultipartUpload: { Parts: parts }
  };

  const finalResult = await s3.send(new CompleteMultipartUploadCommand(completeParams));
  return finalResult;
}

// Video processing function
async function processVideoUpload(file, res) {
  // Validate file type (optional)
  const allowedTypes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm'];
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
        // Clean up temporary file if it exists
        if (file.filepath && fs.existsSync(file.filepath)) {
          try {
            fs.unlinkSync(file.filepath);
          } catch (unlinkError) {
            console.error("Failed to delete temporary file:", unlinkError);
          }
        }

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

    // Clean up temporary file if it exists
    if (file.filepath && fs.existsSync(file.filepath)) {
      try {
        fs.unlinkSync(file.filepath);
      } catch (unlinkError) {
        console.error("Failed to delete temporary file:", unlinkError);
      }
    }

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
}

export default async function handler(req, res) {
  // Set maximum timeout for the entire request
  res.socket.setTimeout(900000); // 15 minutes

  try {
    if (req.method === "POST") {
      // Check if it's a direct blob upload or file upload
      const contentType = req.headers['content-type'];

      if (contentType && contentType.includes('multipart/form-data')) {
        // Existing form-based file upload logic
        const form = new IncomingForm({
          maxFileSize: 1024 * 1024 * 1024, // 1 GB max file size
          keepExtensions: true
        });

        form.parse(req, async (err, fields, files) => {
          if (err) {
            console.error("File parsing error:", err);
            return res.status(400).json({ error: "File parsing failed", details: err.message });
          }

          await processVideoUpload(files.file[0], res);
        });
      } else if (contentType && contentType.includes('video/')) {
        // Direct blob upload handling
        const chunks = [];
        for await (const chunk of req) {
          chunks.push(chunk);
        }
        const blob = Buffer.concat(chunks);

        const file = {
          mimetype: contentType,
          size: blob.length,
          originalFilename: `recorded-video-${Date.now()}.webm`
        };

        // Use os.tmpdir() for cross-platform temp directory
        const tempDir = os.tmpdir();
        const tempFilePath = path.join(tempDir, file.originalFilename);

        try {
          // Ensure temp directory exists and is writable
          await fs.promises.mkdir(tempDir, { recursive: true });
          
          // Write file with error handling
          await fs.promises.writeFile(tempFilePath, blob);
          file.filepath = tempFilePath;

          await processVideoUpload(file, res);
        } catch (writeError) {
          console.error("Failed to write temporary file:", writeError);
          return res.status(500).json({ 
            error: "Failed to process video file", 
            details: writeError.message 
          });
        }
      } else {
        return res.status(400).json({ error: "Unsupported upload method" });
      }
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