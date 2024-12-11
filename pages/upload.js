import React, { useState } from "react";

const Upload = () => {
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [fileDetails, setFileDetails] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

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

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }

      // Simulating progress for frontend (actual progress requires Axios)
      const timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(timer);
          }
          return prev + 20;
        });
      }, 300);

      const data = await response.json();
      if (data.success) {
        setMessage(`Upload successful! File URL: ${data.url}`);
      } else {
        setMessage(`Error: ${data.error}`);
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
};

export default Upload;
