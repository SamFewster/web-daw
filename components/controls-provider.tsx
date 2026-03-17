"use client";
import React, { useContext, createContext, useState, useEffect } from 'react'

// This file provides a global "transport + audio engine" state for the whole DAW.
// Instead of passing props through many components, we store the values in a React Context
// and expose them via `useControls()`.

export type ControlsProps = {
    // Whether the project is currently playing.
    playing: boolean;
    // Current project time in seconds (when paused) OR the base time used when starting playback.
    time: number;
    // Timeline zoom level (used to convert seconds <-> pixels).
    zoom: number;
    // Master volume (0..100). Note: some components directly use `gainNode.gain` instead.
    volume: number;
    // Web Audio API AudioContext (the main audio engine clock + node graph).
    context: null | AudioContext;
    // Master GainNode at the end of the graph (controls overall output volume).
    gainNode: null | GainNode;
    // AudioContext time (seconds) when playback was last started/resumed.
    // Used to calculate elapsed time while playing: currentTime - startedPlayingAt.
    startedPlayingAt: number;
};

type ControlsContextProps = {
    controls: ControlsProps,
    setControls: React.Dispatch<React.SetStateAction<ControlsProps>>
}

// ControlsInterface wraps common actions (play/pause, seeking) so components can call methods
// instead of re-implementing the same time maths everywhere.
class ControlsInterface {
    // We store `setControls` so this class can update the global state.
    public setControls: React.Dispatch<React.SetStateAction<ControlsProps>>;
    constructor({ setControls }: ControlsContextProps) {
        this.setControls = setControls;
    }
    public playPause() {
        // Toggle playback.
        // When switching *to play*: store the AudioContext time so we can measure elapsed time later.
        // When switching *to pause*: "commit" the elapsed playback time into `time` so it becomes a stable paused time.
        this.setControls(prev => ({ ...prev, playing: !prev.playing, startedPlayingAt: prev.context!.currentTime, time: prev.time + (prev.playing ? prev.context!.currentTime - prev.startedPlayingAt : 0) }));
    }
    public async seekTime(offset: number) {
        // Seek relative to the current transport time by `offset` seconds.
        // We first read a snapshot of controls so the calculation uses consistent values.
        const controls = await this.getControls();
        // If playing, current time = base time + elapsed AudioContext time. If paused, use base time directly.
        const seekTo = (controls.playing ? controls.time + (controls.context!.currentTime - controls.startedPlayingAt) : controls.time) + offset;
        if (seekTo > 0) {
            // Move the playhead and reset the "startedPlayingAt" reference so playback stays in sync.
            this.setControls(prev => ({ ...prev, time: seekTo, startedPlayingAt: prev.context!.currentTime }));
        } else this.setControls(prev => ({ ...prev, time: 0, startedPlayingAt: prev.context!.currentTime }));
    }
    private async getControls(): Promise<ControlsProps> {
        // Read the latest ControlsProps.
        // Using the functional setState form lets us access the current `prev` value.
        return new Promise((res) => {
            this.setControls((prev) => {
                res(prev);
                return prev;
            })
        })
    }
}

type ControlsReturnProps = {
    controls: ControlsProps,
    controlsInterface: ControlsInterface
}

// Create a context that will hold the transport state.
const ControlsContext = createContext<ControlsContextProps | undefined>(undefined);


const ControlsProvider = ({ children }: { children: React.ReactNode }) => {
    // Initial global control values for the app.
    const [controls, setControls] = useState({
        playing: false,
        time: 0,
        zoom: 50,
        volume: 100,
        context: null as null | AudioContext,
        gainNode: null as null | GainNode,
        startedPlayingAt: 0
    });

    useEffect(() => {
        // Create the Web Audio engine once when the app loads.
        // `context.destination` is the speakers/output of the device.
        const context = new AudioContext();
        // Master gain sits at the end of the graph so we can control overall volume.
        const gainNode = context.createGain();
        // Route master gain to the speakers.
        gainNode.connect(context.destination);
        // Store references so other components can schedule playback and connect nodes.
        setControls(prev => ({ ...prev, context, gainNode }));
    }, [])

    return (
        // Provide both the current values and the setter so consumers can read/update them.
        <ControlsContext.Provider value={{ controls, setControls }}>
            {children}
        </ControlsContext.Provider>
    )
}

export const useControls = (): ControlsReturnProps => {
    // Custom hook to access controls from anywhere in the component tree.
    const context = useContext(ControlsContext);
    if (!context) {
        // This prevents accidental usage outside of <ControlsProvider>.
        throw new Error("useControls must be used within a ControlsProvider");
    }
    return {
        controls: context.controls,
        // Create a helper object that exposes common actions like play/pause and seek.
        controlsInterface: new ControlsInterface(context)
    };
}

export default ControlsProvider