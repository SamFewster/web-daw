"use client"
import React, { useEffect, useRef, useState } from 'react'
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { useControls } from '@/components/controls-provider';
import { CopyIcon, FastForwardIcon, PauseIcon, PlayIcon, TrashIcon } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import TimeTracker from '@/components/time-tracker';
import Track from '@/components/track';
import { computeAudioBuffer, getRandomColour } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from '@/components/ui/context-menu';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import Navbar from '@/components/navbar';

const Page = () => {
    const { controls, controlsInterface } = useControls();

    const { resolvedTheme } = useTheme();

    const [tracks, setTracks] = useState<Track[]>([]);
    const [selectedWaveform, setSelectedWaveform] = useState<SelectedWaveform | undefined>();

    const scrollAreaRef = useRef<HTMLDivElement | null>(null);

    const [eventsHooked, setEventsHooked] = useState<boolean>(false);


    useEffect(() => {
        if (controls.context) {
            (async () => {
                const response = await axios.get("/sample3.flac", { responseType: "blob" });
                if (response) {
                    const audioBuffer = await computeAudioBuffer(controls.context!, await response.data.arrayBuffer());
                    setTracks(
                        [{
                            audio: [{
                                audioBlob: response.data,
                                audioBuffer: audioBuffer,
                                startTime: 0,
                                timestamp: Date.now(),
                            }],
                            effects: [],
                            colour: getRandomColour(resolvedTheme!),
                        }]
                    )
                }
            })();
        }
    }, [controls.context])

    if (typeof document !== "undefined" && typeof window !== "undefined" && !eventsHooked) {
        document.onkeydown = (e) => {
            switch (e.key) {
                case (" "):
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
                controlsInterface.setControls(prev => ({ ...prev, zoom: Math.max(prev.zoom + (e.deltaY / 10), 100) }));
            }
        }, { passive: false })
        setEventsHooked(true);
    }

    return <div className="w-screen h-screen flex flex-col">
        <Navbar />
        <div className='w-screen h-screen'>
            <ResizablePanelGroup orientation="vertical">
                <ResizablePanel defaultSize={75}>
                    <ScrollArea className='min-w-full overflow-x-visible flex items-center flex-col text-center min-h-full' ref={scrollAreaRef}>
                        {scrollAreaRef.current && <TimeTracker controls={controls} scrollArea={scrollAreaRef.current} />}
                        <ContextMenu>
                            <ContextMenuTrigger className="flex flex-col gap-1 h-full p-2 w-full" onContextMenu={(e) => {
                                if (!selectedWaveform) {
                                    e.preventDefault()
                                }
                            }}>
                                {tracks.map((track, i) => (
                                    <Track track={track} index={i} setTracks={setTracks} setSelectedWaveform={setSelectedWaveform} selectedWaveform={selectedWaveform} key={i} />
                                ))}
                            </ContextMenuTrigger>
                            <ContextMenuContent>
                                <ContextMenuItem onClick={() => {
                                    if (!selectedWaveform) return;
                                    let timeToAddAudio = 0;
                                    for (const audio of tracks[selectedWaveform.trackIndex].audio) {
                                        const endTime = audio.startTime + audio.audioBuffer.duration;
                                        if (endTime > timeToAddAudio) timeToAddAudio = endTime;
                                    }
                                    setTracks(prev => [
                                        ...prev.slice(0, selectedWaveform.trackIndex),
                                        {
                                            ...prev[selectedWaveform.trackIndex],
                                            audio: [
                                                ...prev[selectedWaveform.trackIndex].audio,
                                                {
                                                    ...prev[selectedWaveform.trackIndex].audio[selectedWaveform.waveformIndex],
                                                    startTime: timeToAddAudio,
                                                    timestamp: Date.now()
                                                }
                                            ]
                                        },
                                        ...prev.slice(selectedWaveform.trackIndex + 1)
                                    ]);
                                }}>
                                    <CopyIcon className='stroke-primary' />
                                    Duplicate
                                </ContextMenuItem>
                                <ContextMenuSeparator />
                                <ContextMenuItem variant='destructive' onClick={() => {
                                    if (!selectedWaveform) return;
                                    setTracks(prev => [
                                        ...prev.slice(0, selectedWaveform.trackIndex),
                                        {
                                            ...prev[selectedWaveform.trackIndex],
                                            audio: [
                                                ...prev[selectedWaveform.trackIndex].audio.filter((_, i) => i !== selectedWaveform.waveformIndex)
                                            ]
                                        },
                                        ...prev.slice(selectedWaveform.trackIndex + 1)
                                    ]);
                                }}>
                                    <TrashIcon />
                                    Delete
                                </ContextMenuItem>
                            </ContextMenuContent>
                        </ContextMenu>
                        <Button onClick={() => {
                            setTracks(prev => [...prev, { audio: [], effects: [], colour: getRandomColour(resolvedTheme!) }]);
                        }}>
                            Add Track
                        </Button>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                </ResizablePanel>
                <ResizableHandle />
                <ResizablePanel defaultSize={25} maxSize={400} className='z-[100]'>
                    Effects
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    </div >
}

export default Page