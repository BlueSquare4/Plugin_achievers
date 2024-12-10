import { SpeechClient } from "@google-cloud/speech";

const client = new SpeechClient();

export async function transcribeAudio(uri) {
  const audio = { uri };
  const config = {
    encoding: "WEBM_OPUS",
    sampleRateHertz: 16000,
    languageCode: "en-IN",
    enableWordTimeOffsets: true,
  };

  const request = { audio, config };
  const [response] = await client.recognize(request);
  const transcript = response.results.map((result) => result.alternatives[0].transcript).join(" ");
  return { transcript, response };
}
