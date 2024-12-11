import { useRef, useState } from "react";
import axios from "axios";

export default function VideoRecorder() {
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const [recording, setRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);

  // Start video stream
  const startVideo = async () => {
    if (!videoRef.current) return;

    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    videoRef.current.srcObject = stream;
    videoRef.current.play();
  };

  // Start recording
  const startRecording = () => {
    const stream = videoRef.current.srcObject;
    if (!stream) return;

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: "video/webm",
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        setRecordedChunks((prev) => [...prev, event.data]);
      }
    };

    mediaRecorder.start();
    mediaRecorderRef.current = mediaRecorder;
    setRecording(true);
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  // Save the recorded video
  const saveVideo = async () => {
    if (recordedChunks.length) {
      const blob = new Blob(recordedChunks, { type: "video/webm" });
  
      // Create FormData to send the video blob
      const formData = new FormData();
      formData.append("file", blob, "recorded-video.webm");
  
      try {
        // Send video to the upload endpoint
        const response = await axios.post("/api/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            console.log(`Upload Progress: ${percentCompleted}%`);
          },
        });
  
        if (response.data.success) {
          alert("Upload successful! File URL: " + response.data.videoUrl);
        } else {
          alert("Upload failed: " + response.data.error);
        }
      } catch (error) {
        console.error("Upload failed", error);
        alert("Upload failed: " + error.message);
      }
    }
  };
  

  return (
    <div style={{ textAlign: "center" }}>
      <h1>Video Recorder</h1>
      <video ref={videoRef} style={{ width: "100%", maxHeight: "500px" }}></video>
      <div style={{ marginTop: "10px" }}>
        {!recording ? (
          <button onClick={startVideo}>Start Camera</button>
        ) : null}
        {!recording ? (
          <button onClick={startRecording}>Start Recording</button>
        ) : (
          <button onClick={stopRecording}>Stop Recording</button>
        )}
        {recordedChunks.length > 0 && (
          <button onClick={saveVideo}>Save Video</button>
        )}
      </div>
    </div>
  );
}