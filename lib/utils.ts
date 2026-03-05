import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function computeAudioBuffer(context: AudioContext, arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
  return await context.decodeAudioData(arrayBuffer);
}

export const getRandomColour = (theme: string) => {
  const min = theme === 'dark' ? 0 : 100;
  const max = theme === 'dark' ? 100 : 200;
  const r = getRandomInt(min, max);
  const g = getRandomInt(min, max);
  const b = getRandomInt(min, max);
  return 'rgb(' + r + ',' + g + ',' + b + ')';
};

export const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1) + min);