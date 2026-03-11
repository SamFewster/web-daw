// `use client` marks this file as a client-side component in Next.js, enabling hooks and browser APIs.
"use client"

// Import React along with `useEffect` for side effects and `useState` for managing local component state.
import React, { useEffect, useState } from 'react'
// Import `axios` to perform HTTP requests, here used to fetch the default audio sample as binary data.
import axios from 'axios'
// Import the `Waveform` component responsible for rendering the visual waveform and handling per-track playback.
import Waveform from '@/components/waveform';
// Import a styled `Button` component from the UI library to keep controls visually consistent.
import { Button } from '@/components/ui/button';
// Import playback control helpers and the shared controls context hook to coordinate audio state across the app.
import { playPause, seekTime, useControls } from '@/components/controls-provider';
// Import icon components to visually communicate play, pause, and skip actions in the transport controls.
import { FastForwardIcon, PauseIcon, PlayIcon } from 'lucide-react';
// Import a generic `Slider` UI component used for both zoom level and master volume adjustments.
import { Slider } from '@/components/ui/slider';
// Import scrollable container components that allow horizontally overflowing waveforms to be navigated.
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

// Top-level page component that wires together the audio engine, keyboard shortcuts, and timeline UI.
const Page = () => {
    // Pull the shared `controls` state and its updater from a context so multiple components can stay in sync.
    const { controls, setControls } = useControls();

    // Keep track of all audio files currently loaded into the session, including both defaults and user drops.
    const [audioFiles, setAudioFiles] = useState<File[]>([]);

    // On initial mount, set up the Web Audio graph and pre-load a default audio sample for demonstration.
    useEffect(() => {
        // Create a single shared AudioContext instance that will drive all audio playback in this page.
        const context = new AudioContext();
        // Create a GainNode to act as a master volume control on the final mix bus.
        const gainNode = context.createGain();
        // Connect the gain node directly to the audio hardware output so it affects everything downstream.
        gainNode.connect(context.destination);
        // Store the audio context and gain node into the shared controls state so other components can use them.
        setControls(prev => ({ ...prev, context, gainNode }));
        // Immediately-invoked async function to fetch the default audio asset without making `useEffect` itself async.
        (async () => {
            // Request the example FLAC file as a binary blob so it can be treated like a user-provided file.
            const response = await axios.get("/sample4.flac", { responseType: "blob" });
            // If the request succeeded, seed the session with multiple copies of the sample to show stacked tracks.
            if (response) setAudioFiles([...Array(5).fill("").map(() => (response.data))]);
        })();
        // Empty dependency array ensures this audio initialization code only runs once for the lifetime of the page.
    }, [])

    // Attach global keyboard handlers only when running in a browser so that playback can be driven without the mouse.
    if (typeof document !== "undefined") {
        // Register a single keydown listener that interprets space and comma/period as transport shortcuts.
        document.onkeydown = (e) => {
            // Use a switch for clarity so it is easy to extend with more shortcuts later if needed.
            switch (e.key) {
                // Space bar toggles between playing and paused states, mirroring typical media player behavior.
                case (" "):
                    playPause(setControls);
                    break;
                // Comma jumps the playback position backwards by a fixed number of seconds for quick rewinds.
                case (","):
                    seekTime(setControls, -10);
                    break;
                // Period jumps the playback position forwards by the same interval to quickly scan ahead.
                case ("."):
                    seekTime(setControls, +10);
                    break;
                // For unhandled keys, log the value to the console to aid experimentation with new shortcuts.
                default:
                    console.log(e.key);
            }
        }
    }

    // Render the full-page layout containing the transport controls toolbar and the scrollable waveform region.
    return <div className="w-screen h-screen flex flex-col">
        {/* Top toolbar spans the full width and holds zoom, transport, and volume controls. */}
        <div className="w-screen bg-muted/50 flex items-center justify-between p-2">
            {/* Zoom control column centered to make the relationship between label and slider visually clear. */}
            <div className="flex flex-col gap-2 items-center jusitfy-center text-center">
                {/* Text label identifies the slider as changing the horizontal zoom level of the waveforms. */}
                <p className='text-sm'>Zoom</p>
                {/* Slider drives the `zoom` property in shared controls, which downstream components use to scale views. */}
                <Slider value={[controls.zoom]} min={1} max={100} className="w-[200px]" onValueChange={(value) => setControls(prev => ({ ...prev, zoom: value[0] }))} />
            </div>
            {/* Central section containing the core transport controls used for navigation and playback. */}
            <div className="flex gap-2 justify-center items-center">
                {/* Backward seek button moves the playhead left, with keyboard events suppressed to avoid double triggers. */}
                <Button variant="outline" size="icon" onKeyDown={(e) => e.preventDefault()} onClick={() => seekTime(setControls, -10)}>
                    {/* Rotated fast-forward icon visually communicates a rewind operation using the same base graphic. */}
                    <FastForwardIcon className="rotate-180" />
                </Button>
                {/* Play/pause toggle button uses shared control state to reflect and manipulate the current playback mode. */}
                <Button variant="outline" size="icon" onKeyDown={(e) => e.preventDefault()} onClick={() => playPause(setControls)}>
                    {/* Conditionally render pause or play icon so the user gets immediate feedback on the current state. */}
                    {controls.playing ? <PauseIcon /> : <PlayIcon />}
                </Button>
                {/* Forward seek button steps the playhead to the right, symmetric to the rewind button on the left. */}
                <Button variant="outline" size="icon" onKeyDown={(e) => e.preventDefault()} onClick={() => seekTime(setControls, +10)}>
                    {/* Unrotated fast-forward icon keeps visual language consistent with standard media transport symbols. */}
                    <FastForwardIcon />
                </Button>
            </div>
            {/* Volume control column mirrors the zoom section to keep the toolbar visually balanced. */}
            <div className="flex flex-col gap-2 items-center jusitfy-center text-center">
                {/* Text label clarifies that the adjacent slider affects master output loudness. */}
                <p className='text-sm'>Volume</p>
                {/* Slider feeds values into the shared gain node, mapping integer positions to a normalized gain value. */}
                <Slider min={-100} max={100} defaultValue={[0]} className="w-[200px]" onValueChange={(value) => {
                    // Only adjust gain if the Web Audio graph has been set up and a master gain node exists.
                    if (controls.gainNode) {
                        // Divide by 100 so values map cleanly from slider range into Web Audio's typical gain expectation.
                        controls.gainNode.gain.value = value[0] / 100;
                    }
                }} />
            </div>
        </div>
        {/* Main content area doubles as a drag-and-drop target for bringing additional audio files into the session. */}
        <div
            className='w-screen h-screen'
            // Prevent the browser's default drag-over behavior so custom drop handling can take precedence.
            onDragOver={(e) => { e.preventDefault() }}
            // Similarly prevent default handling on drag enter to avoid unwanted navigation or visual noise.
            onDragEnter={(e) => { e.preventDefault() }}
            // Handle files dropped anywhere on the main region by merging them into the current audio file list.
            onDrop={(e) => {
                e.preventDefault();
                // Only attempt to add files if the data transfer object actually contains a non-empty file list.
                if (e.dataTransfer.files) setAudioFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
            }}
        >
            {/* Scroll area lets wide timelines extend horizontally while keeping the vertical stack of tracks visible. */}
            <ScrollArea className='min-w-full overflow-x-visible p-2 flex items-center flex-col text-center min-h-full'>
                {/* Column layout stacks each waveform track vertically, preserving full width for detailed inspection. */}
                <div className="flex flex-col gap-1 w-full h-full">
                    {/* For each loaded audio file, render a corresponding `Waveform` component keyed by its index. */}
                    {audioFiles.map((file, i) => (
                        // `audioBlob` passes raw binary content into the waveform renderer, which handles decoding and drawing.
                        <Waveform audioBlob={file} key={i} />
                    ))}
                </div>
                {/* Horizontal scrollbar makes it possible to explore parts of the timeline that extend off-screen to the right. */}
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
        </div>
    </div>
}

// Export the page component as the default export so Next.js can treat it as the root route for this app.
export default Page