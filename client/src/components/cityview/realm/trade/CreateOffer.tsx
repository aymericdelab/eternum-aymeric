import React, { useEffect, useState } from 'react';
import { SecondaryPopup } from '../../../../elements/SecondaryPopup';
import Button from '../../../../elements/Button';
import { Headline } from '../../../../elements/Headline';
import { ResourceCost } from '../../../../elements/ResourceCost';
import { NumberInput } from '../../../../elements/NumberInput';
import { SelectableResource } from '../../../../elements/SelectableResource';
import { resources } from '../../../../constants/resources';
import { ReactComponent as ArrowSeparator } from '../../../../assets/icons/common/arrow-separator.svg';
import { ReactComponent as Danger } from '../../../../assets/icons/common/danger.svg';
import { ReactComponent as Donkey } from '../../../../assets/icons/units/donkey.svg';
import { Caravan } from './Caravans/Caravan';
import { Steps } from '../../../../elements/Steps';
import { FetchStatus, useGetCaravans, useGetTrades } from '../../../../hooks/useGraphQLQueries';
import { getComponentValue } from '@latticexyz/recs';
import { Utils } from '@dojoengine/core';
import { useDojo } from '../../../../DojoContext';
import useRealmStore from '../../../../hooks/store/useRealmStore';
import useBlockchainStore from '../../../../hooks/store/useBlockchainStore';
import { attach } from '@react-three/fiber/dist/declarations/src/core/utils';

type CreateOfferPopupProps = {
    onClose: () => void;
    onCreate: () => void;
}

export const CreateOfferPopup = ({ onClose, onCreate }: CreateOfferPopupProps) => {
    const [step, setStep] = useState<number>(1);
    const [selectedResourceIdsGive, setSelectedResourceIdsGive] = useState<number[]>([]);
    const [selectedResourceIdsGet, setSelectedResourceIdsGet] = useState<number[]>([]);
    const [selectedResourcesGiveAmounts, setSelectedResourcesGiveAmounts] = useState<{ [key: number]: number }>({});
    const [selectedResourcesGetAmounts, setSelectedResourcesGetAmounts] = useState<{ [key: number]: number }>({});
    const [selectedCaravan, setSelectedCaravan] = useState<number>(0);
    const [isNewCaravan, setIsNewCaravan] = useState(false);
    const [donkeysCount, setDonkeysCount] = useState(0);
    const [resourceWeight, setResourceWeight] = useState(0);

    const { systemCalls: { create_caravan, create_free_transport_unit, make_fungible_order, attach_caravan } } = useDojo()

    const { realmEntityId } = useRealmStore();

    const createOrder = async () => {
        if (isNewCaravan) {
            const transport_units_id = await create_free_transport_unit({ realm_id: realmEntityId, quantity: donkeysCount });
            const caravan_id = await create_caravan({ entity_ids: [transport_units_id] });
            const trade_id = await make_fungible_order({
                maker_id: realmEntityId,
                maker_entity_types: selectedResourceIdsGive,
                maker_quantities: Object.values(selectedResourcesGiveAmounts),
                taker_entity_types: selectedResourceIdsGet,
                taker_quantities: Object.values(selectedResourcesGetAmounts),
            })
            await attach_caravan({ realm_id: realmEntityId, trade_id, caravan_id })
        } else {
            const trade_id = await make_fungible_order({
                maker_id: realmEntityId,
                maker_entity_types: selectedResourceIdsGive,
                maker_quantities: Object.values(selectedResourcesGiveAmounts),
                taker_entity_types: selectedResourceIdsGet,
                taker_quantities: Object.values(selectedResourcesGetAmounts),
            })
            await attach_caravan({ realm_id: realmEntityId, trade_id, caravan_id: selectedCaravan })
        }
    }

    useEffect(() => { }, []);

    return (
        <SecondaryPopup>
            <SecondaryPopup.Head>
                <div className='flex items-center space-x-1'>
                    <div className='mr-0.5'>Create Offer:</div>
                </div>
            </SecondaryPopup.Head>
            <SecondaryPopup.Body>
                <div className='flex flex-col items-center pt-2'>
                    {step == 1 && <SelectResourcesPanel
                        selectedResourceIdsGive={selectedResourceIdsGive}
                        setSelectedResourceIdsGive={e => {
                            setSelectedResourceIdsGive(e); setSelectedResourcesGiveAmounts(
                                Object.fromEntries(e.map(id => [id, 0]))
                            )
                        }}
                        selectedResourceIdsGet={selectedResourceIdsGet}
                        setSelectedResourceIdsGet={e => {
                            setSelectedResourceIdsGet(e); setSelectedResourcesGetAmounts(
                                Object.fromEntries(e.map(id => [id, 0]))
                            )
                        }}
                    />}
                    {step == 2 && <SelectResourcesAmountPanel
                        selectedResourceIdsGive={selectedResourceIdsGive}
                        selectedResourcesGiveAmounts={selectedResourcesGiveAmounts}
                        setSelectedResourcesGiveAmounts={setSelectedResourcesGiveAmounts}
                        resourceWeight={resourceWeight}
                        selectedResourceIdsGet={selectedResourceIdsGet}
                        selectedResourcesGetAmounts={selectedResourcesGetAmounts}
                        setSelectedResourcesGetAmounts={setSelectedResourcesGetAmounts}
                        setResourceWeight={setResourceWeight}
                    />}
                    {step == 3 && <SelectCaravanPanel
                        donkeysCount={donkeysCount}
                        setDonkeysCount={setDonkeysCount}
                        isNewCaravan={isNewCaravan}
                        setIsNewCaravan={setIsNewCaravan}
                        selectedCaravan={selectedCaravan}
                        setSelectedCaravan={setSelectedCaravan}
                        selectedResourceIdsGet={selectedResourceIdsGet}
                        selectedResourcesGetAmounts={selectedResourcesGetAmounts}
                        selectedResourceIdsGive={selectedResourceIdsGive}
                        selectedResourcesGiveAmounts={selectedResourcesGiveAmounts}
                        resourceWeight={resourceWeight}
                    />}
                </div>
                <div className='flex justify-between m-2 text-xxs'>
                    <Button className='!px-[6px] !py-[2px] text-xxs' onClick={() => step === 1 ? onClose() : setStep(step - 1)} variant='outline'>{step === 1 ? 'Cancel' : 'Back'}</Button>
                    <Steps className='absolute -translate-x-1/2 left-1/2 bottom-4' step={step} maxStep={3} />
                    <Button className='!px-[6px] !py-[2px] text-xxs' onClick={() => {
                        if (step === 3) {
                            createOrder();
                            onClose()
                        } else { setStep(step + 1) }
                    }} variant='success'>{step == 3 ? 'Create Offer' : 'Next Step'}</Button>
                </div>
            </SecondaryPopup.Body>
        </SecondaryPopup >
    );
};

