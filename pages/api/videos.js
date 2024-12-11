// models/video.js
import mongoose from "mongoose";

const videoSchema = new mongoose.Schema({
  videoName: { type: String, required: true },
  videoUrl: { type: String, required: true },
  transcriptionStatus: { type: String, required: true, default: "IN_PROGRESS" },
  transcriptionResult: { type: String, default: null }, // URL of the transcription file
  transcriptionJobName: { type: String, required: true }, // Transcription job ID
});

const Video = mongoose.model("Video", videoSchema);
export default Video;
