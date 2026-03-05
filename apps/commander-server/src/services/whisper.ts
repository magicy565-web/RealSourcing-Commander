/**
 * Whisper Speech-to-Text Service
 */

export async function transcribeAudio(audioPath: string): Promise<string> {
  console.log("[Whisper] Transcribing audio from", audioPath);
  return "Transcribed text placeholder";
}

export async function transcribeVideo(videoPath: string): Promise<string> {
  console.log("[Whisper] Transcribing video from", videoPath);
  return "Video transcription placeholder";
}

export default { transcribeAudio, transcribeVideo };