const SelectResourcesPanel = ({ selectedResourceIdsGive, setSelectedResourceIdsGive, selectedResourceIdsGet, setSelectedResourceIdsGet }: {
    selectedResourceIdsGive: number[];
    setSelectedResourceIdsGive: (selectedResourceIds: number[]) => void;
    selectedResourceIdsGet: number[];
    setSelectedResourceIdsGet: (selectedResourceIds: number[]) => void;
}) => {

    const { components: { Resource } } = useDojo();
    const { realmEntityId } = useRealmStore();

    return <div className="grid grid-cols-9 gap-2 p-2">
        <div className='flex flex-col items-center col-span-4'>
            <Headline className='mb-2'>You Give</Headline>
            <div className='grid grid-cols-4 gap-2'>
                {resources.map(({ id, trait: name }) => {
                    let resourceBalance = getComponentValue(Resource, Utils.getEntityIdFromKeys([BigInt(realmEntityId), BigInt(id)]))?.balance ?? 0;
                    return (
                        <SelectableResource
                            key={id}
                            resourceId={id}
                            amount={100}
                            disabled={resourceBalance === 0}
                            selected={selectedResourceIdsGive.includes(id)}
                            onClick={() => {
                                if (selectedResourceIdsGive.includes(id)) {
                                    setSelectedResourceIdsGive(selectedResourceIdsGive.filter((_id) => _id !== id));
                                } else {
                                    setSelectedResourceIdsGive([...selectedResourceIdsGive, id]);
                                }
                            }}
                        />
                    )
                })}
            </div>
        </div>
        <div className='flex items-center justify-center'>
            <ArrowSeparator />
        </div>
        <div className='flex flex-col items-center col-span-4'>
            <Headline className='mb-2'>You Get</Headline>
            <div className='grid grid-cols-4 gap-2'>
                {resources.map(({ id, trait: name }) => (
                    <SelectableResource
                        key={id}
                        resourceId={id}
                        amount={100}
                        selected={selectedResourceIdsGet.includes(id)}
                        disabled={selectedResourceIdsGive.includes(id)}
                        onClick={() => {
                            if (selectedResourceIdsGet.includes(id)) {
                                setSelectedResourceIdsGet(selectedResourceIdsGet.filter((_id) => _id !== id));
                            } else {
                                setSelectedResourceIdsGet([...selectedResourceIdsGet, id]);
                            }
                        }}
                    />
                ))}
            </div>
        </div>
    </div>
}

