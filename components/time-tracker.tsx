// Import React and the hooks needed to manage local state and side effects tied to playback changes.
import React, { useEffect, useState } from 'react'
// Import the shape of the shared controls object so this component can consume the same playback context as others.
import { ControlsProps } from './controls-provider';

// TimeInfoProps tracks when playback for the current session started and what the playhead time was at that moment.
type TimeInfoProps = {
    startTime: number,
    offsetTime: number
}

// TimeTracker is responsible for computing and rendering the moving playhead line in sync with audio playback.
const TimeTracker = ({ controls }: { controls: ControlsProps }) => {
    // Store the base playback time at the moment playback begins and the corresponding audio-context timestamp.
    const [timeInfo, setTimeInfo] = useState<TimeInfoProps>({
        startTime: 0,
        offsetTime: 0
    });
    // `time` represents the continuously-updated logical playhead position in seconds used to position the cursor.
    const [time, setTime] = useState(0);
    // Keep a reference to the active interval so it can be cleared whenever playback is paused or stopped.
    const [intervalRef, setIntervalRef] = useState<NodeJS.Timeout | null>();

    // Whenever the shared `controls.time` changes (from scrubbing or seeking), reset the base start time and display value.
    useEffect(() => {
        // Cache the new logical start time so subsequent interval updates can build on this value.
        setTimeInfo(prev => ({ ...prev, startTime: controls.time }))
        // Immediately reflect the new time in the UI so the playhead jumps to the correct position.
        setTime(controls.time);
    }, [controls.time])

    // Helper function to retrieve the latest `timeInfo` inside a setInterval callback, where state can be stale otherwise.
    const getTimeInfo = (): Promise<TimeInfoProps> => {
        return new Promise<TimeInfoProps>((resolve) => {
            // Use the state setter to safely access the most recent `timeInfo` snapshot and resolve it to the caller.
            setTimeInfo(prev => {
                resolve(prev)
                return prev as TimeInfoProps
            })
        })
    }

    // Start or stop a high-frequency interval whenever the playing state toggles to keep the playhead moving in real time.
    useEffect(() => {
        if (controls.playing) {
            // When playback is active, update the displayed time every 10ms to give a smooth playhead animation.
            const interval = setInterval(async () => {
                const st = await getTimeInfo();
                // Compute elapsed time as the difference between now and `offsetTime`, then add it to the base `startTime`.
                setTime(st.startTime + (controls.context!.currentTime - st.offsetTime));
            }, 10)
            setIntervalRef(interval)
        } else {
            // When playback stops, clear any existing interval to prevent unnecessary updates and memory leaks.
            if (intervalRef) {
                clearInterval(intervalRef)
            }
            // Snap the displayed time back to the shared controls time, ensuring the cursor reflects the final position.
            setTime(controls.time);
        }
    }, [controls.playing])

    // Track when audio playback actually started in the Web Audio context so elapsed time can be derived accurately.
    useEffect(() => {
        setTimeInfo(prev => ({ ...prev, offsetTime: controls.startedPlayingAt }))
    }, [controls.startedPlayingAt])

    return (
        // This wrapper div reserves horizontal space and shifts the playhead to line up with the waveform area.
        <div className='w-full ml-[60px] flex justify-left items-center'>
            {/* Inner container holds the vertical playhead line and is positioned relative to the viewport. */}
            <div className="h-full absolute top-0 left-0" style={{
                // Convert the current playhead time into pixels using the same zoom-to-pixel mapping as the waveform.
                marginLeft: `${time * (controls.zoom / 100) * 20}px`
            }}>
                {/* Thin, full-height bar visually represents the current playhead slicing through all tracks. */}
                <div className="bg-primary w-[2px] h-full">

                </div>
            </div>
        </div>
    )
}

// Export the component so it can be placed above the waveform stack to show a shared global playback cursor.
export default TimeTracker