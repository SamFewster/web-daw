import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function computeAudioBuffer(context: AudioContext, arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
  return await context.decodeAudioData(arrayBuffer);
}