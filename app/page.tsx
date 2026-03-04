"use client"
import React, { useEffect, useRef, useState } from 'react'
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { useControls } from '@/components/controls-provider';
import { FastForwardIcon, PauseIcon, PlayIcon } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import TimeTracker from '@/components/time-tracker';
import Track from '@/components/track';
import { computeAudioBuffer } from '@/lib/utils';

const Page = () => {
    const { controls, controlsInterface } = useControls();

    const [tracks, setTracks] = useState<Track[]>([]);

    const scrollAreaRef = useRef<HTMLDivElement | null>(null);

    const [eventsHooked, setEventsHooked] = useState<boolean>(false);

    useEffect(() => {
        const context = new AudioContext();
        const gainNode = context.createGain();
        gainNode.connect(context.destination);
        controlsInterface.setControls(prev => ({ ...prev, context, gainNode }));
        (async () => {
            const response = await axios.get("/sample2.flac", { responseType: "blob" });
            if (response) {
                const audioBuffer = await computeAudioBuffer(context, await response.data.arrayBuffer());
                setTracks(
                    [{
                        audio: [{
                            audioBlob: response.data,
                            audioBuffer: audioBuffer,
                            startTime: 0,
                        }],
                        effects: []
                    }]
                )
            }
        })();
    }, [])

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
        <div className="w-screen bg-muted flex items-center justify-between p-2 z-[2]">
            <div className="flex flex-col gap-2 items-center jusitfy-center text-center">
                <p className='text-sm'>Zoom</p>
                <Slider value={[controls.zoom]} min={1} max={200} className="w-[200px]" onValueChange={(value) => controlsInterface.setControls(prev => ({ ...prev, zoom: value[0] }))} />
            </div>
            <div className="flex gap-2 justify-center items-center">
                <Button variant="outline" size="icon" onKeyDown={(e) => e.preventDefault()} onClick={() => controlsInterface.seekTime(-10)}>
                    <FastForwardIcon className="rotate-180" />
                </Button>
                <Button variant="outline" size="icon" onKeyDown={(e) => e.preventDefault()} onClick={() => controlsInterface.playPause()}>
                    {controls.playing ? <PauseIcon /> : <PlayIcon />}
                </Button>
                <Button variant="outline" size="icon" onKeyDown={(e) => e.preventDefault()} onClick={() => controlsInterface.seekTime(+10)}>
                    <FastForwardIcon />
                </Button>
            </div>
            <div className="flex flex-col gap-2 items-center jusitfy-center text-center">
                <p className='text-sm'>Volume</p>
                <Slider min={0} max={100} defaultValue={[50]} className="w-[200px]" onValueChange={(value) => {
                    if (controls.gainNode) {
                        controls.gainNode.gain.value = value[0] / 100;
                    }
                }} />
            </div>
        </div>
        <div className='w-screen h-screen'>
            <ScrollArea className='min-w-full overflow-x-visible flex items-center flex-col text-center min-h-full' ref={scrollAreaRef}>
                {scrollAreaRef.current && <TimeTracker controls={controls} scrollArea={scrollAreaRef.current} />}
                <div className="flex flex-col gap-1 w-full h-full p-2">
                    {/* {audioFiles.map((file, i) => (
                        <Waveform audioBlob={file} key={i} />
                    ))} */}
                    {tracks.map((track, i) => (
                        <Track track={track} index={i} setTracks={setTracks} key={i} />
                    ))}
                </div>
                <Button onClick={() => {
                    setTracks(prev => [...prev, {
                        audio: [],
                        effects: []
                    }])
                }}>
                    Add Track
                </Button>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
        </div>
    </div>
}

export default Page