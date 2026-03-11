"use client";
// This component runs entirely on the client, because it relies on browser-only APIs like the Web Audio API and DOM access.
import React, { useEffect, useRef, useState } from 'react'
// `WavesurferPlayer` provides a React wrapper around WaveSurfer.js, handling waveform rendering and playback visualization.
import WavesurferPlayer from "@wavesurfer/react";
// `useControls` exposes shared playback state (time, zoom, playing flag, audio context) and a setter for coordinating between components.
import { useControls } from './controls-provider';
// The core WaveSurfer instance is used for imperative control like zooming and seeking.
import WaveSurfer from 'wavesurfer.js';

// `Waveform` represents a single audio clip on a track, handling both its visual waveform and synchronized playback with the global transport.
const Waveform = ({ trackItem, node }: { trackItem: TrackItem, node: AudioNode }) => {
    // `blobURL` is a browser-generated URL pointing to the in-memory audio blob for use in a regular `<audio>` element.
    const [blobURL, setBlobURL] = useState<string | null>(null);
    // `loading` tracks whether the underlying `<audio>` element has fully loaded enough metadata to initialize WaveSurfer correctly.
    const [loading, setLoading] = useState(true);
    // `audioRef` holds a reference to the HTMLAudioElement that WaveSurfer will bind to as its media source.
    const audioRef = useRef<HTMLAudioElement | null>(null);
    // `controls` is the current global playback state, and `controlsInterface` exposes setters to update that state from this component.
    const { controls, controlsInterface } = useControls();
    // `wavesurfer` holds the imperative WaveSurfer instance so we can call methods like `zoom`, `play`, and `setTime`.
    const [wavesurfer, setWavesurfer] = useState<WaveSurfer | null>(null);
    // `sourceNodeRef` points to the Web Audio `AudioBufferSourceNode` that actually plays this clip through the audio graph.
    const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
    // `queuedPlayTimeoutRef` tracks a pending timeout used to start WaveSurfer playback at the precise future time when the clip should begin.
    const queuedPlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // EPSILON is a tiny offset used to guard against floating-point precision errors when comparing time boundaries.
    const EPSILON = 1e-3;

    // `getCurrentTime` computes the effective global playhead time by combining the stored `controls.time` with how long the context has been running.
    const getCurrentTime = () => (controls.time + (controls.context!.currentTime - controls.startedPlayingAt));

    // Helper function indicating that the global transport is currently inside this clip's active playback window.
    const isTimeToPlay = () => (testTimeToPlay() == 0);

    // `testTimeToPlay` returns -1 if the clip is finished, 1 if it has not started yet, and 0 if the playhead is within its duration.
    const testTimeToPlay = (startTime = trackItem.startTime) => {
        const currentTime = getCurrentTime();
        // `endTimeExceeded` becomes true once the playhead has advanced slightly beyond the clip's end, accounting for EPSILON margin.
        const endTimeExceeded = currentTime - EPSILON >= (startTime + trackItem.audioBuffer.duration);
        // `startTimeNotMet` is true if the playhead has not yet reached this clip's scheduled start time.
        const startTimeNotMet = currentTime - EPSILON < (startTime);
        // Returning -1 signals that the clip should be treated as completed and no longer audible.
        if (endTimeExceeded) return -1;
        // Returning 1 indicates the clip is in the future and should be queued rather than played immediately.
        if (startTimeNotMet) return 1;
        // Returning 0 means the clip should currently be playing and visually progressing.
        return 0;
    };

    // When the component mounts, we create a temporary URL for the audio blob and clean it up when the component unmounts.
    useEffect(() => {
        // `createObjectURL` lets us use the blob as a source for `<audio>` without uploading it or writing it to disk.
        const url = URL.createObjectURL(trackItem.audioBlob);
        setBlobURL(url);
        // On unmount we revoke the URL to free up memory and avoid leaking blob references.
        return () => {
            URL.revokeObjectURL(url);
        }
    }, []);

    // `connectSourceNode` prepares a new AudioBufferSourceNode for this clip and connects it into the provided `node` in the audio graph.
    const connectSourceNode = () => {
        // We disconnect any previous source node to avoid multiple overlapping nodes feeding the same clip audio.
        sourceNodeRef.current?.disconnect();
        // A fresh buffer source is created from the shared audio context so playback can be precisely scheduled.
        const newTrack = controls.context!.createBufferSource();
        sourceNodeRef.current = newTrack;
        // The buffer for this source is the decoded audio data associated with the current clip (`trackItem`).
        newTrack.buffer = trackItem.audioBuffer;
        // We connect the source into the provided `node`, which is typically the track's gain node for per-track volume control.
        newTrack.connect(node);
        // Returning the node allows callers to immediately schedule `start` calls with fine-grained timing control.
        return newTrack;
    };

    // `queuePlayingWaveform` schedules a future sync between WaveSurfer's visual playback and the Web Audio source based on a millisecond delay.
    const queuePlayingWaveform = (time: number) => {
        return setTimeout(() => {
            // If the playhead has actually reached the clip window, we ensure WaveSurfer's play state matches the global `controls.playing` flag.
            if (testTimeToPlay() == 0 && controls.playing != wavesurfer?.isPlaying()) wavesurfer?.playPause();
            // If playback has stopped globally, we defensively stop the underlying AudioBufferSourceNode to avoid stray audio.
            if (!controls.playing) sourceNodeRef.current?.stop();
        }, time);
    }

    // This effect reacts to changes in global `playing` state or transport time, orchestrating when and how the clip should start or stop.
    useEffect(() => {
        // Always disconnect any existing source node before recalculating scheduling to avoid duplicate playback.
        sourceNodeRef.current?.disconnect();
        // `playingTest` determines whether the clip is currently active, finished, or still in the future relative to the transport.
        const playingTest = testTimeToPlay(trackItem.startTime);
        if (playingTest == 0) {
            // If we are inside the clip window, make sure WaveSurfer's notion of play/pause matches the global `controls.playing` state.
            if (testTimeToPlay() == 0 && controls.playing != wavesurfer?.isPlaying()) wavesurfer?.playPause();
            if (controls.playing) {
                // When globally playing, we create and start a new source node positioned at the correct offset into the clip.
                const newTrack = connectSourceNode();
                // Starting at `getCurrentTime() - startTime` ensures the audio aligns exactly with the global transport position, even after seeking.
                newTrack.start(0, getCurrentTime() - trackItem.startTime + EPSILON);
                // We also trigger WaveSurfer's visual playback so the waveform scroll matches what we hear.
                wavesurfer?.play();
            } else {
                // If the transport is paused, the visual waveform should also pause to freeze the cursor at the current position.
                wavesurfer?.pause();
            }
        } else if (playingTest == -1) {
            // For a clip that has finished, we pause WaveSurfer and snap the cursor to the end to communicate completion.
            wavesurfer?.pause();
            wavesurfer?.setTime(trackItem.audioBuffer.duration);
        } else if (playingTest == 1) {
            // For a clip in the future, we reset WaveSurfer to the beginning and keep it paused until playback should begin.
            wavesurfer?.pause();
            wavesurfer?.setTime(0);

            if (controls.playing && node) {
                // If the global transport is playing and this clip is upcoming, we create its source node now to schedule a precise future start.
                const newTrack = connectSourceNode();

                const currentTime = getCurrentTime();
                // We schedule the source to start when the global AudioContext time reaches the clip's absolute start moment.
                newTrack.start((trackItem.startTime - currentTime) + controls.context!.currentTime, 0);

                // If we had a previously queued timeout to sync WaveSurfer, we clear it so we do not fire multiple timers.
                if (queuedPlayTimeoutRef.current) clearTimeout(queuedPlayTimeoutRef.current);
                // This timeout will fire right when the clip should start, at which point we align the WaveSurfer playback state.
                const timeout = queuePlayingWaveform((trackItem.startTime - currentTime) * 1000);
                queuedPlayTimeoutRef.current = timeout;

                // Cleanup ensures the timeout is cancelled if dependencies change before it fires, preventing stale callbacks from running.
                return () => {
                    clearTimeout(timeout);
                }
            }
        }
    }, [controls.playing, controls.time]);

    // When the zoom level changes, we adjust WaveSurfer's min pixels per second so the visual density of the waveform matches the zoom factor.
    useEffect(() => {
        console.log((controls.zoom / 100) * 20)
        wavesurfer?.zoom((controls.zoom / 100) * 20);
    }, [controls.zoom]);

    // When the WaveSurfer instance is first created, we apply the current zoom setting so it starts consistent with the global state.
    useEffect(() => {
        wavesurfer?.zoom((controls.zoom / 100) * 20);
    }, [wavesurfer]);

    // This effect keeps WaveSurfer's internal playhead position and source node connectivity synchronized with the global transport time.
    useEffect(() => {
        const playingTest = testTimeToPlay();
        // If the playhead is inside this clip, we set WaveSurfer's time relative to the clip's own start offset.
        if (playingTest == 0) wavesurfer?.setTime(controls.time - trackItem.startTime);
        else if (playingTest == -1) {
            // When the clip is past its end, we pause and pin the cursor at the tail to show that nothing more will play here.
            wavesurfer?.pause();
            wavesurfer?.setTime(trackItem.audioBuffer.duration);
            // Disconnecting the source node ensures no lingering audio nodes remain after the clip has completed.
            sourceNodeRef.current?.disconnect();
        } else if (playingTest == 1) {
            // If the clip is still in the future, we reset the visual cursor and also disconnect any stray source nodes.
            wavesurfer?.setTime(0);
            sourceNodeRef.current?.disconnect();
        }
    }, [controls.time]);

    // The rendered output includes a clickable container for scrubbing and, once loaded, both an `<audio>` element and a WaveSurfer visualization.
    return (
        <div onClick={(e) => {
            // We compute the click's horizontal offset within the waveform container to interpret it as a scrub position.
            const rect = e.currentTarget.getBoundingClientRect();
            // `seekToTime` converts the click position (in pixels) into a time value using the current zoom scaling factor.
            const seekToTime = (e.clientX - rect.left) / ((controls.zoom / 100) * 20);
            // Updating global `time` and `startedPlayingAt` lets the entire DAW jump to this new position in a transport-consistent way.
            controlsInterface.setControls(prev => ({ ...prev, time: seekToTime + trackItem.startTime, startedPlayingAt: prev.context!.currentTime }));
            // We also tell WaveSurfer to seek locally so the visual cursor aligns with the new logical playhead.
            wavesurfer?.setTime(seekToTime - trackItem.startTime);
        }}>
            {blobURL && <audio src={blobURL} ref={audioRef} onLoadedData={(e) => {
                // We silence the underlying `<audio>` element because the actual audible output comes from the Web Audio graph, not this tag.
                e.currentTarget.volume = 0;
                // Once metadata is loaded, we can safely initialize WaveSurfer and render the visual waveform.
                setLoading(false);
            }} />}
            {!loading && audioRef.current && <WavesurferPlayer
                // Hiding the scrollbar keeps the waveform visually clean and emphasizes the clip itself over the scroller UI.
                hideScrollbar
                // Cursor width of 0 disables WaveSurfer's own vertical playhead line in favor of your custom interaction model.
                cursorWidth={0}
                // `media` tells WaveSurfer which audio element to use as its playback source.
                media={audioRef.current}
                // The height determines how tall the waveform appears, balancing detail with vertical space in the track lane.
                height={100}
                // Rounded bars soften the visual style of the waveform, making it feel more polished and less jagged.
                barRadius={10}
                // `waveColor` uses a CSS variable so the waveform respects the app's current theme and design system.
                waveColor={getComputedStyle(document.documentElement).getPropertyValue('--muted-foreground')}
                // If the clip starts later on the timeline, we color its progress differently to visually distinguish offset clips from base ones.
                progressColor={trackItem.startTime > 0 ? "red" : getComputedStyle(document.documentElement).getPropertyValue('--primary')}
                // `onReady` runs when WaveSurfer has finished initializing and is safe to control programmatically.
                onReady={(ws) => {
                    // We store the WaveSurfer instance so subsequent effects can call methods like `zoom` and `setTime`.
                    setWavesurfer(ws);
                }}
                // Disabling `fillParent` lets the waveform width be controlled explicitly rather than automatically stretching to its container.
                fillParent={false}
                // `minPxPerSec` is the baseline horizontal scale for time, which we modulate further using zoom.
                minPxPerSec={20}
                // `interact={false}` prevents WaveSurfer's built-in mouse interactions so our own click handler defines the scrubbing behavior.
                interact={false}
                // When the waveform playback finishes, we pause and snap the cursor to the exact end to reflect that the clip is done.
                onFinish={() => {
                    wavesurfer?.pause();
                    wavesurfer?.setTime(trackItem.audioBuffer.duration);
                }}
                // `onPause` is triggered whenever WaveSurfer stops, giving us a moment to sync the global transport time if appropriate.
                onPause={(ws) => {
                    const playingTest = testTimeToPlay();
                    console.log(`firing test result: ${playingTest}, start time: ${trackItem.startTime}`);
                    // If the pause occurs while the clip is active, we propagate the local waveform time back into the shared global `time` state.
                    if (playingTest == 0) controlsInterface.setControls(prev => ({ ...prev, time: ws.getCurrentTime() + trackItem.startTime }));
                }}
            />}
        </div>
    )
}

// Exporting `Waveform` as default allows track components to render clip waveforms without needing named imports.
export default Waveform