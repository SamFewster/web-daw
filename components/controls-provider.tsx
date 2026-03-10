"use client";
import { computeAudioBuffer, getRandomColour } from '@/lib/utils';
import axios from 'axios';
import { useTheme } from 'next-themes';
import React, { useContext, createContext, useState, useEffect } from 'react'

export type ControlsProps = {
    playing: boolean;
    time: number;
    zoom: number;
    volume: number;
    context: null | AudioContext;
    gainNode: null | GainNode;
    startedPlayingAt: number;
};

type ControlsContextProps = {
    controls: ControlsProps,
    setControls: React.Dispatch<React.SetStateAction<ControlsProps>>
}
class ControlsInterface {
    public setControls: React.Dispatch<React.SetStateAction<ControlsProps>>;
    constructor({ setControls }: ControlsContextProps) {
        this.setControls = setControls;
    }
    public playPause() {
        this.setControls(prev => ({ ...prev, playing: !prev.playing, startedPlayingAt: prev.context!.currentTime, time: prev.time + (prev.playing ? prev.context!.currentTime - prev.startedPlayingAt : 0) }));
    }
    public async seekTime(offset: number) {
        const controls = await this.getControls();
        let seekTo: number;
        if (controls.playing) {
            seekTo = controls.time + (controls.context!.currentTime - controls.startedPlayingAt) + offset;
        } else {
            seekTo = controls.time + offset
        }
        if (seekTo > 0) {
            this.setControls(prev => ({ ...prev, time: seekTo, startedPlayingAt: prev.context!.currentTime }));
        } else this.setControls(prev => ({ ...prev, time: 0 }))
    }
    private async getControls(): Promise<ControlsProps> {
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

const ControlsContext = createContext<ControlsContextProps | undefined>(undefined);


const ControlsProvider = ({ children }: { children: React.ReactNode }) => {
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
        const context = new AudioContext();
        const gainNode = context.createGain();
        gainNode.connect(context.destination);
        setControls(prev => ({ ...prev, context, gainNode }));
    }, [])

    return (
        <ControlsContext.Provider value={{ controls, setControls }}>
            {children}
        </ControlsContext.Provider>
    )
}

export const useControls = (): ControlsReturnProps => {
    const context = useContext(ControlsContext);
    if (!context) {
        throw new Error("useControls must be used within a ControlsProvider");
    }
    return {
        controls: context.controls,
        controlsInterface: new ControlsInterface(context)
    };
}

export default ControlsProvider