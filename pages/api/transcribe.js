// // pages/api/transcribe.js
// import AWS from "aws-sdk";
// import dotenv from "dotenv";
// import connectDb from "../../lib/mongodb"; // MongoDB connection
// import Video from "../../models/video"; // Video model

// dotenv.config();

// const transcribe = new AWS.TranscribeService({
//   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//   region: process.env.AWS_REGION,
// });

// export default async function handler(req, res) {
//   const { jobName } = req.query;
//   if (!jobName) {
//     return res.status(400).json({ error: "Job name is required" });
//   }

//   try {
//     await connectDb();

//     const params = { TranscriptionJobName: jobName };
//     const transcriptionJob = await transcribe.getTranscriptionJob(params).promise();
//     const status = transcriptionJob.TranscriptionJob.TranscriptionJobStatus;

//     if (status === "COMPLETED") {
//       const transcriptUrl = transcriptionJob.TranscriptionJob.Transcript.TranscriptFileUri;

//       // Update the transcription result and status in the database
//       await Video.updateOne(
//         { transcriptionJobName: jobName },
//         {
//           transcriptionStatus: "COMPLETED",
//           transcriptionResult: transcriptUrl,
//         }
//       );

//       res.status(200).json({
//         success: true,
//         status: "COMPLETED",
//         transcriptUrl,
//       });
//     } else if (status === "FAILED") {
//       res.status(500).json({ success: false, error: "Transcription job failed" });
//     } else {
//       res.status(200).json({
//         success: false,
//         status: "IN_PROGRESS",
//         message: "Transcription job is still in progress",
//       });
//     }
//   } catch (error) {
//     res.status(500).json({ error: "Failed to fetch transcription job", details: error.message });
//   }
// }

import { TranscribeClient, GetTranscriptionJobCommand } from "@aws-sdk/client-transcribe";
import connectDb from "../../lib/mongodb"; // MongoDB connection
import Video from "../../models/video"; // Video model

const transcribe = new TranscribeClient({ region: process.env.AWS_REGION });

export default async function handler(req, res) {
  const { jobName } = req.query;

  if (!jobName) {
    return res.status(400).json({ error: "Job name is required" });
  }

  try {
    // Fetch transcription job status
    const params = {
      TranscriptionJobName: jobName,
    };

    const transcriptionJob = await transcribe.send(new GetTranscriptionJobCommand(params));
    const status = transcriptionJob.TranscriptionJob.TranscriptionJobStatus;

    if (status === "COMPLETED") {
      const transcriptUrl = transcriptionJob.TranscriptionJob.Transcript.TranscriptFileUri;

      // Connect to the database and update video metadata with transcription result
      await connectDb();
      await Video.updateOne(
        { transcriptionJobName: jobName },
        {
          transcriptionStatus: "COMPLETED",
          transcriptionResult: transcriptUrl,
        }
      );

      res.status(200).json({
        success: true,
        status: "COMPLETED",
        transcriptUrl,
      });
    } else if (status === "FAILED") {
      res.status(500).json({ success: false, error: "Transcription job failed" });
    } else {
      res.status(200).json({
        success: false,
        status: "IN_PROGRESS",
        message: "Transcription job is still in progress",
      });
    }
  } catch (error) {
    console.error("Error fetching transcription job:", error);
    res.status(500).json({ error: "Failed to fetch transcription job", details: error.message });
  }
}

