"use client";
import React, { useEffect, useRef, useState } from 'react'
import WavesurferPlayer from "@wavesurfer/react";
import { useControls } from './controls-provider';
import WaveSurfer from 'wavesurfer.js';
import { EPSILON } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useTheme } from 'next-themes';

// fix pausing and going back one audio item

const Waveform = ({ trackItem, setTrackItem, track, setSelectedWaveform, selectionData, selectedWaveform }: { trackItem: TrackItem, setTrackItem: (item: TrackItem) => void, track: Track, setSelectedWaveform: React.Dispatch<React.SetStateAction<SelectedWaveform | undefined>>, selectedWaveform: SelectedWaveform | undefined, selectionData: SelectedWaveform }) => {
    const [blobURL, setBlobURL] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [ready, setReady] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const { controls, controlsInterface } = useControls();
    const { resolvedTheme } = useTheme();
    const [wavesurfer, setWavesurfer] = useState<WaveSurfer | null>(null);
    const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

    const queuedPlayTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

    const [left, setLeft] = useState(trackItem.startTime * ((controls.zoom / 100) * 20));
    const dragging = useRef(false);
    const startX = useRef(0);
    const startLeft = useRef(trackItem.startTime * ((controls.zoom / 100) * 20));

    const disconnectSourceNode = () => {
        sourceNodeRef.current?.disconnect();
        sourceNodeRef.current = null;
    }

    const getCurrentTime = () => (controls.playing ? controls.time + (controls.context!.currentTime - controls.startedPlayingAt) : controls.time);

    const testTimeToPlay = (startTime = trackItem.startTime) => {
        const currentTime = getCurrentTime();
        const endTimeExceeded = currentTime >= (startTime + trackItem.audioBuffer.duration);
        const startTimeNotMet = currentTime < (startTime);
        if (endTimeExceeded) return -1;
        if (startTimeNotMet) return 1;
        return 0;
    };

    const connectSourceNode = () => {
        disconnectSourceNode();
        const newTrack = controls.context!.createBufferSource();
        sourceNodeRef.current = newTrack;
        newTrack.buffer = trackItem.audioBuffer;
        newTrack.connect(track.outputNode);
        return newTrack;
    };

    const queuePlayingWaveform = (time: number) => {
        return setTimeout(() => {
            if (controls.playing) wavesurfer?.play();
            if (!controls.playing) disconnectSourceNode();
        }, time);
    }

    const setupWaveformPlayer = (startTime = trackItem.startTime) => {
        if (queuedPlayTimeoutRef.current) clearTimeout(queuedPlayTimeoutRef.current);
        disconnectSourceNode();
        const playingTest = testTimeToPlay(startTime);
        if (playingTest == 0) {
            const currentTime = getCurrentTime();
            wavesurfer?.setTime(currentTime - trackItem.startTime);
            // if (controls.playing != wavesurfer?.isPlaying()) wavesurfer?.playPause();
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

            wavesurfer?.setTime(0);
            wavesurfer?.pause();

            if (controls.playing) {
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
    }, [controls.playing, controls.time, controls.startedPlayingAt, trackItem.startTime]);

    useEffect(() => {
        wavesurfer?.zoom((controls.zoom / 100) * 20);
        setLeft(trackItem.startTime * ((controls.zoom / 100) * 20));
    }, [controls.zoom]);

    useEffect(() => {
        wavesurfer?.zoom((controls.zoom / 100) * 20);
    }, [wavesurfer]);

    const [waveformColors, setWaveformColors] = useState<{ wave: string, progress: string }>({
        wave: getComputedStyle(document.documentElement).getPropertyValue('--muted-foreground'),
        progress: getComputedStyle(document.documentElement).getPropertyValue('--primary')
    });

    useEffect(() => {
        // wait for css variables to change, then update the waveform colors
        setTimeout(() => {
            setWaveformColors({
                wave: getComputedStyle(document.documentElement).getPropertyValue('--muted-foreground'),
                progress: getComputedStyle(document.documentElement).getPropertyValue('--primary')
            });
        }, 10);
    }, [resolvedTheme]);

    return (
        <div
            style={{ left: left, backgroundColor: track.colour, minWidth: `${trackItem.audioBuffer.duration * ((controls.zoom / 100) * 20)}px` }}
            className={cn('py-2 rounded-md cursor-move absolute top-0 ring-2',
                selectedWaveform?.trackIndex == selectionData.trackIndex && selectedWaveform?.waveformIndex == selectionData.waveformIndex ? "ring-primary z-2" : "ring-muted-foreground/40",
                "transition-opacity duration-300 ease-in-out",
                loading ? "opacity-0" : "opacity-100",
            )}
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
                {!loading && audioRef.current &&
                    <div className={cn('transition-opacity duration-300 ease-in-out', ready ? "opacity-100" : "opacity-0")}>
                        <WavesurferPlayer
                            hideScrollbar
                            cursorWidth={0}
                            media={audioRef.current}
                            height={100}
                            barRadius={10}
                            waveColor={waveformColors.wave}
                            progressColor={waveformColors.progress}
                            onReady={(ws) => {
                                setWavesurfer(ws);
                                setReady(true);
                            }}
                            fillParent={false}
                            minPxPerSec={20}
                            interact={false}
                        />
                    </div>
                }
            </div>
        </div>
    )
}

export default Waveform