"use client";
import React, { useEffect, useRef, useState } from 'react'
import WavesurferPlayer from "@wavesurfer/react";
import { useControls } from './controls-provider';
import WaveSurfer from 'wavesurfer.js';

const Waveform = ({ trackItem, node }: { trackItem: TrackItem, node: AudioNode }) => {
    const [blobURL, setBlobURL] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const { controls, controlsInterface } = useControls();
    const [wavesurfer, setWavesurfer] = useState<WaveSurfer | null>(null);
    const [track, setTrack] = useState<AudioBufferSourceNode | null>(null);
    const audioContextRef = useRef<AudioContext | null>(controls.context);

    const getCurrentTime = () => (controls.time + (controls.context!.currentTime - controls.startedPlayingAt));

    const isTimeToPlay = () => (testTimeToPlay() == 0);

    const testTimeToPlay = () => {
        const EPSILON = 1e-3; // 1 millisecond tolerance
        const currentTime = getCurrentTime();
        const endTimeExceeded = currentTime >= (trackItem.startTime + trackItem.audioBuffer.duration - EPSILON);
        const startTimeNotMet = currentTime < (trackItem.startTime + EPSILON);
        if (trackItem.startTime == 0) {
            console.log(`time diff: ${Math.f16round(trackItem.startTime + trackItem.audioBuffer.duration) - currentTime}`)
            console.log(`current time: ${Math.f16round(currentTime)}`)
            console.log(`end time: ${Math.f16round(trackItem.startTime + trackItem.audioBuffer.duration)}`)
        }
        if (endTimeExceeded) return -1;
        if (startTimeNotMet) return 1;
        return 0;
    };

    useEffect(() => {
        const url = URL.createObjectURL(trackItem.audioBlob);
        setBlobURL(url);
        return () => {
            URL.revokeObjectURL(url);
        }
    }, []);

    useEffect(() => {
        const playingTest = testTimeToPlay();
        if (playingTest == 0) {
            if (isTimeToPlay() && controls.playing != wavesurfer?.isPlaying()) wavesurfer?.playPause();
            if (!controls.playing) track?.stop();
            else {
                (async () => {
                    track?.stop();
                    const newTrack = controls.context!.createBufferSource();
                    setTrack(newTrack);
                    newTrack.buffer = trackItem.audioBuffer;
                    newTrack.connect(node);

                    newTrack.start(0, Math.f16round(controls.time) - Math.f16round(trackItem.startTime));
                })();
            }
        } else if (playingTest == -1) {
            wavesurfer?.pause();
            wavesurfer?.setTime(trackItem.audioBuffer.duration);
        } else if (playingTest == 1) {
            wavesurfer?.pause
            wavesurfer?.setTime(0);
        }
    }, [controls.playing, controls.time]);

    useEffect(() => {
        console.log((controls.zoom / 100) * 20)
        wavesurfer?.zoom((controls.zoom / 100) * 20);
    }, [controls.zoom]);

    useEffect(() => {
        wavesurfer?.zoom((controls.zoom / 100) * 20);
    }, [wavesurfer]);

    useEffect(() => {
        const playingTest = testTimeToPlay();
        if (playingTest == 0) wavesurfer?.setTime(controls.time - trackItem.startTime);
        else if (playingTest == -1) {
            wavesurfer?.pause();
            wavesurfer?.setTime(trackItem.audioBuffer.duration);
            track?.stop();
        } else if (playingTest == 1) {
            wavesurfer?.setTime(0);
            track?.stop();
        }
    }, [controls.time]);

    return (
        <div onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const seekToTime = (e.clientX - rect.left) / ((controls.zoom / 100) * 20);
            controlsInterface.setControls(prev => ({ ...prev, time: seekToTime + trackItem.startTime, startedPlayingAt: prev.context!.currentTime }));
            wavesurfer?.setTime(seekToTime - trackItem.startTime);
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
                onFinish={() => {
                    wavesurfer?.pause();
                    wavesurfer?.setTime(trackItem.audioBuffer.duration);
                }}
                onPause={(ws) => {
                    const playingTest = testTimeToPlay();
                    console.log(`firing test result: ${playingTest}, start time: ${trackItem.startTime}`);
                    if (playingTest == 0) controlsInterface.setControls(prev => ({ ...prev, time: ws.getCurrentTime() + trackItem.startTime }));
                }}
            />}
        </div>
    )
}

export default Waveform