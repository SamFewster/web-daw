"use client";
import React, { useEffect, useRef, useState } from 'react'
import WavesurferPlayer from "@wavesurfer/react";
import { useControls } from './controls-provider';
import WaveSurfer from 'wavesurfer.js';
import { Button } from './ui/button';
import { Volume1Icon, VolumeOffIcon } from 'lucide-react';

const Waveform = ({ audioBlob }: { audioBlob: Blob }) => {
    const [blobURL, setBlobURL] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const { controls, setControls } = useControls();
    const [wavesurfer, setWavesurfer] = useState<WaveSurfer | null>(null);
    const [muted, setMuted] = useState(false);
    const [track, setTrack] = useState<AudioBufferSourceNode | null>(null);
    const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>();

    useEffect(() => {
        (async () => {
            setAudioBuffer(await controls.context!.decodeAudioData(await audioBlob.arrayBuffer()))
        })();
        if (audioRef.current) {
            audioRef.current.volume = 0;
        }
        const url = URL.createObjectURL(audioBlob);
        console.log(url);
        setBlobURL(URL.createObjectURL(audioBlob));
        return () => {
            URL.revokeObjectURL(url);
        }
    }, [])

    useEffect(() => {
        if (controls.gainNode && track) track.connect(controls.gainNode);
    }, [controls.gainNode])

    useEffect(() => {
        if (controls.gainNode && track) track.connect(controls.gainNode);
    }, [track])

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = 0;
        }
    }, [blobURL])

    useEffect(() => {
        wavesurfer?.setTime(controls.time);
    }, [controls.time])

    useEffect(() => {
        if (controls.playing != wavesurfer?.isPlaying()) wavesurfer?.playPause();
        if (!controls.playing) track?.stop();
        else {
            (async () => {
                const track = controls.context!.createBufferSource();
                setTrack(track);
                track.buffer = audioBuffer!;
                track.connect(controls.context!.destination);
                track.start(0, controls.time);
            })();
        }
    }, [controls.playing])

    useEffect(() => {
        if (audioRef.current && !muted) audioRef.current.volume = controls.volume / 100;
    }, [controls.volume])

    useEffect(() => {
        if (muted && audioRef.current) audioRef.current.volume = 0;
        else if (audioRef.current) audioRef.current.volume = controls.volume / 100;
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