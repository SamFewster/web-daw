import React, { useEffect, useState } from 'react'
import { ControlsProps } from './controls-provider';

type TimeInfoProps = {
    startTime: number,
    offsetTime: number
}

const TimeTracker = ({ controls, scrollArea }: { controls: ControlsProps, scrollArea: HTMLDivElement }) => {
    const [, setTimeInfo] = useState<TimeInfoProps>({
        startTime: 0,
        offsetTime: 0
    });
    const [time, setTime] = useState(0);
    const [intervalRef, setIntervalRef] = useState<NodeJS.Timeout | null>();
    const [scroll, setScroll] = useState(scrollArea.scrollLeft);

    useEffect(() => {
        setTimeInfo(prev => ({ ...prev, startTime: controls.time }))
        setTime(controls.time);
    }, [controls.time])

    const getTimeInfo = (): Promise<TimeInfoProps> => {
        return new Promise<TimeInfoProps>((resolve) => {
            setTimeInfo(prev => {
                resolve(prev)
                return prev as TimeInfoProps
            })
        })
    }

    useEffect(() => {
        if (controls.playing) {
            const interval = setInterval(async () => {
                const st = await getTimeInfo();
                setTime(st.startTime + (controls.context!.currentTime - st.offsetTime));
            }, 2)
            setIntervalRef(interval)
        } else {
            if (intervalRef) {
                clearInterval(intervalRef)
            }
            setTime(controls.time);
        }
    }, [controls.playing])

    useEffect(() => {
        setTimeInfo(prev => ({ ...prev, offsetTime: controls.startedPlayingAt }))
    }, [controls.startedPlayingAt])

    useEffect(() => {
        scrollArea.addEventListener("scroll", () => {
            scrollArea && setScroll(scrollArea.scrollLeft);
        })
    }, [])

    return (
        // the hardcoded 68px margin was supposed to be temporary but I ran out of time to restructure the layout so I'm just keeping it 
        <div className='absolute h-full pointer-events-none top-0' style={{
            marginLeft: `${((time * (controls.zoom / 100) * 20) + 68) - scroll}px`
        }}>
            <div className="bg-primary w-[2px] h-full z-[1000]" />
        </div>
    )
}

export default TimeTracker