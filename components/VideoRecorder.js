import React, { useState, useRef } from "react";
import { ReactMediaRecorder } from "react-media-recorder";

export default function VideoRecorder({ onUpload }) {
  return (
    <div>
      <ReactMediaRecorder
        video
        audio
        render={({ startRecording, stopRecording, mediaBlobUrl }) => (
          <div>
            <button onClick={startRecording}>Start Recording</button>
            <button onClick={stopRecording}>Stop Recording</button>
            {mediaBlobUrl && (
              <>
                <video src={mediaBlobUrl} controls width="400" />
                <button onClick={() => onUpload(mediaBlobUrl)}>Upload</button>
              </>
            )}
          </div>
        )}
      />
    </div>
  );
}