const SelectResourcesAmountPanel = ({ selectedResourceIdsGive, selectedResourceIdsGet, selectedResourcesGiveAmounts, selectedResourcesGetAmounts, resourceWeight, setSelectedResourcesGiveAmounts, setSelectedResourcesGetAmounts, setResourceWeight }: {
    selectedResourceIdsGive: number[];
    selectedResourceIdsGet: number[];
    selectedResourcesGiveAmounts: { [key: number]: number };
    selectedResourcesGetAmounts: { [key: number]: number };
    resourceWeight: number;
    setSelectedResourcesGiveAmounts: (selectedResourcesGiveAmounts: { [key: number]: number }) => void;
    setSelectedResourcesGetAmounts: (selectedResourcesGetAmounts: { [key: number]: number }) => void;
    setResourceWeight: (resourceWeight: number) => void;
}) => {

    const { components: { Resource } } = useDojo();
    const { realmEntityId } = useRealmStore();


    useEffect(() => {
        let weight = 0;
        for (const [resourceId, amount] of Object.entries(selectedResourcesGiveAmounts)) {
            weight += amount * 1;
        }
        setResourceWeight(weight);
    }, [selectedResourcesGiveAmounts])

    return <>
        <div className='grid grid-cols-9 gap-2 p-2'>
            <div className='flex flex-col items-center col-span-4 space-y-2'>
                <Headline className='mb-2'>You Give</Headline>
                {
                    selectedResourceIdsGive.map((id) => {
                        let resourceBalance = getComponentValue(Resource, Utils.getEntityIdFromKeys([BigInt(realmEntityId), BigInt(id)]))?.balance ?? 0;
                        return (
                            <div key={id} className='flex items-center w-full'>
                                <NumberInput max={resourceBalance} value={selectedResourcesGiveAmounts[id]} onChange={(value) => {
                                    setSelectedResourcesGiveAmounts({ ...selectedResourcesGiveAmounts, [id]: value });
                                }} />
                                <div className='ml-2'>
                                    <ResourceCost resourceId={id} amount={selectedResourcesGiveAmounts[id]} />
                                </div>
                                <div className={`ml-2 text-xs ${selectedResourcesGiveAmounts[id] <= resourceBalance ? "text-orange" : "text-red"} cursor-pointer`} onClick={() => {
                                    setSelectedResourcesGiveAmounts({ ...selectedResourcesGiveAmounts, [id]: resourceBalance })
                                }}>
                                    {`Max ${resourceBalance}`}
                                </div>
                            </div>
                        )
                    })
                }
            </div>
            <div className='flex items-center justify-center'>
                <ArrowSeparator />
            </div>
            <div className='flex flex-col items-center col-span-4 space-y-2'>
                <Headline className='mb-2'>You Get</Headline>
                {
                    selectedResourceIdsGet.map((id) => (
                        <div key={id} className='flex items-center w-full'>
                            <NumberInput max={100000} value={selectedResourcesGetAmounts[id]} onChange={(value) => {
                                setSelectedResourcesGetAmounts({ ...selectedResourcesGetAmounts, [id]: value });
                            }} />
                            <div className='ml-2'>
                                <ResourceCost resourceId={id} amount={selectedResourcesGetAmounts[id]} />
                            </div>
                        </div>
                    ))
                }
            </div>
        </div>
        <div className='flex text-xs text-center text-white'>
            Items Weight <div className='ml-1 text-gold'>{`${resourceWeight}kg`}</div>
        </div>
    </>
}

