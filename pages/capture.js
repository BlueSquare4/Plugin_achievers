import { useRef, useState } from "react";
import axios from "axios";

export default function VideoRecorder() {
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const [recording, setRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Start video stream
  const startVideo = async () => {
    if (!videoRef.current) return;

    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
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

  // Direct blob upload
  const directUpload = async () => {
    if (recordedChunks.length) {
      const blob = new Blob(recordedChunks, { type: "video/webm" });
  
      try {
        setUploading(true);
        // Direct blob upload to the server
        const response = await axios.post("/api/upload", blob, {
          headers: { 
            "Content-Type": "video/webm" 
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            console.log(`Upload Progress: ${percentCompleted}%`);
          },
        });
  
        if (response.data.success) {
          alert("Upload successful! File URL: " + response.data.videoUrl);
          // Clear recorded chunks after successful upload
          setRecordedChunks([]);
        } else {
          alert("Upload failed: " + response.data.error);
        }
      } catch (error) {
        console.error("Upload failed", error);
        alert("Upload failed: " + error.message);
      } finally {
        setUploading(false);
      }
    }
  };

  // Stop stream and clean up
  const stopVideo = () => {
    const stream = videoRef.current.srcObject;
    if (stream) {
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  return (
    <div style={{ textAlign: "center" }}>
      <h1>Video Recorder</h1>
      <video ref={videoRef} style={{ width: "100%", maxHeight: "500px" }}></video>
      <div style={{ marginTop: "10px" }}>
        {!recording && recordedChunks.length === 0 ? (
          <button onClick={startVideo}>Start Camera</button>
        ) : null}
        
        {!recording && recordedChunks.length === 0 ? (
          <button onClick={startRecording}>Start Recording</button>
        ) : null}
        
        {recording ? (
          <button onClick={stopRecording}>Stop Recording</button>
        ) : null}
        
        {recordedChunks.length > 0 && !uploading ? (
          <>
            <button onClick={directUpload}>Upload Video</button>
            <button onClick={() => setRecordedChunks([])}>Discard</button>
          </>
        ) : null}
        
        {uploading && <p>Uploading...</p>}
        
        {!recording && recordedChunks.length > 0 ? (
          <button onClick={stopVideo}>Stop Camera</button>
        ) : null}
      </div>
    </div>
  );
}