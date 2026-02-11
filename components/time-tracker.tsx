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
            }, 10)
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

    scrollArea.addEventListener("scroll", () => {
        setScroll(scrollArea.scrollLeft)
    })

    return (
        // hardcoded 60px margin is temporary - sort out the layout lmao
        <div className='w-full flex justify-left items-center pointer pointer-events-none'>
            <div className="absolute h-full left-0 top-0" style={{
                marginLeft: `${((time * (controls.zoom / 100) * 20) + 60) - scroll}px`
            }}>
                <div className="bg-primary w-[2px] h-full z-0">
                </div>
            </div>
        </div>
    )
}

export default TimeTracker