type Track = {
    audio: TrackItem[],
    effects: any,
    colour: string
};

type TrackItem = {
    audioBlob: Blob,
    audioBuffer: AudioBuffer,
    startTime: number,
    timestamp: number // timestamp of when the item was added for tracking
};