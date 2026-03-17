import React, { useEffect, useState } from 'react'
import { ControlsProps } from './controls-provider';

// TimeInfoProps stores the reference times we need to calculate the moving playhead position.
// - startTime: the project time (seconds) when playback started or when we last sought
// - offsetTime: the AudioContext time (seconds) at the same moment, used to measure elapsed playback accurately
type TimeInfoProps = {
    startTime: number,
    offsetTime: number
}

// TimeTracker draws the vertical "playhead" line over the timeline.
// It converts project time (seconds) into pixels using the current zoom value,
// and also subtracts the scroll position so the line stays aligned with the visible viewport.
const TimeTracker = ({ controls, scrollArea }: { controls: ControlsProps, scrollArea: HTMLDivElement }) => {
    // We don't actually render `timeInfo`, but we keep it in state so other code can read a stable snapshot.
    // (This is used to calculate time while playing.)
    const [, setTimeInfo] = useState<TimeInfoProps>({
        startTime: 0,
        offsetTime: 0
    });
    // Current transport time used for rendering the playhead position.
    const [time, setTime] = useState(0);
    // Interval id used while playing so we can stop the timer when paused.
    const [intervalRef, setIntervalRef] = useState<NodeJS.Timeout | null>();
    // Current horizontal scroll offset of the timeline (pixels).
    const [scroll, setScroll] = useState(scrollArea.scrollLeft);

    useEffect(() => {
        // When the user seeks or the transport time changes, update the base times.
        setTimeInfo(prev => ({ ...prev, startTime: controls.time }))
        setTime(controls.time);
    }, [controls.time])

    const getTimeInfo = (): Promise<TimeInfoProps> => {
        // Helper to read the latest `timeInfo` value.
        // setState's functional form gives access to the current state value.
        return new Promise<TimeInfoProps>((resolve) => {
            setTimeInfo(prev => {
                resolve(prev)
                return prev as TimeInfoProps
            })
        })
    }

    useEffect(() => {
        // Start/stop the high-frequency timer when play/pause changes.
        if (controls.playing) {
            // While playing, we compute current project time by adding AudioContext elapsed time.
            const interval = setInterval(async () => {
                const st = await getTimeInfo();
                // currentTime - offsetTime = how long playback has been running (seconds).
                setTime(st.startTime + (controls.context!.currentTime - st.offsetTime));
            }, 2)
            setIntervalRef(interval)
        } else {
            // When paused, stop updating and snap the playhead to the stored transport time.
            if (intervalRef) {
                clearInterval(intervalRef)
            }
            setTime(controls.time);
        }
    }, [controls.playing])

    useEffect(() => {
        // Whenever playback starts, store the AudioContext time we started at.
        setTimeInfo(prev => ({ ...prev, offsetTime: controls.startedPlayingAt }))
    }, [controls.startedPlayingAt])

    useEffect(() => {
        // Keep `scroll` updated so the playhead stays in the right place as the user scrolls.
        scrollArea.addEventListener("scroll", () => {
            scrollArea && setScroll(scrollArea.scrollLeft);
        })
    }, [])

    return (
        // the hardcoded 68px margin was supposed to be temporary but I ran out of time to restructure the layout so I'm just keeping it 
        <div className='absolute h-full pointer-events-none top-0' style={{
            // Convert seconds -> pixels:
            // time * (pixelsPerSecond) + leftMargin - scrollLeft
            // pixelsPerSecond scales with zoom and the base constant "20".
            marginLeft: `${((time * (controls.zoom / 100) * 20) + 68) - scroll}px`
        }}>
            {/* The actual playhead line */}
            <div className="bg-primary w-[2px] h-full z-[1000]" />
        </div>
    )
}

export default TimeTracker