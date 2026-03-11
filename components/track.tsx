// This React component represents a single audio track in the DAW, responsible for its own mute state, gain routing, and display of audio clips.
import React, { useEffect, useState } from 'react'
// Waveform renders a visual representation and playback controls for individual audio clips belonging to this track.
import Waveform from './waveform'
// Button is a shared UI component that provides consistent styling and interaction behavior for clickable controls.
import { Button } from './ui/button';
// These icons visually indicate whether the track is currently audible or muted, improving affordance for the mute toggle.
import { Volume1Icon, VolumeOffIcon } from 'lucide-react';
// useControls exposes the global audio context and shared nodes, allowing each track to hook into the central audio graph.
import { useControls } from './controls-provider';
// computeAudioBuffer decodes raw file data into a Web Audio API AudioBuffer, which can then be scheduled and analyzed.
import { computeAudioBuffer } from '@/lib/utils';

// Track receives its model (`track`), its position (`index`), and a setter to update the overall list of tracks, giving it local control over its own data slice.
const Track = ({ track, index, setTracks }: { track: Track, index: number, setTracks: React.Dispatch<React.SetStateAction<Track[]>> }) => {
    // `muted` tracks whether this specific track should be audible, independent from any global mute or solo logic.
    const [muted, setMuted] = useState(false);
    // `localGainNode` is this track's own gain stage in the Web Audio graph, allowing per-track volume control before hitting the master bus.
    const [localGainNode, setLocalGainNode] = useState<GainNode | null>();
    // `controls` provides access to the shared AudioContext and the global gain node that all tracks ultimately feed into.
    const { controls } = useControls();

    // On mount, we create a dedicated GainNode for this track (if the audio context is available) and connect it to the shared master gain node.
    useEffect(() => {
        if (controls.context) {
            // Creating the GainNode here isolates this track's volume adjustments from other tracks while still sharing the same AudioContext.
            const localGainNode = controls.context.createGain();
            // By routing this track gain into `controls.gainNode`, we ensure all tracks still pass through a central master output for global control.
            localGainNode.connect(controls.gainNode!);
            // Storing the GainNode in state makes it accessible to children (like `Waveform`) and to other effects in this component.
            setLocalGainNode(localGainNode);
        }
        // The empty dependency array ensures the gain node is only created once per component lifecycle, mirroring a "constructor" behavior.
    }, []);

    // Whenever the `muted` state changes, we update the gain value on the track's GainNode to either fully silence or fully pass through audio.
    useEffect(() => {
        if (localGainNode) {
            // Setting gain to 0 effectively mutes the track without disconnecting nodes, avoiding pops or graph reconfiguration overhead.
            if (muted) localGainNode.gain.value = 0;
            // A gain of 1 restores the track to its original volume, acting as a simple on/off gate rather than a continuous volume fader.
            else localGainNode.gain.value = 1;
        }
        // `muted` is the only dependency because the GainNode instance is stable after creation, so we only care about mute toggles here.
    }, [muted]);

    // The returned JSX defines both the track's drop zone for adding audio and its mute controls plus waveform visualizations.
    return (
        <div
            // The outer container uses flex layout so the mute button column and waveform area sit horizontally side by side.
            className="flex"
            // Preventing default on drag-over is required to allow dropping files into this element in most browsers.
            onDragOver={(e) => { e.preventDefault() }}
            // Preventing default on drag-enter keeps the browser from trying to treat the dragged files as navigational content.
            onDragEnter={(e) => { e.preventDefault() }}
            // When files are dropped onto this track, we interpret them as new audio clips to append to the existing timeline.
            onDrop={async (e) => {
                e.preventDefault();

                // We only proceed if the drag operation actually contains one or more files, ignoring other data types like text or URLs.
                if (e.dataTransfer.files) {
                    // `totalTime` accumulates the duration of all existing audio clips so new clips can be placed sequentially after them.
                    let totalTime = track.audio.reduce((prev, currentItem) => prev + currentItem.audioBuffer.duration, 0);
                    // For each dropped file we asynchronously decode it into an AudioBuffer and compute its start time based on cumulative duration.
                    const newData = await Promise.all(Array.from(e.dataTransfer.files).map(async (file) => {
                        // `computeAudioBuffer` uses the shared AudioContext to decode the file's raw bytes into a playable AudioBuffer.
                        const audioBuffer = await computeAudioBuffer(controls.context!, await file.arrayBuffer());
                        // The duration of this buffer determines how far `totalTime` should advance along the track timeline.
                        const trackTime = audioBuffer.duration;
                        // We extend the running total so the next clip starts immediately after this one ends, forming a continuous sequence.
                        totalTime += trackTime;
                        // Each clip object records both the original file and its decoded buffer plus an absolute start time within the track.
                        return { audioBlob: file, startTime: totalTime - trackTime, audioBuffer: audioBuffer }
                    }));
                    // We immutably update the tracks array so React can detect changes, replacing only the current track entry at `index`.
                    setTracks(prev => [
                        // Preserve all tracks before this one to avoid disturbing their state or order.
                        ...prev.slice(0, index),
                        {
                            // Copy the existing track so we retain metadata and any previously attached clips.
                            ...prev[index],
                            // The `audio` array is extended with the new clips, keeping existing ones in place for non-destructive editing.
                            audio: [
                                ...prev[index].audio,
                                ...newData
                            ]
                        }
                        // Implicitly, tracks after this one remain unchanged because we are not touching indices beyond `index`.
                    ]);

                }
            }}
        >

            {/* This column groups the mute button and any future track-level controls vertically, centered for easy access. */}
            <div className="flex flex-col items-center justify-center p-2 gap-2">
                {/* The button toggles the `muted` state, acting as the user-facing on/off switch for this track's audio. */}
                <Button size="icon" variant="outline" onClick={() => {
                    // We invert the previous `muted` value so the same control both mutes and unmutes without separate handlers.
                    setMuted(prev => !prev);
                }}>
                    {/* The icon reflects the current mute state, providing immediate visual feedback and reinforcing the toggle's meaning. */}
                    {muted ? <VolumeOffIcon /> : <Volume1Icon />}
                </Button>
            </div>
            {/* For each audio clip on this track we render a `Waveform`, wiring it to this track's GainNode so all playback respects the mute state. */}
            {track.audio.map((item, i) => <Waveform trackItem={item} node={localGainNode!} key={i} />)}
        </div>
    );
}

// Exporting `Track` as the default makes it easy to import and use in track lists or higher-level DAW layout components.
export default Track