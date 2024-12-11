// // import mongoose from "mongoose";

// // // Define the video schema
// // const videoSchema = new mongoose.Schema({
// //   videoName: { type: String, required: true },
// //   videoUrl: { type: String, required: true },
// //   transcriptionStatus: { type: String, required: true, default: "IN_PROGRESS" }, // IN_PROGRESS, COMPLETED, FAILED
// //   transcriptionResult: { type: String, default: null }, // Link to transcription file
// //   transcriptionJobName: { type: String, required: true }, // AWS Transcription job name
// // });

// // // Check if the model is already defined to avoid the OverwriteModelError
// // const Video = mongoose.models.Video || mongoose.model("Video", videoSchema);

// // export default Video;
// import mongoose from "mongoose";

// // Define the video schema
// const videoSchema = new mongoose.Schema({
//   videoName: { type: String, required: true },
//   videoUrl: { type: String, required: true },
//   transcriptionStatus: { type: String, required: true, default: "IN_PROGRESS" }, // IN_PROGRESS, COMPLETED, FAILED
//   transcriptionResult: { type: String, default: null }, // Link to transcription file
//   transcriptionJobName: { type: String, required: true }, // AWS Transcription job name
// });

// // Avoid model redefinition
// let Video;

// if (mongoose.models.Video) {
//   Video = mongoose.models.Video; // Use existing model if already defined
// } else {
//   Video = mongoose.model("Video", videoSchema); // Otherwise, create the new model
// }

// export default Video;



import mongoose from "mongoose";

// Define the video schema
const videoSchema = new mongoose.Schema({
  videoName: { type: String, required: true },
  videoUrl: { type: String, required: true },
  transcriptionStatus: { type: String, required: true, default: "IN_PROGRESS" }, // IN_PROGRESS, COMPLETED, FAILED
  transcriptionResult: { type: String, default: null }, // Link to transcription file
  transcriptionJobName: { type: String, required: true }, // AWS Transcription job name
});

// Avoid model redefinition
const Video = mongoose.models.Video || mongoose.model("Video", videoSchema);

export default Video;
