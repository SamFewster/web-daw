"use client"
// This file is a client-side React component (it uses browser APIs like `window` and `localStorage`).

import React, { useEffect, useRef, useState } from 'react'
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { useControls } from '@/components/controls-provider';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import TimeTracker from '@/components/time-tracker';
import { computeAudioBuffer, getRandomColour } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import Navbar from '@/components/navbar';
import WaveformContextMenu from '@/components/context-menu';
import EffectsPanel from '@/components/effects-panel';
import { PlusIcon } from 'lucide-react';

const Page = () => {
    // Global transport controls for the DAW (play/pause, time, zoom, AudioContext, etc.)
    const { controls, controlsInterface } = useControls();

    // Current theme (used to pick colours that contrast properly).
    const { resolvedTheme } = useTheme();

    // All tracks in the project. Each track contains audio items + effects + output routing.
    const [tracks, setTracks] = useState<Track[]>([]);
    // Which waveform is currently selected (for context menu / effects editing).
    const [selectedWaveform, setSelectedWaveform] = useState<SelectedWaveform | undefined>();

    // Reference to the scrollable timeline container (used for seeking and keyboard scrolling).
    const scrollAreaRef = useRef<HTMLDivElement | null>(null);

    // We only want to attach global event handlers once.
    const [eventsHooked, setEventsHooked] = useState<boolean>(false);

    useEffect(() => {
        // Read the user preference for a dyslexia-friendly font and apply it to the whole page.
        const dyselxiaPreference = localStorage.getItem("dyselxia-font");
        if (dyselxiaPreference && dyselxiaPreference === "true") {
            document.body.classList.add("dyslexia-friendly");
        } else {
            document.body.classList.remove("dyslexia-friendly");
        }
    }, []);

    useEffect(() => {
        // When the AudioContext exists, preload some built-in sample audio and create tracks for them.
        if (controls.context) {
            (async () => {
                // These are expected to exist in the public folder (e.g. `/drums_sample.wav`).
                const audioElements = ["drums", "bass", "other"]
                for (const element of audioElements) {
                    // Fetch the sample as a Blob so it can be used as a file-like object in the UI.
                    const response = await axios.get(`/${element}_sample.wav`, { responseType: "blob" });
                    if (response) {
                        // Decode the WAV into an AudioBuffer so Web Audio can play it and we know its duration.
                        const audioBuffer = await computeAudioBuffer(controls.context!, await response.data.arrayBuffer());

                        // Create 4 copies of the same audio item, placed end-to-end on the timeline.
                        const audioItemsToAdd = Array.from({ length: 4 }).fill(null).map((_, index) => ({
                            audioBlob: response.data,
                            audioBuffer: audioBuffer,
                            // Place the item on the timeline at `index * duration` seconds.
                            startTime: index * audioBuffer.duration,
                            // A simple unique-ish id for React keys / selection (millisecond timestamp).
                            timestamp: Date.now() + index
                        }));

                        // Add a new track containing those audio items.
                        setTracks(prev =>
                            [
                                ...prev,
                                {
                                    audio: audioItemsToAdd,
                                    // Start with no effects on this track.
                                    effects: [],
                                    // GainNode is used as a track output; effects can route into this later.
                                    outputNode: controls.context!.createGain(),
                                    // Pick a colour for the track (theme-aware).
                                    colour: getRandomColour(resolvedTheme!),
                                }
                            ]
                        )
                    }
                }
            })();
        }
    }, [controls.context])

    // Keyboard shortcuts and mouse-wheel zooming.
    // Note: this runs during render, so we guard it so it only hooks once in the browser.
    if (typeof document !== "undefined" && typeof window !== "undefined" && !eventsHooked) {
        document.onkeydown = (e) => {
            switch (e.key) {
                case (" "):
                    // Space toggles play/pause. Prevent scrolling the page.
                    e.preventDefault();
                    controlsInterface.playPause();
                    break;
                case (","):
                    // Jump backwards 10 seconds.
                    controlsInterface.seekTime(-10);
                    break;
                case ("."):
                    // Jump forwards 10 seconds.
                    controlsInterface.seekTime(+10);
                    break;
                case ("ArrowRight"):
                    // Scroll the timeline view right.
                    e.preventDefault();
                    if (scrollAreaRef.current) {
                        scrollAreaRef.current.scrollTo(Math.min(scrollAreaRef.current.scrollLeft + 50, scrollAreaRef.current.scrollWidth), 0);
                    }
                    break;
                case ("ArrowLeft"):
                    // Scroll the timeline view left.
                    e.preventDefault();
                    if (scrollAreaRef.current) {
                        scrollAreaRef.current.scrollTo(Math.max(scrollAreaRef.current.scrollLeft - 50, 0), 0);
                    }
                    break;
                default:
                    // Debug: log other pressed keys.
                    console.log(e.key);
            }
        }
        window.addEventListener("wheel", (e: WheelEvent) => {
            if (e.ctrlKey) {
                // Ctrl + mouse wheel changes zoom (like many DAWs / editors).
                e.preventDefault();
                // Clamp zoom so it stays usable.
                controlsInterface.setControls(prev => ({ ...prev, zoom: Math.max(10, Math.min(prev.zoom + (e.deltaY / 10), 300)) }));
            }
        }, { passive: false })
        // Mark that we've attached handlers so we don't attach duplicates.
        setEventsHooked(true);
    }

    // Main layout: top navbar + resizable timeline/effects area.
    return <div className="w-screen h-screen flex flex-col">
        <Navbar tracks={tracks} />
        <div className='w-screen h-screen'>
            <ResizablePanelGroup orientation="vertical">
                {/* Upper panel: the timeline / tracks view */}
                <ResizablePanel defaultSize={75}>
                    <ScrollArea
                        // This is the horizontal scrolling "timeline". Most interaction happens inside here.
                        className='min-w-full overflow-x-visible flex items-center flex-col text-center min-h-full overflow-hidden relative'
                        ref={scrollAreaRef}
                        onClick={(e) => {
                            // Clicking empty space deselects and seeks the playhead to the clicked time.
                            if (e.target == e.currentTarget) {
                                setSelectedWaveform(undefined);
                                // Convert click position (pixels) to timeline time (seconds), including scroll offset.
                                const rect = e.currentTarget.getBoundingClientRect();
                                // The `- 68` is an offset to account for left-side UI padding/margins.
                                const seekToTime = Math.max(0, (scrollAreaRef.current!.scrollLeft + e.clientX - rect.left - 68) / ((controls.zoom / 100) * 20));
                                // Update the transport time and record the AudioContext time we started from.
                                controlsInterface.setControls(prev => ({ ...prev, time: seekToTime, startedPlayingAt: prev.context!.currentTime }));
                            }
                        }}
                        // Allow dropping audio files onto the timeline.
                        onDragOver={(e) => { e.preventDefault() }}
                        onDragEnter={(e) => { e.preventDefault() }}
                        onDrop={async (e) => {
                            e.preventDefault();

                            // Only accept drops onto the background, or onto elements explicitly marked to include drop.
                            if (e.dataTransfer.files && e.target == e.currentTarget || ("classList" in e.target && (e.target.classList as DOMTokenList).contains("include-drop"))) {
                                console.log("hello")
                                // `totalTime` is used to place imported files one after another on the new track.
                                let totalTime = 0;
                                // Decode every dropped file into an AudioBuffer (invalid files will become `undefined`).
                                const newData = await Promise.all(Array.from(e.dataTransfer.files).map(async (file) => {
                                    // catch any files that aren't audio and ignore them
                                    try {
                                        const audioBuffer = await computeAudioBuffer(controls.context!, await file.arrayBuffer());
                                        const trackTime = audioBuffer.duration;
                                        totalTime += trackTime;
                                        // Place each clip after the previous one.
                                        return { audioBlob: file, startTime: totalTime - trackTime, audioBuffer: audioBuffer, timestamp: Date.now() + totalTime };
                                    } catch { }
                                }));
                                // Add a new track containing the dropped audio clips.
                                setTracks(prev => [
                                    ...prev,
                                    {
                                        // filter out any undefined items
                                        audio: newData.filter(data => typeof data !== "undefined"),
                                        effects: [],
                                        outputNode: controls.context!.createGain(),
                                        colour: getRandomColour(resolvedTheme!)
                                    }
                                ]);
                            }
                        }}
                    >
                        {/* Right-click context menu for waveform actions (split, delete, etc.). */}
                        <WaveformContextMenu selectedWaveform={selectedWaveform} setSelectedWaveform={setSelectedWaveform} tracks={tracks} setTracks={setTracks} />
                        {/* The moving playhead / time markers (only once the scroll area ref exists). */}
                        {scrollAreaRef.current && <TimeTracker controls={controls} scrollArea={scrollAreaRef.current} />}
                        <ScrollBar orientation="horizontal" />
                        <div className="px-4 py-2 h-[100px] flex flex-col items-start include-drop">
                            <Button size="icon" variant="outline" onClick={() => {
                                // Add a blank track (no audio items yet).
                                setTracks(prev => [...prev, { audio: [], effects: [], colour: getRandomColour(resolvedTheme!), outputNode: controls.context!.createGain() }]);
                            }}>
                                <PlusIcon />
                            </Button>
                        </div>
                    </ScrollArea>
                </ResizablePanel>
                <ResizableHandle />
                {/* Lower panel: effects editor for the selected waveform */}
                <ResizablePanel minSize={100} defaultSize={25} maxSize={400} className='z-10 bg-background'>
                    <EffectsPanel selectedWaveform={selectedWaveform} tracks={tracks} setTracks={setTracks} />
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    </div >
}

export default Page