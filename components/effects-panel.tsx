import React, { useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { effectDefinitions } from '@/lib/effect-definitions';
import { Card, CardAction, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
import { PlusIcon, XIcon } from 'lucide-react';
import { Knob } from 'primereact/knob';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from './ui/select';

const cardWidth = 200;

const EffectsPanel = ({ selectedWaveform, tracks, setTracks }: { selectedWaveform: SelectedWaveform | undefined, tracks: Track[], setTracks: React.Dispatch<React.SetStateAction<Track[]>> }) => {

    // since the ScrollArea component embeds a display: table div, we need to do some gross and disgusting things to get the width of the inner div to be respected by the ScrollArea, while maintaing a dynamic height from the resizable panel 
    // im not proud of this but there was literally no other way, okay? blame radix ui for using outdated css layout standards for their component. janky problems call for janky solutions.
    // https://github.com/radix-ui/primitives/issues/3646

    // create a reference to the inner div which contains the scrollable content
    const innerDivRef = useRef<HTMLDivElement>(null);

    // create a state variable to store the width of the inner div
    const [width, setWidth] = useState(0);

    useEffect(() => {
        if (!innerDivRef.current) return;
        // add a resize observer to the inner div, so that we can update the state variable when the inner div is resized
        const observer = new ResizeObserver(entries => {
            // update the state variable with the new width
            for (let entry of entries) {
                setWidth(entry.contentRect.width);
            }
        });
        // start observing the inner div
        observer.observe(innerDivRef.current);
        // clean up the observer when the component unmounts
        return () => observer.disconnect();
    }, []);

    // create a reference to the viewport div
    const viewportRef = useRef<HTMLDivElement>(null);

    // create a state variable to store the scroll position
    const [scrollX, setScrollX] = useState(0);

    useEffect(() => {
        if (!viewportRef.current) return;
        viewportRef.current.addEventListener("scroll", () => {
            setScrollX(viewportRef.current!.scrollLeft);
        })
    }, [])

    const [selectedEffectId, setSelectedEffectId] = useState<string | undefined>();

    return (
        <ScrollArea className='h-full' innerClassName='[&>div]:min-h-full [&>div]:!block' ref={viewportRef}>
            <div style={{ width }} className='h-2' />
            <div>
                <div className="absolute inset-0 shrink-0" style={{ left: -scrollX }}>
                    <div className="inline-flex gap-2 h-full p-2" ref={innerDivRef}>
                        {selectedWaveform && tracks[selectedWaveform?.trackIndex]!.effects.map((effect, i) =>
                            <EffectCard effect={effect} selectedWaveform={selectedWaveform} setTracks={setTracks} key={i} />)
                        }
                        <Card style={{ width: cardWidth }} className='flex flex-col group mr-4' aria-disabled={!selectedWaveform}>
                            <CardHeader>
                                <CardTitle className='group-aria-disabled:text-muted-foreground'>Add Effect</CardTitle>
                            </CardHeader>
                            <CardContent className='flex flex-col gap-2 justify-center items-center flex-1'>
                                <Button className='aspect-square size-20 p-5' variant="outline" disabled={!selectedEffectId || !selectedWaveform} onClick={() => {
                                    if (!selectedEffectId) return;
                                    // get the effect definition
                                    const effectDefinition = effectDefinitions.find(e => e.id === selectedEffectId)!;
                                    // add the effect to the track
                                    setTracks(prev => [
                                        // add all the tracks before the selected track
                                        ...prev.slice(0, selectedWaveform!.trackIndex),
                                        // add the effect to the selected track
                                        {
                                            ...prev[selectedWaveform!.trackIndex],
                                            effects: [
                                                ...prev[selectedWaveform!.trackIndex].effects,
                                                {
                                                    id: effectDefinition.id,
                                                    intensity: effectDefinition.defaultIntensity,
                                                    timestamp: Date.now()
                                                }]
                                        },
                                        // add all the tracks after the selected track
                                        ...prev.slice(selectedWaveform!.trackIndex + 1)
                                    ])
                                }}>
                                    <PlusIcon className='size-full' />
                                </Button>
                                <Select value={selectedEffectId} onValueChange={setSelectedEffectId} disabled={!selectedWaveform}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Select an effect" />
                                    </SelectTrigger>
                                    <SelectContent className='z-[100]'>
                                        <SelectGroup>
                                            {effectDefinitions.map((effect, i) => (
                                                <SelectItem key={i} value={effect.id}>
                                                    {effect.name}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
            <ScrollBar orientation='horizontal' />
        </ScrollArea >
    )
}

export const EffectCard = ({ effect, setTracks, selectedWaveform }: { effect: Effect, setTracks: React.Dispatch<React.SetStateAction<Track[]>>, selectedWaveform: SelectedWaveform }) => {
    const [effectDefiniton, setEffectDefinition] = useState(effectDefinitions.find(e => e.id === effect.id)!);
    useEffect(() => {
        setEffectDefinition(effectDefinitions.find(e => e.id === effect.id)!);
    }, [effect])

    return (
        <Card style={{ width: cardWidth }} className='flex flex-col'>
            <CardHeader>
                {/* Find the effect definition and display the effect name */}
                <CardTitle className='text-xl text-wrap break-words overflow-hidden'>{effectDefiniton.name}</CardTitle>
                <CardAction onClick={() => {
                    // logic to remove the effect from the track
                    setTracks(prev => [
                        ...prev.slice(0, selectedWaveform.trackIndex),
                        {
                            ...prev[selectedWaveform.trackIndex],
                            effects: prev[selectedWaveform.trackIndex].effects.filter(e => e.timestamp !== effect.timestamp)
                        },
                        ...prev.slice(selectedWaveform.trackIndex + 1),
                    ])
                }}>
                    <XIcon className='size-5' />
                </CardAction>
            </CardHeader>
            <CardContent className='flex-1 flex items-center justify-center'>
                <Knob

                    value={effect.intensity}
                    onChange={(event) => setTracks(prev => [
                        ...prev.slice(0, selectedWaveform.trackIndex),
                        {
                            ...prev[selectedWaveform.trackIndex],
                            // update the intensity of the effect on the selected track
                            effects: prev[selectedWaveform.trackIndex].effects.map(e => e.timestamp === effect.timestamp ? { ...e, intensity: parseFloat(event.value.toFixed(2)) } : e)
                        },
                        ...prev.slice(selectedWaveform.trackIndex + 1),
                    ])}
                    min={effectDefiniton.minIntensity}
                    max={effectDefiniton.maxIntensity}
                    step={effectDefiniton.step}
                />
            </CardContent>
        </Card>
    )
}

export default EffectsPanel