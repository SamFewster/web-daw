"use client"
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
    const { controls, controlsInterface } = useControls();

    const { resolvedTheme } = useTheme();

    const [tracks, setTracks] = useState<Track[]>([]);
    const [selectedWaveform, setSelectedWaveform] = useState<SelectedWaveform | undefined>();

    const scrollAreaRef = useRef<HTMLDivElement | null>(null);

    const [eventsHooked, setEventsHooked] = useState<boolean>(false);

    useEffect(() => {
        const dyselxiaPreference = localStorage.getItem("dyselxia-font");
        if (dyselxiaPreference && dyselxiaPreference === "true") {
            document.body.classList.add("dyslexia-friendly");
        } else {
            document.body.classList.remove("dyslexia-friendly");
        }
    }, []);

    useEffect(() => {
        if (controls.context) {
            (async () => {
                const audioElements = ["drums", "bass", "other"]
                for (const element of audioElements) {
                    const response = await axios.get(`/${element}_sample.wav`, { responseType: "blob" });
                    if (response) {
                        const audioBuffer = await computeAudioBuffer(controls.context!, await response.data.arrayBuffer());

                        const audioItemsToAdd = Array.from({ length: 4 }).fill(null).map((_, index) => ({
                            audioBlob: response.data,
                            audioBuffer: audioBuffer,
                            startTime: index * audioBuffer.duration,
                            timestamp: Date.now() + index
                        }));

                        setTracks(prev =>
                            [
                                ...prev,
                                {
                                    audio: audioItemsToAdd,
                                    effects: [],
                                    outputNode: controls.context!.createGain(),
                                    colour: getRandomColour(resolvedTheme!),
                                }
                            ]
                        )
                    }
                }
            })();
        }
    }, [controls.context])

    if (typeof document !== "undefined" && typeof window !== "undefined" && !eventsHooked) {
        document.onkeydown = (e) => {
            switch (e.key) {
                case (" "):
                    e.preventDefault();
                    controlsInterface.playPause();
                    break;
                case (","):
                    controlsInterface.seekTime(-10);
                    break;
                case ("."):
                    controlsInterface.seekTime(+10);
                    break;
                case ("ArrowRight"):
                    e.preventDefault();
                    if (scrollAreaRef.current) {
                        scrollAreaRef.current.scrollTo(Math.min(scrollAreaRef.current.scrollLeft + 50, scrollAreaRef.current.scrollWidth), 0);
                    }
                    break;
                case ("ArrowLeft"):
                    e.preventDefault();
                    if (scrollAreaRef.current) {
                        scrollAreaRef.current.scrollTo(Math.max(scrollAreaRef.current.scrollLeft - 50, 0), 0);
                    }
                    break;
                default:
                    console.log(e.key);
            }
        }
        window.addEventListener("wheel", (e: WheelEvent) => {
            if (e.ctrlKey) {
                e.preventDefault();
                controlsInterface.setControls(prev => ({ ...prev, zoom: Math.max(10, Math.min(prev.zoom + (e.deltaY / 10), 300)) }));
            }
        }, { passive: false })
        setEventsHooked(true);
    }

    return <div className="w-screen h-screen flex flex-col">
        <Navbar tracks={tracks} />
        <div className='w-screen h-screen'>
            <ResizablePanelGroup orientation="vertical">
                <ResizablePanel defaultSize={75}>
                    <ScrollArea
                        className='min-w-full overflow-x-visible flex items-center flex-col text-center min-h-full overflow-hidden relative'
                        ref={scrollAreaRef}
                        onClick={(e) => {
                            if (e.target == e.currentTarget) {
                                setSelectedWaveform(undefined);
                                const rect = e.currentTarget.getBoundingClientRect();
                                const seekToTime = Math.max(0, (e.clientX - rect.left - 68) / ((controls.zoom / 100) * 20));
                                controlsInterface.setControls(prev => ({ ...prev, time: seekToTime, startedPlayingAt: prev.context!.currentTime }));
                            }
                        }}
                        onDragOver={(e) => { e.preventDefault() }}
                        onDragEnter={(e) => { e.preventDefault() }}
                        onDrop={async (e) => {
                            e.preventDefault();

                            if (e.dataTransfer.files && e.target == e.currentTarget || ("classList" in e.target && (e.target.classList as DOMTokenList).contains("include-drop"))) {
                                console.log("hello")
                                let totalTime = 0;
                                const newData = await Promise.all(Array.from(e.dataTransfer.files).map(async (file) => {
                                    // catch any files that aren't audio and ignore them
                                    try {
                                        const audioBuffer = await computeAudioBuffer(controls.context!, await file.arrayBuffer());
                                        const trackTime = audioBuffer.duration;
                                        totalTime += trackTime;
                                        return { audioBlob: file, startTime: totalTime - trackTime, audioBuffer: audioBuffer, timestamp: Date.now() + totalTime };
                                    } catch { }
                                }));
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
                        <WaveformContextMenu selectedWaveform={selectedWaveform} setSelectedWaveform={setSelectedWaveform} tracks={tracks} setTracks={setTracks} />
                        {scrollAreaRef.current && <TimeTracker controls={controls} scrollArea={scrollAreaRef.current} />}
                        <ScrollBar orientation="horizontal" />
                        <div className="px-4 py-2 h-[100px] flex flex-col items-start include-drop">
                            <Button size="icon" variant="outline" onClick={() => {
                                setTracks(prev => [...prev, { audio: [], effects: [], colour: getRandomColour(resolvedTheme!), outputNode: controls.context!.createGain() }]);
                            }}>
                                <PlusIcon />
                            </Button>
                        </div>
                    </ScrollArea>
                </ResizablePanel>
                <ResizableHandle />
                <ResizablePanel minSize={100} defaultSize={25} maxSize={400} className='z-10 bg-background'>
                    <EffectsPanel selectedWaveform={selectedWaveform} tracks={tracks} setTracks={setTracks} />
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    </div >
}

export default Page