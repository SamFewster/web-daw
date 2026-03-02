"use client";
import React, { useEffect, useRef, useState } from 'react'
import WavesurferPlayer from "@wavesurfer/react";
import { useControls } from './controls-provider';
import WaveSurfer from 'wavesurfer.js';

const Waveform = ({ audioBlob, node }: { audioBlob: Blob, node: AudioNode }) => {
    const [blobURL, setBlobURL] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const { controls, controlsInterface } = useControls();
    const [wavesurfer, setWavesurfer] = useState<WaveSurfer | null>(null);
    const [track, setTrack] = useState<AudioBufferSourceNode | null>(null);
    const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>();

    useEffect(() => {
        (async () => {
            setAudioBuffer(await controls.context!.decodeAudioData(await audioBlob.arrayBuffer()))
        })();
        const url = URL.createObjectURL(audioBlob);
        setBlobURL(url);
        return () => {
            URL.revokeObjectURL(url);
        }
    }, []);

    useEffect(() => {
        wavesurfer?.setTime(controls.time);
    }, [controls.time]);

    useEffect(() => {
        if (controls.playing != wavesurfer?.isPlaying()) wavesurfer?.playPause();
        if (!controls.playing) track?.stop();
        else {
            (async () => {
                const track = controls.context!.createBufferSource();
                setTrack(track);
                track.buffer = audioBuffer!;
                track.connect(node);

                track.start(0, controls.time);
            })();
        }
    }, [controls.playing]);

    useEffect(() => {
        console.log((controls.zoom / 100) * 20)
        wavesurfer?.zoom((controls.zoom / 100) * 20);
    }, [controls.zoom]);

    useEffect(() => {
        wavesurfer?.zoom((controls.zoom / 100) * 20);
    }, [wavesurfer]);

    return (
        <div onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const seekToTime = (e.clientX - rect.left) / ((controls.zoom / 100) * 20);
            controlsInterface.setControls(prev => ({ ...prev, time: seekToTime, startedPlayingAt: prev.context!.currentTime }));
        }}>
            {blobURL && <audio src={blobURL} ref={audioRef} onLoadedData={(e) => {
                e.currentTarget.volume = 0;
                setLoading(false);
            }} />}
            {!loading && audioRef.current && <WavesurferPlayer
                hideScrollbar
                cursorWidth={0}
                media={audioRef.current}
                height={100}
                barRadius={10}
                waveColor={getComputedStyle(document.documentElement).getPropertyValue('--muted-foreground')}
                progressColor={getComputedStyle(document.documentElement).getPropertyValue('--primary')}
                onReady={(ws) => {
                    setWavesurfer(ws);
                }}
                fillParent={false}
                minPxPerSec={20}
                interact={false}
                onPause={(ws) => {
                    controlsInterface.setControls(prev => ({ ...prev, time: ws.getCurrentTime() }))
                }}
            />}
        </div>
    )
}

export default Waveform