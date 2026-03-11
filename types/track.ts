type Track = {
    // an array of track items, each with a blob, buffer, and start time
    audio: TrackItem[],
    // an array of effects, currently with no functionality or interface
    effects: any
};

type TrackItem = {
    // the audio blob, used to create the audio buffer
    audioBlob: Blob,
    // the audio buffer, used to create the audio node
    audioBuffer: AudioBuffer,
    // the start time of the track item
    startTime: number
};