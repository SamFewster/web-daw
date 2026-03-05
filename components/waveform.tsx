"use client";
import React, { useEffect, useRef, useState } from 'react'
import WavesurferPlayer from "@wavesurfer/react";
import { useControls } from './controls-provider';
import WaveSurfer from 'wavesurfer.js';
import { EPSILON } from "@/lib/constants";
import { cn } from "@/lib/utils";

const Waveform = ({ trackItem, setTrackItem, track, node, setSelectedWaveform, selectionData, selectedWaveform }: { trackItem: TrackItem, setTrackItem: (item: TrackItem) => void, track: Track, node: AudioNode, setSelectedWaveform: React.Dispatch<React.SetStateAction<SelectedWaveform | undefined>>, selectedWaveform: SelectedWaveform | undefined, selectionData: SelectedWaveform }) => {
    const [blobURL, setBlobURL] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const { controls, controlsInterface } = useControls();
    const [wavesurfer, setWavesurfer] = useState<WaveSurfer | null>(null);
    const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

    const queuedPlayTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

    const [left, setLeft] = useState(trackItem.startTime * ((controls.zoom / 100) * 20));
    const dragging = useRef(false);
    const startX = useRef(0);
    const startLeft = useRef(trackItem.startTime * ((controls.zoom / 100) * 20));

    const getCurrentTime = () => (controls.playing ? controls.time + (controls.context!.currentTime - controls.startedPlayingAt) : controls.time);

    const testTimeToPlay = (startTime = trackItem.startTime) => {
        const currentTime = getCurrentTime();
        const endTimeExceeded = currentTime - EPSILON >= (startTime + trackItem.audioBuffer.duration);
        const startTimeNotMet = currentTime - EPSILON < (startTime);
        if (endTimeExceeded) return -1;
        if (startTimeNotMet) return 1;
        return 0;
    };

    const connectSourceNode = () => {
        sourceNodeRef.current?.disconnect();
        const newTrack = controls.context!.createBufferSource();
        sourceNodeRef.current = newTrack;
        newTrack.buffer = trackItem.audioBuffer;
        newTrack.connect(node);
        return newTrack;
    };

    const queuePlayingWaveform = (time: number) => {
        return setTimeout(() => {
            if (testTimeToPlay() == 0 && controls.playing != wavesurfer?.isPlaying()) wavesurfer?.playPause();
            if (!controls.playing) sourceNodeRef.current?.stop();
        }, time);
    }

    const setupWaveformPlayer = (startTime = trackItem.startTime) => {
        sourceNodeRef.current?.disconnect();
        const playingTest = testTimeToPlay(startTime);
        if (playingTest == 0) {
            if (testTimeToPlay() == 0 && controls.playing != wavesurfer?.isPlaying()) wavesurfer?.playPause();
            if (controls.playing) {
                const newTrack = connectSourceNode();

                newTrack.start(0, getCurrentTime() - startTime + EPSILON);
                wavesurfer?.play();
            } else {
                wavesurfer?.pause();
            }
        } else if (playingTest == -1) {
            wavesurfer?.pause();
            wavesurfer?.setTime(trackItem.audioBuffer.duration);
        } else if (playingTest == 1) {
            wavesurfer?.pause();
            wavesurfer?.setTime(0);

            if (controls.playing && node) {
                const newTrack = connectSourceNode();

                const currentTime = getCurrentTime();
                newTrack.start((startTime - currentTime) + controls.context!.currentTime, 0);

                if (queuedPlayTimeoutRef.current) clearTimeout(queuedPlayTimeoutRef.current);
                const timeout = queuePlayingWaveform((startTime - currentTime) * 1000);
                queuedPlayTimeoutRef.current = timeout;

                return () => {
                    clearTimeout(timeout);
                }
            }
        }
    }

    useEffect(() => {
        const url = URL.createObjectURL(trackItem.audioBlob);
        setBlobURL(url);
        return () => {
            URL.revokeObjectURL(url);
        }
    }, []);

    useEffect(() => {
        setupWaveformPlayer();
    }, [controls.playing, controls.time]);

    useEffect(() => {
        wavesurfer?.zoom((controls.zoom / 100) * 20);
        setLeft(trackItem.startTime * ((controls.zoom / 100) * 20));
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
            sourceNodeRef.current?.disconnect();
        } else if (playingTest == 1) {
            wavesurfer?.setTime(0);
            sourceNodeRef.current?.disconnect();
        }
    }, [controls.time]);

    return (
        <div
            style={{ left: left, backgroundColor: track.colour }} className={cn('py-2 rounded-md cursor-move absolute top-0 ring-2', selectedWaveform?.trackIndex == selectionData.trackIndex && selectedWaveform?.waveformIndex == selectionData.waveformIndex ? "ring-primary z-2" : "ring-muted-foreground/40")}
            onPointerDown={(e) => {
                setSelectedWaveform(selectionData);
                dragging.current = true;
                startX.current = e.clientX;
                startLeft.current = left;
                (e.target as HTMLDivElement).setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
                if (!dragging.current) return;

                const dx = e.clientX - startX.current;
                const newLeft = Math.max(startLeft.current + dx, 0);
                const newStartTime = newLeft / ((controls.zoom / 100) * 20);

                // Get neighbors
                const prev = track.audio
                    .filter(item => item !== trackItem && (item.startTime + item.audioBuffer.duration) <= trackItem.startTime)
                    .reduce((prevItem: TrackItem | null, item: TrackItem) => {
                        if (!prevItem) return item;
                        return (item.startTime + item.audioBuffer.duration) > (prevItem.startTime + prevItem.audioBuffer.duration) ? item : prevItem;
                    }, null);

                // Find the closest waveform that starts after this one
                const next = track.audio
                    .filter(item => item !== trackItem && item.startTime >= (trackItem.startTime + trackItem.audioBuffer.duration))
                    .reduce((nextItem: TrackItem | null, item: TrackItem) => {
                        if (!nextItem) return item;
                        return item.startTime < nextItem.startTime ? item : nextItem;
                    }, null);

                const minStartTime = prev ? prev.startTime + prev.audioBuffer.duration : 0;
                const maxStartTime = next ? next.startTime - trackItem.audioBuffer.duration : Infinity;

                const clampedStartTime = Math.max(minStartTime, Math.min(newStartTime, maxStartTime));
                const clampedLeft = clampedStartTime * ((controls.zoom / 100) * 20);

                setLeft(clampedLeft);
                setTrackItem({ ...trackItem, startTime: clampedStartTime });

                wavesurfer?.setTime(getCurrentTime() - clampedStartTime);
                setupWaveformPlayer(clampedStartTime);
            }}
            onPointerUp={() => {
                dragging.current = false;
            }}
        >
            <div className="cursor-default" onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const seekToTime = Math.max(0, (e.clientX - rect.left) / ((controls.zoom / 100) * 20));
                controlsInterface.setControls(prev => ({ ...prev, time: seekToTime + trackItem.startTime, startedPlayingAt: prev.context!.currentTime }));
                if (seekToTime > trackItem.startTime) {
                    wavesurfer?.setTime(seekToTime - trackItem.startTime);
                }
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
                        sourceNodeRef.current?.disconnect();
                    }}
                />}
            </div>
        </div>
    )
}

export default Waveform