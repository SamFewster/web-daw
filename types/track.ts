type Track = {
    audio: TrackItem[],
    effects: any
};

type TrackItem = {
    audioBlob: Blob,
    audioBuffer: AudioBuffer,
    startTime: number
};