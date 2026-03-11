"use client";
// This directive tells Next.js that this component must run on the client side.
// It is required because the component uses React hooks (useState, useEffect, etc.)
// which cannot run during server-side rendering.

import React, { useEffect, useRef, useState } from 'react'
// Importing React and specific hooks:
// useState  -> used to store and update state values inside the component
// useEffect -> used to run side effects such as loading audio data
// useRef    -> used to store references to DOM elements (like the <audio> element)

import WavesurferPlayer from "@wavesurfer/react";
// React wrapper around the Wavesurfer.js library which allows visualisation
// of audio waveforms and interaction with them.

import { useControls } from './controls-provider';
// Custom hook which provides global audio control state (play, pause, time, volume, etc.)
// shared between different components.

import WaveSurfer from 'wavesurfer.js';
// Core Wavesurfer library used to generate waveform visualisations.

import { Button } from './ui/button';
// Importing a reusable button component from the project's UI library.

import { Volume1Icon, VolumeOffIcon } from 'lucide-react';
// Importing icons used to visually represent muted/unmuted audio states.


// Defining the Waveform component.
// The component receives a prop called audioBlob which is a Blob containing audio data.
const Waveform = ({ audioBlob }: { audioBlob: Blob }) => {

    // State storing the object URL created from the audio Blob.
    // This URL can be used as a source for the <audio> element.
    const [blobURL, setBlobURL] = useState<string | null>(null);

    // Boolean state used to track whether the audio file is still loading.
    const [loading, setLoading] = useState(true);

    // Reference to the HTML <audio> element.
    // useRef is used because we need direct access to the DOM node.
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Accessing shared control state (play/pause/time/volume/etc.)
    // from the controls provider.
    const { controls, setControls } = useControls();

    // State storing the Wavesurfer instance once it has been created.
    const [wavesurfer, setWavesurfer] = useState<WaveSurfer | null>(null);

    // Boolean state that determines whether the audio output is muted.
    const [muted, setMuted] = useState(false);

    // Stores the current AudioBufferSourceNode used by the Web Audio API.
    // This node is responsible for playing the decoded audio data.
    const [track, setTrack] = useState<AudioBufferSourceNode | null>(null);

    // Stores the decoded audio buffer which contains the raw audio samples.
    const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>();


    // useEffect runs once when the component is first mounted.
    useEffect(() => {

        // Immediately invoked async function used to decode the audio Blob.
        (async () => {

            // Convert the Blob into an ArrayBuffer and decode it into an AudioBuffer.
            // The AudioBuffer is used by the Web Audio API to play the sound.
            setAudioBuffer(
                await controls.context!.decodeAudioData(
                    await audioBlob.arrayBuffer()
                )
            )

        })();

        // If the audio element already exists, set its volume to zero.
        // This prevents the audio from playing twice (once from <audio> and once from Web Audio API).
        if (audioRef.current) {
            audioRef.current.volume = 0;
        }

        // Create a temporary object URL for the audio blob.
        const url = URL.createObjectURL(audioBlob);

        // Log the URL for debugging purposes.
        console.log(url);

        // Save the URL into component state so it can be used by the <audio> element.
        setBlobURL(URL.createObjectURL(audioBlob));

        // Cleanup function executed when the component unmounts.
        // This releases memory used by the object URL.
        return () => {
            URL.revokeObjectURL(url);
        }

    }, []) // Empty dependency array means this runs only once.

    // useEffect triggered when the audio track changes.
    // Ensures the new track is connected to the gain node.
    useEffect(() => {
        if (controls.gainNode && track)
            track.connect(controls.gainNode);
    }, [track])

    // Runs whenever the blobURL changes.
    // Ensures the HTML audio element remains muted.
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = 0;
        }
    }, [blobURL])

    // Handles play/pause logic when the global playing state changes.
    useEffect(() => {
        // If the Wavesurfer playback state differs from the control state,
        // toggle playback so they remain synchronised.
        if (controls.playing != wavesurfer?.isPlaying())
            wavesurfer?.playPause();
        // If playback has stopped, stop the current audio track.
        if (!controls.playing)
            track?.stop();
        else {
            // If playback has started, create a new audio source node.
            (async () => {
                // Create a new buffer source node from the AudioContext.
                const track = controls.context!.createBufferSource();
                // Save it to state.
                setTrack(track);
                // Assign the decoded audio buffer.
                track.buffer = audioBuffer!;
                // Connect the audio source to the final audio destination (speakers).
                track.connect(controls.context!.destination);
                // Start playback at the current global time.
                track.start(0, controls.time);
            })();
        }
    }, [controls.playing])

    // useEffect triggered when the gainNode changes.
    // gainNode controls the volume in the Web Audio API signal chain.
    useEffect(() => {
        if (controls.gainNode && track)
            track.connect(controls.gainNode);
    }, [controls.gainNode])

    // Synchronises the Wavesurfer waveform with the global playback time.
    useEffect(() => {
        wavesurfer?.setTime(controls.time);
    }, [controls.time])

    // Updates the volume whenever the global volume value changes.
    useEffect(() => {
        if (audioRef.current && !muted)
            audioRef.current.volume = controls.volume / 100;
    }, [controls.volume])

    // Handles muting behaviour.
    useEffect(() => {
        // If muted, force the volume to zero.
        if (muted && audioRef.current)
            audioRef.current.volume = 0;
        // Otherwise restore the volume level.
        else if (audioRef.current)
            audioRef.current.volume = controls.volume / 100;
    }, [muted])

    const setPlaying = (value: boolean) => { }
    const setTime = (value: number) => { }

    // JSX returned by the component (UI layout).
    return (

        // Main container using Flexbox layout.
        <div className="flex">

            {/* Container for the mute button */}
            <div className="flex flex-col items-center justify-center p-2">

                <Button
                    size="icon"
                    variant="outline"

                    // Toggle the muted state when clicked.
                    onClick={() => {
                        setMuted(prev => !prev);
                    }}
                >

                    {/* Display different icons depending on mute state */}
                    {muted ? <VolumeOffIcon /> : <Volume1Icon />}

                </Button>

            </div>
            <div>
                {/* Render audio element only when blobURL exists */}
                {blobURL &&
                    <audio
                        src={blobURL}
                        // When the audio has finished loading,
                        ref={audioRef}
                        // update loading state so the waveform can render.
                        onLoadedData={() => {
                            setLoading(false);
                        }}
                    />
                }

                {/* Only render the waveform after the audio is loaded */}
                {!loading && audioRef.current &&

                    <WavesurferPlayer
                        // Attach Wavesurfer to an existing audio element.
                        media={audioRef.current}
                        // Height of waveform visualisation.
                        height={100}
                        // Colour of the waveform.
                        waveColor="red"
                        // Called when Wavesurfer instance has finished initialising.
                        onReady={(ws) => {
                            setWavesurfer(ws);
                        }}
                        // Prevent waveform from filling entire container width.
                        fillParent={false}
                        // Triggered when the user clicks or drags on the waveform.
                        onInteraction={(ws) => {
                            // Update global playback time based on interaction.
                            setTime(ws.getCurrentTime());
                        }}
                        // Placeholder event handler for play.
                        onPlay={() => {
                            // Update playing state.
                            setPlaying(true);
                        }}
                        // Event triggered when playback pauses.
                        onPause={() => {
                            // Update playing state.
                            setPlaying(false);
                        }}
                    />
                }
            </div>
        </div>

    )
}

export default Waveform