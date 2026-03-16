import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function computeAudioBuffer(context: AudioContext, arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
  return await context.decodeAudioData(arrayBuffer);
}

export const getRandomColour = (theme: string) => {
  const hue = Math.floor(Math.random() * 360); // any color
  const saturation = 85 + Math.random() * 15;  // very vibrant

  // darker colors for light backgrounds, lighter colors for dark backgrounds
  const lightness = theme === "light"
    ? 35 + Math.random() * 10   // darker so it contrasts white
    : 60 + Math.random() * 10;  // brighter so it contrasts black

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1) + min);

export const resampleAudioBuffer = (
  context: AudioContext,
  sourceBuffer: AudioBuffer,
  speed: number
) => {
  const numChannels = sourceBuffer.numberOfChannels; // Number of audio channels (e.g., 2 for stereo)
  const oldLength = sourceBuffer.length;             // Number of samples in the original buffer
  const sampleRate = sourceBuffer.sampleRate;       // Sample rate of the audio (samples per second)

  // Calculate new length based on desired speed
  // Faster playback (speed > 1) = fewer samples
  // Slower playback (speed < 1) = more samples
  const newLength = Math.floor(oldLength / speed);

  // Create a new AudioBuffer to hold the resampled audio
  const newBuffer = context.createBuffer(numChannels, newLength, sampleRate);

  // Process each channel separately
  for (let ch = 0; ch < numChannels; ch++) {
    const oldData = sourceBuffer.getChannelData(ch); // Original audio samples for this channel
    const newData = newBuffer.getChannelData(ch);   // Array to store resampled samples

    // Fill the new buffer with resampled data
    for (let i = 0; i < newLength; i++) {
      const oldPos = i * speed;                     // Corresponding position in original buffer
      const index0 = Math.floor(oldPos);            // Index of the previous sample
      const index1 = Math.min(index0 + 1, oldLength - 1); // Index of the next sample (clamped)
      const frac = oldPos - index0;                 // Fractional distance between the two samples

      // Linear interpolation between two samples for smoother resampling
      const sample =
        oldData[index0] * (1 - frac) +
        oldData[index1] * frac;

      newData[i] = sample;                          // Store the calculated sample in new buffer
    }
  }

  return newBuffer; // Return the resampled AudioBuffer
};