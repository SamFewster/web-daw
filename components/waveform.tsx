// `use client` declares this component as a client-side React component so it can use hooks and browser APIs.
"use client";

// Import React along with hooks for managing lifecycle (`useEffect`), DOM references (`useRef`), and local state (`useState`).
import React, { useEffect, useRef, useState } from 'react'
// Import the React wrapper around WaveSurfer, which handles rendering and syncing the waveform visualization to audio.
import WavesurferPlayer from "@wavesurfer/react";
// Import the shared controls context hook so this waveform can stay in sync with global playback state.
import { useControls } from './controls-provider';
// Import the core WaveSurfer type for typing the underlying waveform instance managed by the React wrapper.
import WaveSurfer from 'wavesurfer.js';
// Import a reusable button component from the UI library for consistent styling of the mute control.
import { Button } from './ui/button';
// Import volume icons to visually toggle between muted and audible states on this track.
import { Volume1Icon, VolumeOffIcon } from 'lucide-react';

// Waveform represents a single audio track, handling both its visual waveform and its audio routing within the mix.
const Waveform = ({ audioBlob }: { audioBlob: Blob }) => {
    // Local URL representation of the audio blob so the `<audio>` element can stream it without uploading anywhere.
    const [blobURL, setBlobURL] = useState<string | null>(null);
    // Track whether the underlying audio element has finished loading so the waveform is only shown when ready.
    const [loading, setLoading] = useState(true);
    // Ref to the hidden `<audio>` element that WaveSurfer uses as its media source.
    const audioRef = useRef<HTMLAudioElement | null>(null);
    // Pull in the shared playback controls and updater so this track can both respond to and influence global state.
    const { controls, setControls } = useControls();
    // Keep a reference to the WaveSurfer instance so we can imperatively control its time position and playback.
    const [wavesurfer, setWavesurfer] = useState<WaveSurfer | null>(null);
    // Local muted flag for this track, independent of the global master volume.
    const [muted, setMuted] = useState(false);
    // Reference to the current AudioBufferSourceNode responsible for playing this track's decoded audio data.
    const [track, setTrack] = useState<AudioBufferSourceNode | null>(null);
    // Cached decoded audio buffer so the raw audio data can be reused when restarting playback or seeking.
    const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>();
    // Per-track gain node that feeds into the shared master gain node, letting this waveform have its own volume control.
    const [loclaGainNode, setLocalGainNode] = useState<GainNode | null>();

    // On mount, decode the raw audio blob, set up the track's gain node, and create a blob URL for HTML audio playback.
    useEffect(() => {
        // Decode the binary audio content into an `AudioBuffer` that the Web Audio API can play and manipulate.
        (async () => {
            setAudioBuffer(await controls.context!.decodeAudioData(await audioBlob.arrayBuffer()))
        })();
        // If the shared audio context exists, create this track's gain node and route it into the global master gain.
        if (controls.context) {
            const loclaGainNode = controls.context.createGain();
            loclaGainNode.connect(controls.gainNode!);
            setLocalGainNode(loclaGainNode);
        }
        // Build a temporary object URL that the `<audio>` element can use as its `src` without persisting a file.
        const url = URL.createObjectURL(audioBlob);
        console.log(url);
        // Store the blob URL in state so rendering of the `<audio>` tag is deferred until the URL is available.
        setBlobURL(URL.createObjectURL(audioBlob));
        // Cleanup callback revokes the object URL to release browser memory when this component unmounts.
        return () => {
            URL.revokeObjectURL(url);
        }
    }, [])

    // Keep this track's waveform and Web Audio playback aligned when the global playback time changes.
    useEffect(() => {
        // Tell WaveSurfer to visually seek to the new global time so its cursor matches the shared playhead.
        wavesurfer?.setTime(controls.time);
        // If audio is currently playing, rebuild the track's buffer source so it jumps to the updated time position.
        if (track && controls.playing) {
            track.disconnect();

            const newTrack = controls.context!.createBufferSource();
            setTrack(newTrack);
            newTrack.buffer = audioBuffer!;
            newTrack.connect(loclaGainNode!);
            newTrack.start(0, controls.time);
        }
    }, [controls.time])

    // React to global play/pause changes by coordinating WaveSurfer's visual state and the Web Audio source node.
    useEffect(() => {
        // If WaveSurfer's notion of playing does not match global state, toggle it to stay visually consistent.
        if (controls.playing != wavesurfer?.isPlaying()) wavesurfer?.playPause();
        // When playback is stopped globally, halt this track's buffer source so its audio output ceases immediately.
        if (!controls.playing) track?.stop();
        else {
            // When playback starts, create a new buffer source and start it from the current global time position.
            (async () => {
                const track = controls.context!.createBufferSource();
                setTrack(track);
                track.buffer = audioBuffer!;
                track.connect(loclaGainNode!);

                track.start(0, controls.time);
            })();
        }
    }, [controls.playing])

    // When the muted state changes, update the per-track gain node to either fully silence or scale the audio.
    useEffect(() => {
        if (loclaGainNode) {
            // If muted, drop gain to zero so the track contributes nothing to the final mix.
            if (muted) loclaGainNode.gain.value = 0;
            // If not muted, map the shared `volume` control into a normalized Web Audio gain value.
            else loclaGainNode.gain.value = controls.volume / 100;
        }
    }, [muted])

    // Render the track controls and waveform visualization for this audio blob.
    return (
        <div className="flex">
            {/* Left column holds the mute toggle, vertically centered relative to the waveform. */}
            <div className="flex flex-col items-center justify-center p-2">
                {/* Button toggles the local `muted` state, which in turn adjusts the track's gain to zero or normal. */}
                <Button size="icon" variant="outline" onClick={() => {
                    setMuted(prev => !prev);
                }}>
                    {/* Icon switches between speaker and crossed-out speaker to make mute state immediately obvious. */}
                    {muted ? <VolumeOffIcon /> : <Volume1Icon />}
                </Button>
            </div>
            {/* Right section contains the clickable waveform region that also supports scrubbing by mouse. */}
            <div onClick={(e) => {
                // Compute the click's horizontal offset relative to the waveform container to derive a time value.
                const rect = e.currentTarget.getBoundingClientRect();
                const seekToTime = (e.clientX - rect.left) / ((controls.zoom / 100) * 20);
                // Update shared controls with the new playhead time and record when playback started in audio context time. */}
                setControls(prev => ({ ...prev, time: seekToTime, startedPlayingAt: prev.context!.currentTime }));
            }}>
                {/* Only render the `<audio>` tag once a blob URL exists, and mute it so we avoid double playback. */}
                {blobURL && <audio src={blobURL} ref={audioRef} onLoadedData={(e) => {
                    // Force the HTML audio element's volume to zero because audio will be handled via Web Audio instead.
                    e.currentTarget.volume = 0;
                    // Mark loading as complete to allow the waveform visualization to be instantiated.
                    setLoading(false);
                }} />}
                {/* Once the audio element has loaded and a ref exists, mount the WaveSurfer player with that media source. */}
                {!loading && audioRef.current && <WavesurferPlayer
                    // Use the underlying `<audio>` element as WaveSurfer's media backend so it stays in sync with decoding.
                    media={audioRef.current}
                    // Fix the waveform height so each track row has a consistent visual footprint.
                    height={100}
                    // Choose red as the waveform color to make the signal stand out clearly against neutral backgrounds.
                    waveColor="red"
                    // Capture the WaveSurfer instance when it is ready so we can imperatively control and query it.
                    onReady={(ws) => {
                        setWavesurfer(ws);
                    }}
                    // Disable automatic stretching so the waveform width is governed by the zoom configuration instead.
                    fillParent={false}
                    // Translate the global zoom value into pixels-per-second, controlling horizontal detail resolution.
                    minPxPerSec={(controls.zoom / 100) * 20}
                    // Disable direct user interaction on the waveform because scrubbing is handled via the outer click handler.
                    interact={false}
                    // When the user or system pauses playback, push WaveSurfer's current time back into shared controls state.
                    onPause={(ws) => {
                        setControls(prev => ({ ...prev, time: ws.getCurrentTime() }))
                    }}
                />}
            </div>
        </div>
    )
}

// Export the component so other parts of the application can render individual audio tracks with this waveform UI.
export default Waveform