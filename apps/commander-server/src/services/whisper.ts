/**
 * Whisper Speech-to-Text Service
 */

export async function transcribeAudio(audioPath: string): Promise<string> {
  console.log("[Whisper] Transcribing audio from", audioPath);
  return "Transcribed text placeholder";
}

export default { transcribeAudio };
