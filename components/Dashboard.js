import React from "react";

export default function Dashboard({ assessments }) {
  return (
    <div>
      <h1>Your Feedback</h1>
      {assessments.map((assessment, index) => (
        <div key={index}>
          <h3>Session {index + 1}</h3>
          <p>{assessment.transcript}</p>
        </div>
      ))}
    </div>
  );
}
