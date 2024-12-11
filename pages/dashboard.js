// pages/dashboard.js
import React, { useEffect, useState } from "react";

const Dashboard = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const response = await fetch("/api/videos");
        if (!response.ok) {
          throw new Error("Failed to fetch videos");
        }
        const data = await response.json();
        setVideos(data.videos); // Set the videos data
      } catch (err) {
        setError(err.message); // Set error message
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h1>Video Dashboard</h1>
      {videos.length === 0 ? (
        <p>No videos found.</p>
      ) : (
        <ul>
          {videos.map((video, index) => (
            <li key={index}>
              <h3>{video.videoName}</h3>
              <p><strong>Video URL:</strong> <a href={video.videoUrl} target="_blank" rel="noopener noreferrer">{video.videoUrl}</a></p>
              <p><strong>Status:</strong> {video.transcriptionStatus}</p>
              {video.transcriptionStatus === "COMPLETED" && (
                <p><strong>Transcript:</strong> <a href={video.transcriptionResult} target="_blank" rel="noopener noreferrer">Download Transcript</a></p>
              )}
              {video.transcriptionStatus === "IN_PROGRESS" && (
                <p><strong>Transcript:</strong> Transcription is still in progress.</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Dashboard;
