import React, { useEffect, useRef, useState } from 'react'
import Waveform from './waveform'
import { Button } from './ui/button';
import { Volume2Icon, VolumeOffIcon, XIcon } from 'lucide-react';
import { useControls } from './controls-provider';
import { cn, computeAudioBuffer, getRandomColour } from '@/lib/utils';
import { effectDefinitions } from '@/lib/effect-definitions';
import { useTheme } from 'next-themes';

// This component represents one "track lane" in the DAW.
// It:
// - Renders all audio clips (Waveforms) that belong to this track
// - Manages per-track controls (mute, delete track)
// - Connects the Web Audio routing for this track (track output -> effects -> master gain)
// - Accepts drag/drop of audio files to add clips to this track
const Track = ({ track, index, setTracks, setSelectedWaveform, selectedWaveform }: { track: Track, index: number, setTracks: React.Dispatch<React.SetStateAction<Track[]>>, setSelectedWaveform: React.Dispatch<React.SetStateAction<SelectedWaveform | undefined>>, selectedWaveform: SelectedWaveform | undefined }) => {
    // Whether this track is muted (implemented by setting the track's GainNode to 0).
    const [muted, setMuted] = useState(false);
    // Global DAW transport + audio engine references.
    const { controls, controlsInterface } = useControls();
    // Used to regenerate colours when the theme changes (so contrast stays readable).
    const { resolvedTheme } = useTheme();

    // create a reference to the effect nodes that have already been applied to the track, with a key of each effect's timestamp
    // Map<timestamp, AudioNode> is used so we can reuse nodes and update their parameters
    // instead of recreating nodes every render (important for performance and audio stability).
    const effectNodesRef = useRef<Map<number, AudioNode>>(new Map());

    const connectNodes = () => {
        // Rebuild the audio routing graph for this track.
        // The final chain becomes:
        // track.outputNode -> effect1 -> effect2 -> ... -> controls.gainNode (master output)
        //
        // We disconnect everything first, then reconnect in the current effect order.

        // disconnect all nodes
        track.outputNode.disconnect();
        for (const [i, node] of effectNodesRef.current.entries()) {
            node.disconnect();
            // if node has a bypass property (Tuna effect), and it has been removed from the track, set it to true to prevent additional processing
            if ("bypass" in node && !effectNodesRef.current.has(i)) {
                (node as any).bypass = true;
            }
        }

        // start with the track's output node
        let prev: AudioNode = track.outputNode;
        for (const effect of track.effects) {
            // connect each node to each other in order
            const node = effectNodesRef.current.get(effect.timestamp);
            // if the effect's node isn't found, ignore it
            if (!node) continue;
            prev.connect(node);
            prev = node;
        }
        // connect the final node to the master gain node
        prev!.connect(controls.gainNode!);
    }

    useEffect(() => {
        // connect the track's nodes when the component mounts
        // (ensures outputNode is routed into the master output even if there are no effects yet).
        connectNodes();
    }, []);

    useEffect(() => {
        // Whenever the list of effects changes (add/remove/reorder/intensity),
        // update/create nodes and then reconnect the chain.
        for (const effect of track.effects) {
            // find the effect definition from the id in the constant array
            const effectDef = effectDefinitions.find(e => e.id === effect.id)!;

            let node = effectNodesRef.current.get(effect.timestamp);
            if (!node) {
                // if node doesn't already exist, create a new one using the nodeCallback function
                // (nodeCallback returns a Web Audio node configured for this effect).
                node = effectDef.nodeCallback(controls.context!);
            }

            // call the onIntensityChange function with the intensity and node
            // (this updates effect parameters, e.g. filter cutoff, delay time, wet/dry mix).
            effectDef.onIntensityChange(effect.intensity, node);
            // add the node to the map
            effectNodesRef.current.set(effect.timestamp, node);
        }

        // reconnect the nodes once the effects have been updated
        connectNodes();

        // Find any effect nodes that exist in the map but are no longer present in `track.effects`.
        // Those nodes should be disconnected and removed to avoid leaks / CPU usage.
        const removedEffects = Array.from(effectNodesRef.current.keys()).filter(key => !track.effects.find(e => e.timestamp === key)) as number[];
        for (const key of removedEffects) {
            const node = effectNodesRef.current.get(key)!;
            node.disconnect();
            effectNodesRef.current.delete(key);
        }
    }, [track.effects])

    useEffect(() => {
        // Implement mute using the track's GainNode.
        // 0 = silence, 1 = normal volume (no attenuation).
        if (muted) track.outputNode.gain.value = 0;
        else track.outputNode.gain.value = 1;
    }, [muted]);

    useEffect(() => {
        // When theme changes, regenerate the track colour so it still looks good on the new background.
        if (!resolvedTheme) return;
        setTracks(prev => [
            ...prev.slice(0, index),
            {
                ...prev[index],
                // generate a new random colour based on the updated theme 
                colour: getRandomColour(resolvedTheme)
            },
            ...prev.slice(index + 1)
        ]);
    }, [resolvedTheme])

    return (
        <div
            className="flex"
            // Allow dropping audio files onto this track lane.
            onDragOver={(e) => { e.preventDefault() }}
            onDragEnter={(e) => { e.preventDefault() }}
            onDrop={async (e) => {
                e.preventDefault();

                if (e.dataTransfer.files) {
                    // Place new clips after the current total duration of clips on this track.
                    // (Note: this sums durations; it assumes clips are arranged sequentially.)
                    let totalTime = track.audio.reduce((prev, currentItem) => prev + currentItem.audioBuffer.duration, 0);
                    const newData = await Promise.all(Array.from(e.dataTransfer.files).map(async (file) => {
                        // catch any files that aren't audio and ignore them
                        try {
                            const audioBuffer = await computeAudioBuffer(controls.context!, await file.arrayBuffer());
                            const trackTime = audioBuffer.duration;
                            totalTime += trackTime;
                            // Timestamp is used as a stable-ish unique key/identifier for the clip.
                            return { audioBlob: file, startTime: totalTime - trackTime, audioBuffer: audioBuffer, timestamp: Date.now() + totalTime };
                        } catch { }
                    }));
                    // Update just this track (by index) with the newly imported clips appended.
                    setTracks(prev => [
                        ...prev.slice(0, index),
                        {
                            ...prev[index],
                            audio: [
                                ...prev[index].audio,
                                // filter out any undefined items
                                ...newData.filter(item => typeof item !== "undefined")
                            ]
                        },
                        ...prev.slice(index + 1)
                    ]);
                }
            }}
        >

            <div className="flex flex-col items-center justify-center p-2 gap-2 z-[2] mr-2">
                <Button size="icon" variant="outline" onClick={() => {
                    // Toggle mute on/off.
                    setMuted(prev => !prev);
                }}>
                    {muted ? <VolumeOffIcon /> : <Volume2Icon />}
                </Button>
                <Button size="icon" variant="outline" onClick={() => {
                    // Delete this entire track from the project.
                    // Also clear the selection so the UI doesn't point at a removed item.
                    setTracks(prev => [
                        ...prev.slice(0, index),
                        ...prev.slice(index + 1)
                    ]);
                    setSelectedWaveform(undefined);
                }}>
                    <XIcon />
                </Button>
            </div>
            {/* Track lane area where clips are drawn (very wide to allow long timelines). */}
            <div className={cn('relative h-[116px] w-[6000px]', selectedWaveform?.trackIndex === index && "bg-muted")} onPointerDown={(e) => {
                // Clicking empty space on the track selects the track (not a specific clip) and seeks the transport.
                if (e.target == e.currentTarget) {
                    setSelectedWaveform({
                        trackIndex: index,
                        waveformIndex: undefined
                    })
                    const rect = e.currentTarget.getBoundingClientRect();
                    // Convert click position (pixels) to time (seconds) based on current zoom.
                    const seekToTime = Math.max(0, (e.clientX - rect.left) / ((controls.zoom / 100) * 20));
                    // Update transport time and capture when playback would be aligned to AudioContext time.
                    controlsInterface.setControls(prev => ({ ...prev, time: seekToTime, startedPlayingAt: prev.context!.currentTime }));
                }
            }}>
                {/* Render every clip as a Waveform component. */}
                {track.audio.map((item, i) => <Waveform trackItem={item} setTrackItem={(item: TrackItem) => setTracks(prev => prev.map((track, i2) => i2 === index ? { ...track, audio: track.audio.map((audio, i3) => i3 === i ? item : audio) } : track))} track={track} setSelectedWaveform={setSelectedWaveform} selectedWaveform={selectedWaveform} selectionData={{ trackIndex: index, waveformIndex: i } as SelectedWaveform} key={item.timestamp} />)}
            </div>
        </div>
    );
}

export default Track