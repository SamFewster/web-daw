"use client";
// Ensures that this component runs on the client side in a Next.js environment.
// This is necessary because React hooks such as useState and useContext
// rely on browser-based execution.

import React, { useContext, createContext, useState } from 'react'
// Importing React and several hooks used for managing shared state.
// useState -> used to create and update state variables
// createContext -> used to create a shared global state container
// useContext -> allows components to access data from a context

// Type definition describing the structure of the controls object.
// TypeScript types improve code reliability by ensuring that all values
// match their expected data type.
type ControlsProps = {
    // Boolean value indicating whether audio playback is currently active.
    playing: boolean;
    // Number representing the current playback position in seconds.
    time: number;
    // Number controlling the zoom level of the waveform visualisation.
    zoom: number;
    // Number representing volume level (typically between 0 and 100).
    volume: number;
    // Reference to the Web Audio API AudioContext.
    // This is the main object responsible for managing audio processing.
    context: null | AudioContext;
    // GainNode used to control the volume of the audio signal.
    // A GainNode allows dynamic adjustment of amplitude.
    gainNode: null | GainNode;
};

// Type definition describing the structure of the context object.
type ControlsContextProps = {

    // The controls object containing the current state values.
    controls: ControlsProps,

    // Function used to update the controls state.
    // React.Dispatch describes a function that updates state.
    setControls: React.Dispatch<React.SetStateAction<ControlsProps>>
}



// Creating the context object.
// The default value is undefined because the context will only be available
// when wrapped inside a ControlsProvider component.
const ControlsContext = createContext<ControlsContextProps | undefined>(undefined);



// Provider component responsible for storing and distributing the controls state.
const ControlsProvider = ({ children }: { children: React.ReactNode }) => {
    // useState creates the main controls state object.
    const [controls, setControls] = useState({
        // Audio playback is initially paused.
        playing: false,
        // Playback time begins at zero seconds.
        time: 0,
        // Default zoom level for waveform visualisation.
        zoom: 50,
        // Default volume level set to maximum.
        volume: 100,
        // AudioContext is initially null because it will be created later
        // once the audio system is initialised.
        context: null as null | AudioContext,
        // GainNode also starts as null until the audio system is configured.
        gainNode: null as null | GainNode
    });

    // The provider component wraps child components
    // and allows them to access the shared controls state.
    return (
        <ControlsContext.Provider value={{ controls, setControls }}>

            {/* 
            children represents any components nested inside the provider.
            These components will automatically gain access to the controls state.
            */}
            {children}

        </ControlsContext.Provider>

    )
}



// Custom hook used to safely access the ControlsContext.
export const useControls = (): ControlsContextProps => {

    // Retrieve the current context value.
    const context = useContext(ControlsContext);

    // If the hook is used outside of a ControlsProvider,
    // an error is thrown to prevent undefined behaviour.
    if (!context) {
        throw new Error("useControls must be used within a ControlsProvider");
    }

    // Return the context object so components can access
    // both the controls state and the setControls function.
    return useContext(ControlsContext) as ControlsContextProps;
}



// Exporting the provider component so it can wrap the application.
export default ControlsProvider