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

    const setPlaying = (value: boolean) => {}

    return (
        <div className="flex">
            <div className="flex flex-col items-center justify-center p-2">
                <Button size="icon" variant="outline" onClick={() => {
                    setMuted(prev => !prev);
                }}>
                    {muted ? <VolumeOffIcon /> : <Volume1Icon /> }
                </Button>
            </div>
            <div>
                {blobURL && <audio src={blobURL} ref={audioRef} onLoadedData={() => {
                    setLoading(false);
                }} />}
                {!loading && audioRef.current && <WavesurferPlayer
                    media={audioRef.current}
                    height={100}
                    waveColor="red"
                    onReady={(ws) => {
                        setWavesurfer(ws);
                    }}
                    fillParent={false}
                    minPxPerSec={(controls.zoom / 100) * 20}
                    onInteraction={(ws) => {
                        setControls(prev => ({ ...prev, time: ws.getCurrentTime() }));
                    }}
                    onPlay={() => { }} 
                    onPause={(ws) => {
                        setPlaying(false);
                        setControls(prev => ({ ...prev, time: ws.getCurrentTime() }))
                    }}
                />}
            </div>
        </div>
    )
}

export default Waveform