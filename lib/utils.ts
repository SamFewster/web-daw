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

export const resampleAudioBuffer = (context: AudioContext, sourceBuffer: AudioBuffer, speed: number) => {
  const numChannels = sourceBuffer.numberOfChannels;
  const oldLength = sourceBuffer.length;
  const sampleRate = sourceBuffer.sampleRate;

  const newLength = Math.floor(oldLength / speed);
  const newBuffer = context.createBuffer(numChannels, newLength, sampleRate);

  for (let ch = 0; ch < numChannels; ch++) {
    const oldData = sourceBuffer.getChannelData(ch);
    const newData = newBuffer.getChannelData(ch);

    for (let i = 0; i < newLength; i++) {
      const oldPos = i * speed;
      const index0 = Math.floor(oldPos);
      const index1 = Math.min(index0 + 1, oldLength - 1);
      const frac = oldPos - index0;
      const sample =
        oldData[index0] * (1 - frac) +
        oldData[index1] * frac;

      newData[i] = sample;
    }
  }

  return newBuffer;
}

// export const resolveValueFromSetState = async <T> (setState: React.Dispatch<React.SetStateAction<T>>): Promise<T> => {
//   return new Promise((resolve) => {
//     setState(prev => {
//       resolve(prev);
//       return prev;
//     });
//   })
// }