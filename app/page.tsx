"use client"
// This directive informs Next.js that the component must be executed on the client side.
// This is required because the component uses browser APIs such as AudioContext
// and React hooks which cannot run during server-side rendering.

import React, { useEffect, useState } from 'react'
// Importing React and the hooks required for managing component state and lifecycle.
// useState  -> stores and updates dynamic data inside the component
// useEffect -> runs side effects such as loading files or setting up audio systems

import axios from 'axios'
// Axios is a library used to perform HTTP requests.
// It simplifies fetching data such as audio files from the server.

import Waveform from '@/components/waveform';
// Importing the custom Waveform component which is responsible
// for visualising and playing audio waveforms.

import { Button } from '@/components/ui/button';
// Reusable button component used for playback controls.

import { useControls } from '@/components/controls-provider';
// Custom React hook which provides shared control state for the audio player.
// This includes properties such as playback state, zoom level, and current time.

import { FastForwardIcon, PauseIcon, PlayIcon } from 'lucide-react';
// Icons used to visually represent playback controls.

import { Slider } from '@/components/ui/slider';
// Slider component used for adjusting values such as zoom level and volume.

import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
// Scrollable container components used to allow horizontal scrolling of waveforms.



// Main page component
const Page = () => {

    // Accessing shared control state and update function.
    const { controls, setControls } = useControls();

    // State variable storing an array of audio files.
    // These files will be visualised using the Waveform component.
    const [audioFiles, setAudioFiles] = useState<File[]>([]);



    // useEffect runs once when the component first mounts.
    useEffect(() => {

        // Create a new Web Audio API context.
        // This object manages audio processing operations.
        const context = new AudioContext();

        // Create a GainNode which controls volume levels.
        const gainNode = context.createGain();

        // Connect the gain node to the final output (the speakers).
        gainNode.connect(context.destination);

        // Store the context and gainNode in global controls state
        // so they can be accessed by other components (such as Waveform).
        setControls(prev => ({ ...prev, context, gainNode }));


        // Asynchronous function used to fetch an example audio file.
        (async () => {

            // Request the audio file from the server.
            // responseType "blob" ensures the file is returned as binary data.
            const response = await axios.get("/sample4.flac", { responseType: "blob" });

            // If the request succeeds, store the audio file in state.
            if (response)
                setAudioFiles(
                    [...Array(1).fill("").map(() => (response.data))]
                );

        })();

    }, []) // Empty dependency array ensures this only runs once.

    const [playing, setPlaying] = useState(false);

    // JSX user interface returned by the component
    return <div className="w-screen h-screen flex flex-col">

        {/* Top control bar */}
        <div className="w-screen bg-muted/50 flex items-center justify-between p-2">
            {/* Zoom Control Section */}
            <div className="flex flex-col gap-2 items-center jusitfy-center text-center">
                <p className='text-sm'>Zoom</p>
                {/* Slider used to control waveform zoom level */}
                <Slider
                    value={[controls.zoom]}
                    max={100}
                    min={1}
                    className="w-[200px]"

                    // Update global zoom value when slider changes
                    onValueChange={(value) =>
                        setControls(prev => ({
                            ...prev,
                            zoom: value[0]
                        }))
                    }
                />

            </div>
            {/* Playback Control Buttons */}
            <div className="flex gap-2 justify-center items-center">

                {/* Skip Backwards Button */}
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                        // Store whether audio was previously playing
                        let wasPlaying = false;
                        if (controls.playing) {
                            wasPlaying = true;
                            // Temporarily pause playback
                            setControls(prev => ({ ...prev, playing: false }));
                        }
                        // Small delay ensures state updates correctly
                        setTimeout(() => {
                            // Move playback position backwards by 10 seconds
                            setControls(prev => ({
                                ...prev,
                                time: prev.time - 10,
                                playing: wasPlaying
                            }));

                        }, 1)

                    }}
                >
                    {/* Rotated icon represents rewind */}
                    <FastForwardIcon className="rotate-180" />
                </Button>
                {/* Play / Pause Button */}
                <Button
                    variant="outline"
                    size="icon"
                    // Toggle playback state when clicked
                    onClick={() => {
                        setPlaying(prev => !prev);
                    }}
                >
                    {/* Display icon depending on current playback state */}
                    {playing ? <PauseIcon /> : <PlayIcon />}
                </Button>
                {/* Skip Forwards Button */}
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                        let wasPlaying = false;
                        if (controls.playing) {
                            wasPlaying = true;
                            // Pause playback before adjusting time
                            setControls(prev => ({ ...prev, playing: false }));
                        }
                        setTimeout(() => {
                            // Move playback position forward by 10 seconds
                            setControls(prev => ({
                                ...prev,
                                time: prev.time + 10,
                                playing: wasPlaying
                            }));

                        }, 1)
                    }}
                >
                    <FastForwardIcon />
                </Button>
            </div>
            {/* Volume Control Section */}
            <div className="flex flex-col gap-2 items-center jusitfy-center text-center">

                <p className='text-sm'>Volume</p>

                {/* Slider controlling audio gain */}
                <Slider
                    min={-100}
                    max={100}
                    defaultValue={[0]}
                    className="w-[200px]"

                    onValueChange={(value) => {

                        // Adjust the gain value in the Web Audio API
                        if (controls.gainNode) {
                            controls.gainNode.gain.value = value[0] / 100;
                        }

                    }}
                />
            </div>
        </div>
        {/* Main content area */}
        <div
            className='w-screen h-screen'
            // Allow drag-over behaviour for file uploads
            onDragOver={(e) => { e.preventDefault() }}
            // Prevent default browser behaviour when dragging files
            onDragEnter={(e) => { e.preventDefault() }}
            // Handle dropped files
            onDrop={(e) => {
                e.preventDefault();
                // If files were dropped, add them to the audioFiles array
                if (e.dataTransfer.files)
                    setAudioFiles(prev =>
                        [...prev, ...Array.from(e.dataTransfer.files)]
                    );
            }}
        >
            {/* Scrollable container for multiple waveform components */}
            <ScrollArea className='min-w-full overflow-x-visible p-2 flex items-center flex-col text-center min-h-full'>
                {/* Render a Waveform component for each audio file */}
                {audioFiles.map((file, i) => (
                    <Waveform
                        audioBlob={file}
                        key={i}
                    />
                ))}
                {/* Horizontal scrollbar */}
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
        </div>
    </div>
}

// Exporting the Page component so it can be used by the application routing system
export default Page