export const SelectCaravanPanel = ({ donkeysCount, setDonkeysCount, isNewCaravan, setIsNewCaravan, selectedCaravan, setSelectedCaravan, selectedResourceIdsGet, selectedResourceIdsGive, selectedResourcesGetAmounts, selectedResourcesGiveAmounts, resourceWeight }: {
    donkeysCount: number,
    setDonkeysCount: (donkeysCount: number) => void,
    isNewCaravan: boolean,
    setIsNewCaravan: (isNewCaravan: boolean) => void,
    selectedCaravan: number;
    setSelectedCaravan: (selectedCaravanId: number) => void;
    selectedResourceIdsGet: number[];
    selectedResourceIdsGive: number[];
    selectedResourcesGetAmounts: { [key: number]: number };
    selectedResourcesGiveAmounts: { [key: number]: number };
    resourceWeight: number;
}) => {
    const {
        components: { ArrivalTime, Position, Movable },
    } = useDojo();

    const { realmEntityId } = useRealmStore();
    const realmPosition = getComponentValue(Position, Utils.getEntityIdFromKeys([BigInt(realmEntityId)]));

    const { nextBlockTimestamp } = useBlockchainStore();

    const { data: caravanData, status } = useGetCaravans();
    let caravanIds: number[] = [];
    if (caravanData && status === FetchStatus.Success) {
        caravanData.entities?.forEach((entity) => {
            if (entity) {
                caravanIds.push(parseInt(entity.keys))
            }
        })
    }

    let myIdleCaravans: number[] = [];
    for (const caravanId of caravanIds) {
        let position = getComponentValue(Position, Utils.getEntityIdFromKeys([BigInt(caravanId)]));
        let arrivalTime = getComponentValue(ArrivalTime, Utils.getEntityIdFromKeys([BigInt(caravanId)]));
        let movable = getComponentValue(Movable, Utils.getEntityIdFromKeys([BigInt(caravanId)]));

        const isSamePosition = position && realmPosition && position.x === realmPosition.x && position.y === realmPosition.y;

        if (isSamePosition) {
            const isIdle = nextBlockTimestamp && ((arrivalTime && arrivalTime.arrives_at <= nextBlockTimestamp) || !arrivalTime) && movable && !movable.blocked;
            if (isIdle) {
                myIdleCaravans.push(caravanId);
            }
        }
    }

    return <div className='flex flex-col items-center w-full p-2'>
        <div className='grid grid-cols-9 gap-2'>
            <div className='flex flex-col items-center col-span-4 space-y-2 h-min'>
                <Headline className='mb-2'>You Give</Headline>
                <div className='flex items-center justify-center w-full'>
                    {
                        selectedResourceIdsGive.map((id) => (
                            <ResourceCost key={id} className='!w-min mx-2' resourceId={id} color='text-gold' type='vertical' amount={selectedResourcesGiveAmounts[id]} />
                        ))
                    }
                </div>

            </div>
            <div className='flex items-center justify-center'>
                <ArrowSeparator />
            </div>
            <div className='flex flex-col items-center col-span-4 space-y-2 h-min'>
                <Headline className='mb-2'>You Get</Headline>
                <div className='flex items-center justify-center w-full'>
                    {
                        selectedResourceIdsGet.map((id) => (
                            <ResourceCost key={id} className='!w-min mx-2' type='vertical' color='text-gold' resourceId={id} amount={selectedResourcesGetAmounts[id]} />
                        ))
                    }
                </div>
            </div>
        </div>
        <div className='flex mb-3 text-xs text-center text-white'>
            Items Weight <div className='ml-1 text-gold'>{`${resourceWeight}kg`}</div>
        </div>
        {isNewCaravan && <>
            <div className='flex flex-col'>
                <Headline className='mb-2'>Summon a New Caravan</Headline>
                <div className='grid grid-cols-9 gap-2 p-2'>
                    <div className='flex items-center col-span-3'>
                        <NumberInput value={donkeysCount} onChange={setDonkeysCount} max={1000} />
                        <Donkey className="ml-2" />
                        <div className='flex flex-col justify-center ml-2'>
                            <div className='text-xs font-bold text-white'>{donkeysCount}</div>
                            <div className='text-xs text-center text-white'>Donkeys</div>
                        </div>
                    </div>
                </div>
            </div>
            <div className='flex mb-1 text-xs text-center text-white'>
                Caravan Capacity <div className='ml-1 text-danger'>{`${donkeysCount * 100}kg`}</div>
            </div>
            <div className='flex items-center mb-1 text-xs text-center text-white'>
                <Danger /><div className='ml-1 uppercase text-danger'>Increase the amount of units</div>
            </div>
        </>}
        {!isNewCaravan && <div onClick={() => setIsNewCaravan(true)} className="w-full mx-4 h-8 py-[7px] bg-dark-brown cursor-pointer rounded justify-center items-center">
            <div className="text-xs text-center text-gold">+ New Caravan</div>
        </div>}
        {isNewCaravan && myIdleCaravans.length > 0 && <div className='flex flex-col w-full mt-2'>
            <Headline className='mb-2'>Or choose from existing Caravans</Headline>
        </div>}
        {isNewCaravan && myIdleCaravans.length > 0 && <div onClick={() => setIsNewCaravan(false)} className="w-full mx-4 h-8 py-[7px] bg-dark-brown cursor-pointer rounded justify-center items-center">
            <div className="text-xs text-center text-gold">{`Show ${myIdleCaravans.length} idle Caravans`}</div>
        </div>}
        {
            !isNewCaravan && <>
                {myIdleCaravans.map((caravanId) => <Caravan caravanId={caravanId} idleOnly={true} onClick={() => setSelectedCaravan(caravanId)} className={`w-full mb-2 border rounded-md ${selectedCaravan === caravanId ? 'border-yellow' : ''}`} />)}
            </>
        }
    </div>
}