import React, { useEffect, useState } from 'react'
import { ControlsProps } from './controls-provider';

type TimeInfoProps = {
    startTime: number,
    offsetTime: number
}

const TimeTracker = ({ controls }: { controls: ControlsProps }) => {
    const [timeInfo, setTimeInfo] = useState<TimeInfoProps>({
        startTime: 0,
        offsetTime: 0
    });
    const [time, setTime] = useState(0);
    const [intervalRef, setIntervalRef] = useState<NodeJS.Timeout | null>();
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

    return (
        // hardcoded 60px margin is temporary - sort out the layout lmao
        <div className='w-full ml-[60px] flex justify-left items-center'>
            <div className="fixed h-full absolute top-0 left-0" style={{
                marginLeft: `${time * (controls.zoom / 100) * 20}px`
            }}>
                HELLO
                <div className="bg-primary w-[2px] h-full">

                </div>
            </div>
        </div>
    )
}

export default TimeTracker