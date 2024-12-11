import React, { useState } from "react";
import axios from "axios";

const Upload = () => {
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [fileDetails, setFileDetails] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [transcriptionStatus, setTranscriptionStatus] = useState("");
  const [transcriptionText, setTranscriptionText] = useState("");

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setFileDetails({
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(2), // Convert bytes to MB
        type: file.type,
      });
    } else {
      setFileDetails(null);
    }
  };

  const handleUpload = async (event) => {
    event.preventDefault();

    if (!fileDetails) {
      setMessage("Please select a file to upload.");
      return;
    }

    const fileInput = event.target.elements.file;
    const formData = new FormData();
    formData.append("file", fileInput.files[0]);

    setIsUploading(true);
    setProgress(0);
    setMessage("");
    setTranscriptionStatus("");
    setTranscriptionText("");

    try {
      const response = await axios.post("/api/upload", formData, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setProgress(percentCompleted);
        },
      });

      if (response.data.success) {
        setMessage(`Upload successful! File URL: ${response.data.videoUrl}`);
        setTranscriptionStatus("Processing transcription...");

        // Poll for transcription results
        const pollTranscription = async () => {
          const { data } = await axios.get(`/api/transcribe?jobName=${response.data.transcriptionJobName}`);
          if (data.status === "COMPLETED") {
            setTranscriptionStatus("Transcription completed.");
            setTranscriptionText(data.transcriptUrl); // Set the transcription text
          } else if (data.status === "IN_PROGRESS") {
            setTimeout(pollTranscription, 5000); // Poll every 5 seconds
          } else {
            setTranscriptionStatus("Transcription failed.");
          }
        };

        pollTranscription();
      } else {
        setMessage(`Error: ${response.data.error}`);
      }
    } catch (error) {
      setMessage(`Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setProgress(0);
    setMessage("");
    setFileDetails(null);
    setIsUploading(false);
    setTranscriptionStatus("");
    setTranscriptionText("");
  };

  return (
    <div style={styles.container}>
      <h1>File Upload</h1>
      <form onSubmit={handleUpload}>
        <input
          type="file"
          name="file"
          accept="video/webm, audio/mp3, video/mp4, video/x-matroska"
          required
          onChange={handleFileChange}
        />
        <button type="submit" disabled={isUploading} style={styles.button}>
          {isUploading ? "Uploading..." : "Upload"}
        </button>
        <button
          type="button"
          onClick={handleReset}
          disabled={isUploading}
          style={{ ...styles.button, backgroundColor: "#ccc" }}
        >
          Reset
        </button>
        
                    <button
            type="button"
            onClick={() => (window.location.href = "/dashboard")}
            style={{ ...styles.button, backgroundColor: "#007bff" }}
          >
            Go to Dashboard
          </button>

      </form>

      {fileDetails && (
        <div style={styles.fileDetails}>
          <p><strong>File Name:</strong> {fileDetails.name}</p>
          <p><strong>File Size:</strong> {fileDetails.size} MB</p>
          <p><strong>File Type:</strong> {fileDetails.type}</p>
        </div>
      )}

      {isUploading && (
        <div style={styles.progressContainer}>
          <div
            style={{
              ...styles.progressBar,
              width: `${progress}%`,
            }}
          ></div>
        </div>
      )}

      {message && <div style={styles.message}>{message}</div>}

      {transcriptionStatus && (
        <div style={styles.transcriptionStatus}>
          <p><strong>Transcription Status:</strong> {transcriptionStatus}</p>
          {transcriptionText && (
            <p>
              <strong>Transcript:</strong> <a href={transcriptionText} target="_blank" rel="noopener noreferrer">View Transcript</a>
            </p>
          )}
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: "500px",
    margin: "50px auto",
    padding: "20px",
    border: "1px solid #ddd",
    borderRadius: "10px",
    textAlign: "center",
    backgroundColor: "#f9f9f9",
  },
  button: {
    padding: "10px 20px",
    margin: "10px 5px",
    border: "none",
    borderRadius: "5px",
    backgroundColor: "#4caf50",
    color: "#fff",
    cursor: "pointer",
  },
  progressContainer: {
    margin: "20px 0",
    width: "100%",
    backgroundColor: "#e0e0e0",
    borderRadius: "10px",
    height: "20px",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#4caf50",
    borderRadius: "10px",
    transition: "width 0.3s",
  },
  message: {
    marginTop: "20px",
    padding: "10px",
    borderRadius: "5px",
    backgroundColor: "#f4f4f4",
    color: "#333",
    fontSize: "14px",
    textAlign: "center",
  },
  fileDetails: {
    marginTop: "20px",
    textAlign: "left",
    fontSize: "14px",
  },
  transcriptionStatus: {
    marginTop: "20px",
    padding: "10px",
    borderRadius: "5px",
    backgroundColor: "#e8f5e9",
    color: "#2e7d32",
    fontSize: "14px",
    textAlign: "center",
  },
};

export default Upload;
