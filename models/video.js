// const mongoose = require("mongoose");

// const videoSchema = new mongoose.Schema({
//   videoName: String,
//   videoUrl: String,
//   transcriptionJobName: String,
//   transcriptionStatus: String,
//   transcriptionText: String, // To store completed transcription text
// });

// module.exports = mongoose.models.Video || mongoose.model("Video", videoSchema);


import mongoose from 'mongoose';

const VideoSchema = new mongoose.Schema({
  videoName: { type: String, required: true },
  videoUrl: { type: String, required: true },
  transcriptionJobName: { type: String, required: true },
  transcriptionStatus: { 
    type: String, 
    enum: ['IN_PROGRESS', 'COMPLETED', 'FAILED'], 
    default: 'IN_PROGRESS' 
  },
  fileSize: { type: Number, required: true },
  fileType: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Video || mongoose.model('Video', VideoSchema);