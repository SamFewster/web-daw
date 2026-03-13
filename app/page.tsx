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
                            outputNode: controls.context!.createGain(),
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
                        <WaveformContextMenu selectedWaveform={selectedWaveform} setSelectedWaveform={setSelectedWaveform} tracks={tracks} setTracks={setTracks} />
                        <Button onClick={() => {
                            setTracks(prev => [...prev, { audio: [], effects: [], colour: getRandomColour(resolvedTheme!), outputNode: controls.context!.createGain() }]);
                        }}>
                            Add Track
                        </Button>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                </ResizablePanel>
                <ResizableHandle />
                <ResizablePanel minSize={100} defaultSize={25} maxSize={400} className='z-[100]'>
                    <EffectsPanel selectedWaveform={selectedWaveform} tracks={tracks} setTracks={setTracks} />
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    </div >
}

export default Page