import React, { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
import { Slider } from '../ui/slider'
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { resampleAudioBuffer } from '@/lib/utils';
import audioEncoder from 'audio-encoder';
import { useControls } from '../controls-provider';

// SpeedDialog lets the user change the playback speed of a selected audio clip.
// It works by creating a new AudioBuffer that has been resampled, then replacing the clip's
// `audioBuffer` and `audioBlob` in state so the waveform + playback use the updated audio.
const SpeedDialog = ({ open, setOpen, selectedWaveform, tracks, setTracks }: { open: boolean, setOpen: React.Dispatch<React.SetStateAction<boolean>>, selectedWaveform: SelectedWaveform | undefined, tracks: Track[], setTracks: React.Dispatch<React.SetStateAction<Track[]>> }) => {
    // Speed multiplier:
    // 1.0 = normal speed, 2.0 = twice as fast (higher pitch), 0.5 = half speed (lower pitch).
    const [speed, setSpeed] = useState(1);
    useEffect(() => {
        // Reset the UI whenever the user selects a different waveform.
        setSpeed(1);
    }, [selectedWaveform]);
    // Access to the shared AudioContext (needed to create a new AudioBuffer).
    const { controls } = useControls();
    return (
        // Controlled dialog: open/close is managed by the parent component.
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Update Speed</DialogTitle>
                    <DialogDescription>
                        Change this audio waveform's speed
                    </DialogDescription>
                </DialogHeader>
                <div className='flex flex-col gap-3 justify-center items-center'>
                    {/* Slider and input both edit the same `speed` state so the user can use either. */}
                    <Slider min={0.5} max={2} step={0.01} value={[speed]} onValueChange={(value) => setSpeed(value[0])} />
                    <div>
                        <Input value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value.length > 0 ? e.target.value : "1"))} type='number' step={0.1} min={0.5} max={2} />
                    </div>
                    <Button onClick={() => {
                        // close dialog
                        setOpen(false);
                        if (!selectedWaveform) return;

                        // same algorithm used in context-menu.tsx for finding the end time of the track
                        let timeToAddAudio = 0;
                        for (const audio of tracks[selectedWaveform.trackIndex].audio) {
                            const endTime = audio.startTime + audio.audioBuffer.duration;
                            if (endTime > timeToAddAudio) timeToAddAudio = endTime;
                        }

                        // create a new audio buffer with the new speed
                        // Resampling changes the number of samples so the clip plays faster/slower.
                        const newBuffer = resampleAudioBuffer(controls.context!, tracks[selectedWaveform.trackIndex].audio[selectedWaveform.waveformIndex!].audioBuffer, speed);

                        // create a blob from the new audio buffer
                        // We encode the new buffer back into an audio Blob so components that rely on Blob/File
                        // (e.g. the <audio> element used by WaveSurfer) can reload it.
                        audioEncoder(newBuffer, 0, null, async (blob: Blob) => {
                            // once the blob is created, update the tracks state with the new audio waveform
                            setTracks(prev => [
                                // add all the tracks before the selected track
                                ...prev.slice(0, selectedWaveform.trackIndex),
                                // add the new audio waveform to the selected track
                                {
                                    ...prev[selectedWaveform.trackIndex],
                                    audio: [
                                        // Replace only the selected clip while keeping the rest unchanged.
                                        ...prev[selectedWaveform.trackIndex].audio.slice(0, selectedWaveform.waveformIndex),
                                        {
                                            ...prev[selectedWaveform.trackIndex].audio[selectedWaveform.waveformIndex!],
                                            audioBlob: blob,
                                            audioBuffer: newBuffer,
                                            // New timestamp helps React treat it as updated and ensures unique keys/ids.
                                            timestamp: Date.now()
                                        },
                                        ...prev[selectedWaveform.trackIndex].audio.slice(selectedWaveform.waveformIndex! + 1)
                                    ]
                                },
                                // add all the tracks after the selected track
                                ...prev.slice(selectedWaveform.trackIndex + 1)
                            ]);
                        });
                    }}>
                        Save
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default SpeedDialog