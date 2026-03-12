// React hooks for side effects and component state.
import React, { useEffect, useState } from 'react'
// Renders a single waveform clip and handles its playback/selection.
import Waveform from './waveform'
// Reusable UI control for the mute button.
import { Button } from './ui/button';
// Icons that indicate whether the track is muted or audible.
import { Volume1Icon, VolumeOffIcon } from 'lucide-react';
// Provides access to the shared Web Audio context and master gain so this track can route into the mix.
import { useControls } from './controls-provider';
// Converts raw file data into a decoded AudioBuffer for playback and analysis.
import { computeAudioBuffer } from '@/lib/utils';

// Single track in the DAW: holds a list of audio clips, a per-track gain (for mute), and supports drag-and-drop of new files.
const Track = ({ track, index, setTracks, setSelectedWaveform, selectedWaveform }: { track: Track, index: number, setTracks: React.Dispatch<React.SetStateAction<Track[]>>, setSelectedWaveform: React.Dispatch<React.SetStateAction<SelectedWaveform | undefined>>, selectedWaveform: SelectedWaveform | undefined }) => {
    // Whether this track’s output is silenced (mute on/off).
    const [muted, setMuted] = useState(false);
    // Web Audio GainNode for this track; all clip playback is routed through it so mute can zero the level.
    const [localGainNode, setLocalGainNode] = useState<GainNode | null>();
    // Shared audio context and master gain from the app’s controls provider.
    const { controls } = useControls();

    // On mount, create a gain node for this track and connect it to the master gain so it participates in the mix.
    useEffect(() => {
        if (controls.context) {
            const localGainNode = controls.context.createGain();
            localGainNode.connect(controls.gainNode!);
            setLocalGainNode(localGainNode);
        }
    }, []);

    // Whenever mute state changes, set this track’s gain to 0 (muted) or 1 (full level).
    useEffect(() => {
        if (localGainNode) {
            if (muted) localGainNode.gain.value = 0;
            else localGainNode.gain.value = 1;
        }
    }, [muted]);

    return (
        // Outer flex container: left column is track controls, right is the clip timeline; also acts as the drop target for new files.
        <div
            className="flex"
            // Allow the browser to treat this area as a valid drop target so we can handle file drops.
            onDragOver={(e) => { e.preventDefault() }}
            onDragEnter={(e) => { e.preventDefault() }}
            // When files are dropped, decode them, compute start times, and append new clips to this track’s audio list.
            onDrop={async (e) => {
                e.preventDefault();

                if (e.dataTransfer.files) {
                    // Sum duration of all existing clips on this track so new clips start after them on the timeline.
                    let totalTime = track.audio.reduce((prev, currentItem) => prev + currentItem.audioBuffer.duration, 0);
                    // Decode each dropped file into an AudioBuffer and build a clip object with startTime and timestamp for React keys.
                    const newData = await Promise.all(Array.from(e.dataTransfer.files).map(async (file) => {
                        const audioBuffer = await computeAudioBuffer(controls.context!, await file.arrayBuffer());
                        const trackTime = audioBuffer.duration;
                        totalTime += trackTime;
                        return { audioBlob: file, startTime: totalTime - trackTime, audioBuffer: audioBuffer, timestamp: Date.now() };
                    }));
                    // Update global tracks state: replace only this track’s entry and append the new clips to its audio array.
                    setTracks(prev => [
                        ...prev.slice(0, index),
                        {
                            ...prev[index],
                            audio: [
                                ...prev[index].audio,
                                ...newData
                            ]
                        },
                        ...prev.slice(index + 1)
                    ]);
                }
            }}
        >

            {/* Left column: mute button and any other per-track controls. */}
            <div className="flex flex-col items-center justify-center p-2 gap-2">
                {/* Toggle mute on click; the icon switches between Volume1 (on) and VolumeOff (muted). */}
                <Button size="icon" variant="outline" onClick={() => {
                    setMuted(prev => !prev);
                }}>
                    {muted ? <VolumeOffIcon /> : <Volume1Icon />}
                </Button>
            </div>
            {/* Wide clip area: fixed height and very wide width to simulate a long timeline; clicking empty space clears selection. */}
            <div className='relative h-[116px] w-[6000px]' onPointerDown={(e) => { if (e.target == e.currentTarget) setSelectedWaveform(undefined) }}>
                {/* Render one Waveform component per clip; each gets the clip data, updater, track context, gain node, and selection info. */}
                {track.audio.map((item, i) =>
                    <Waveform
                        trackItem={item}
                        // Callback that updates this specific clip in global state by mapping over tracks and then over audio, replacing the clip at (index, i).
                        setTrackItem={(item: TrackItem) => setTracks(prev => prev.map((track, i2) => i2 === index ? { ...track, audio: track.audio.map((audio, i3) => i3 === i ? item : audio) } : track))}
                        track={track}
                        node={localGainNode!}
                        setSelectedWaveform={setSelectedWaveform}
                        selectedWaveform={selectedWaveform}
                        selectionData={{ trackIndex: index, waveformIndex: i } as SelectedWaveform}
                        key={item.timestamp}
                    />)}
            </div>
        </div>
    );
}

export default Track