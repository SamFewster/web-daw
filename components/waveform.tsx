"use client";
// This component renders a single draggable audio "clip" with a waveform preview.
// It keeps the visual waveform (WaveSurfer) in sync with the project transport (play/pause/time/zoom),
// and schedules actual audio playback using the Web Audio API.

import React, { useEffect, useRef, useState } from 'react'
import WavesurferPlayer from "@wavesurfer/react";
import { useControls } from './controls-provider';
import WaveSurfer from 'wavesurfer.js';
import { cn } from "@/lib/utils";
import { useTheme } from 'next-themes';

const Waveform = ({ trackItem, setTrackItem, track, setSelectedWaveform, selectionData, selectedWaveform }: { trackItem: TrackItem, setTrackItem: (item: TrackItem) => void, track: Track, setSelectedWaveform: React.Dispatch<React.SetStateAction<SelectedWaveform | undefined>>, selectedWaveform: SelectedWaveform | undefined, selectionData: SelectedWaveform }) => {
    // Object URL for the clip's Blob/File so `<audio>` can load it.
    const [blobURL, setBlobURL] = useState<string | null>(null);
    // Loading flags used to fade the waveform in once ready.
    const [loading, setLoading] = useState(true);
    const [ready, setReady] = useState(false);
    // Reference to the hidden `<audio>` element WaveSurfer reads from.
    const audioRef = useRef<HTMLAudioElement | null>(null);
    // Global DAW transport and its helper methods.
    const { controls, controlsInterface } = useControls();
    // Theme is used for waveform colours (via CSS variables).
    const { resolvedTheme } = useTheme();
    // WaveSurfer instance used to render and control the waveform UI.
    const [wavesurfer, setWavesurfer] = useState<WaveSurfer | null>(null);
    // Web Audio node used to actually play sound (separate from the WaveSurfer UI).
    const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

    // If a clip starts in the future, we queue playback using a timeout; keep a ref so we can cancel it.
    const queuedPlayTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

    // `left` is the clip's x-position in pixels (time → pixels depends on zoom).
    const [left, setLeft] = useState(trackItem.startTime * ((controls.zoom / 100) * 20));
    // Pointer-drag state: stored in refs so it doesn't rerender on every move.
    const dragging = useRef(false);
    const startX = useRef(0);
    const startLeft = useRef(trackItem.startTime * ((controls.zoom / 100) * 20));

    const disconnectSourceNode = () => {
        // Stop routing audio from this clip into the track output.
        sourceNodeRef.current?.disconnect();
        sourceNodeRef.current = null;
    }

    // Current transport time in seconds.
    // If playing, we add how much AudioContext time has elapsed since playback started.
    const getCurrentTime = () => (controls.playing ? controls.time + (controls.context!.currentTime - controls.startedPlayingAt) : controls.time);

    const testTimeToPlay = (startTime = trackItem.startTime) => {
        // Decide whether this clip should be playing at the current transport time:
        // -1 = transport is after the end (clip finished)
        //  0 = transport is within the clip (should play)
        //  1 = transport is before the clip starts (should wait)
        const currentTime = getCurrentTime();
        const endTimeExceeded = currentTime >= (startTime + trackItem.audioBuffer.duration);
        const startTimeNotMet = currentTime < (startTime);
        if (endTimeExceeded) return -1;
        if (startTimeNotMet) return 1;
        return 0;
    };

    const connectSourceNode = () => {
        // Create a new AudioBufferSourceNode (these are one-shot; you cannot "restart" the same node).
        disconnectSourceNode();
        const newTrack = controls.context!.createBufferSource();
        sourceNodeRef.current = newTrack;
        newTrack.buffer = trackItem.audioBuffer;
        // Route audio into the track output node (which may have effects applied elsewhere).
        newTrack.connect(track.outputNode);
        return newTrack;
    };

    const queuePlayingWaveform = (time: number) => {
        // Delay starting the WaveSurfer UI so it visually begins when the audio is scheduled to start.
        return setTimeout(() => {
            if (controls.playing) wavesurfer?.play();
            // If playback was cancelled while waiting, also disconnect the audio source.
            if (!controls.playing) disconnectSourceNode();
        }, time);
    }

    const setupWaveformPlayer = (startTime = trackItem.startTime) => {
        // Bring this clip into the correct play state for the current transport time.
        // This function is called when transport state changes OR when the clip is moved.
        if (queuedPlayTimeoutRef.current) clearTimeout(queuedPlayTimeoutRef.current);
        disconnectSourceNode();
        const playingTest = testTimeToPlay(startTime);
        if (playingTest == 0) {
            // Transport is inside the clip: set the waveform UI position and start/pause based on transport.
            const currentTime = getCurrentTime();
            wavesurfer?.setTime(currentTime - trackItem.startTime);
            // if (controls.playing != wavesurfer?.isPlaying()) wavesurfer?.playPause();
            if (controls.playing) {
                const newTrack = connectSourceNode();

                // Play immediately, starting from the correct offset within the AudioBuffer.
                newTrack.start(0, getCurrentTime() - startTime);
                wavesurfer?.play();
            } else {
                wavesurfer?.pause();
            }
        } else if (playingTest == -1) {
            // Transport is after the clip: snap waveform to the end and ensure it isn't playing.
            wavesurfer?.pause();
            wavesurfer?.setTime(trackItem.audioBuffer.duration);
        } else if (playingTest == 1) {
            // Transport is before the clip starts: reset waveform to the beginning.

            wavesurfer?.setTime(0);
            wavesurfer?.pause();

            if (controls.playing) {
                // If the project is playing, schedule the audio source to start in the future.
                const newTrack = connectSourceNode();

                console.log(1)
                const currentTime = getCurrentTime();
                // Schedule absolute start time in AudioContext time so it stays accurate.
                newTrack.start((startTime - currentTime) + controls.context!.currentTime, 0);

                if (queuedPlayTimeoutRef.current) clearTimeout(queuedPlayTimeoutRef.current);
                // Also queue the WaveSurfer UI to begin at the same moment (using milliseconds for setTimeout).
                const timeout = queuePlayingWaveform((startTime - currentTime) * 1000);
                queuedPlayTimeoutRef.current = timeout;

                return () => {
                    clearTimeout(timeout);
                }
            }
        }
    }

    useEffect(() => {
        // Convert the Blob/File into an object URL once on mount.
        const url = URL.createObjectURL(trackItem.audioBlob);
        setBlobURL(url);
        return () => {
            // Cleanup the object URL to avoid memory leaks.
            URL.revokeObjectURL(url);
        }
    }, []);

    useEffect(() => {
        // Re-sync this clip any time transport state changes or the clip moves / waveform loads.
        setupWaveformPlayer();
        return () => {
            // Cleanup any scheduled audio/timeouts on unmount or before re-running.
            disconnectSourceNode();
            if (queuedPlayTimeoutRef.current) clearTimeout(queuedPlayTimeoutRef.current);
        }
    }, [controls.playing, controls.time, controls.startedPlayingAt, trackItem.startTime, wavesurfer]);

    useEffect(() => {
        // When zoom changes, update WaveSurfer's internal zoom and recalculate clip pixel position.
        wavesurfer?.zoom((controls.zoom / 100) * 20);
        setLeft(trackItem.startTime * ((controls.zoom / 100) * 20));
    }, [controls.zoom]);

    useEffect(() => {
        // When the WaveSurfer instance is first ready, apply current zoom.
        wavesurfer?.zoom((controls.zoom / 100) * 20);
    }, [wavesurfer]);

    const [waveformColors, setWaveformColors] = useState<{ wave: string, progress: string }>({
        // Read CSS variables so waveform matches the app theme.
        wave: getComputedStyle(document.documentElement).getPropertyValue('--waveform-secondary'),
        progress: getComputedStyle(document.documentElement).getPropertyValue('--background')
    });

    useEffect(() => {
        // wait for css variables to change, then update the waveform colors
        setTimeout(() => {
            setWaveformColors({
                wave: getComputedStyle(document.documentElement).getPropertyValue('--waveform-secondary'),
                progress: getComputedStyle(document.documentElement).getPropertyValue('--background')
            });
        }, 10);
    }, [resolvedTheme]);

    return (
        <div
            // Position and size are time-based: start time sets `left`, duration sets width.
            style={{ left: left, backgroundColor: track.colour, minWidth: `${trackItem.audioBuffer.duration * ((controls.zoom / 100) * 20)}px` }}
            className={cn('py-2 rounded-md cursor-move absolute top-0 ring-2',
                // Highlight if this clip is the selected one.
                selectedWaveform?.trackIndex == selectionData.trackIndex && selectedWaveform?.waveformIndex == selectionData.waveformIndex ? "ring-primary" : "ring-muted-foreground/30",
                "transition-opacity duration-300 ease-in-out",
                // Fade in after the audio is loaded so WaveSurfer doesn't pop in abruptly.
                loading ? "opacity-0" : "opacity-100",
            )}
            onPointerDown={(e) => {
                // Start dragging this clip.
                setSelectedWaveform(selectionData);
                dragging.current = true;
                startX.current = e.clientX;
                startLeft.current = left;
                // Capture the pointer so we keep receiving move events even if cursor leaves the element.
                (e.target as HTMLDivElement).setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
                // Only process drag logic while dragging.
                if (!dragging.current) return;

                // Delta x in pixels since drag started.
                const dx = e.clientX - startX.current;
                // Proposed new left position (can't go before 0).
                const newLeft = Math.max(startLeft.current + dx, 0);
                // Convert pixels back into seconds.
                const newStartTime = newLeft / ((controls.zoom / 100) * 20);

                // Find the closest clip that ends before this one starts (to prevent overlap).
                const prev = track.audio
                    .filter(item => item !== trackItem && (item.startTime + item.audioBuffer.duration) <= trackItem.startTime)
                    .reduce((prevItem: TrackItem | null, item: TrackItem) => {
                        if (!prevItem) return item;
                        return (item.startTime + item.audioBuffer.duration) > (prevItem.startTime + prevItem.audioBuffer.duration) ? item : prevItem;
                    }, null);

                // Find the closest clip that starts after this one ends (to prevent overlap).
                const next = track.audio
                    .filter(item => item !== trackItem && item.startTime >= (trackItem.startTime + trackItem.audioBuffer.duration))
                    .reduce((nextItem: TrackItem | null, item: TrackItem) => {
                        if (!nextItem) return item;
                        return item.startTime < nextItem.startTime ? item : nextItem;
                    }, null);

                // Allowed range for this clip start time, based on neighbouring clips.
                const minStartTime = prev ? prev.startTime + prev.audioBuffer.duration : 0;
                const maxStartTime = next ? next.startTime - trackItem.audioBuffer.duration : Infinity;

                // Clamp the clip so it cannot overlap with its neighbours.
                const clampedStartTime = Math.max(minStartTime, Math.min(newStartTime, maxStartTime));
                const clampedLeft = clampedStartTime * ((controls.zoom / 100) * 20);

                // Update UI position and persist the new start time back to the parent track data.
                setLeft(clampedLeft);
                setTrackItem({ ...trackItem, startTime: clampedStartTime });

                // While dragging, keep the waveform UI aligned to the transport time.
                wavesurfer?.setTime(getCurrentTime() - clampedStartTime);
                // Re-evaluate scheduling (important if we drag a clip across the playhead).
                setupWaveformPlayer(clampedStartTime);
            }}
            onPointerUp={() => {
                // Finish dragging.
                dragging.current = false;
            }}
        >
            <div className="cursor-default" onClick={(e) => {
                // Clicking inside a clip seeks within that clip.
                const rect = e.currentTarget.getBoundingClientRect();
                // Convert click x-position into seconds within the clip.
                const seekToTime = Math.max(0, (e.clientX - rect.left) / ((controls.zoom / 100) * 20));
                // Set transport time to clip start + offset, and store when we started (for play sync).
                controlsInterface.setControls(prev => ({ ...prev, time: seekToTime + trackItem.startTime, startedPlayingAt: prev.context!.currentTime }));
                if (seekToTime > trackItem.startTime) {
                    // Keep WaveSurfer UI time in sync with the seek.
                    wavesurfer?.setTime(seekToTime - trackItem.startTime);
                }
            }}>
                {/* Hidden audio element provides decoded audio data to WaveSurfer. */}
                {blobURL && <audio src={blobURL} ref={audioRef} onLoadedData={(e) => {
                    // Mute the <audio> so it never outputs sound (Web Audio handles real playback).
                    e.currentTarget.volume = 0;
                    setLoading(false);
                }} />}
                {!loading && audioRef.current &&
                    <div className={cn('transition-opacity duration-300 ease-in-out z-[-1]', ready ? "opacity-100" : "opacity-0")}>
                        <WavesurferPlayer
                            hideScrollbar
                            // No playhead cursor inside each waveform; the global playhead is elsewhere.
                            cursorWidth={0}
                            media={audioRef.current}
                            height={100}
                            barRadius={10}
                            waveColor={waveformColors.wave}
                            progressColor={waveformColors.progress}
                            onReady={(ws) => {
                                // Store the WaveSurfer instance so we can call methods like play/pause/setTime/zoom.
                                setWavesurfer(ws);
                                setReady(true);
                                // Ensure initial sync once the waveform is fully ready.
                                setupWaveformPlayer();
                            }}
                            // We control the width ourselves so time→pixels stays consistent.
                            fillParent={false}
                            // Minimum pixels-per-second baseline (also scaled via `zoom(...)`).
                            minPxPerSec={20}
                            // Disable user interaction inside WaveSurfer (we handle clicks/drag ourselves).
                            interact={false}
                        />
                    </div>
                }
            </div>
        </div>
    )
}

export default Waveform