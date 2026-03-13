type Track = {
    audio: TrackItem[],
    effects: Effect[],
    outputNode: GainNode,
    colour: string
};

type TrackItem = {
    audioBlob: Blob,
    audioBuffer: AudioBuffer,
    startTime: number,
    timestamp: number // timestamp of when the item was added for tracking and keying
};