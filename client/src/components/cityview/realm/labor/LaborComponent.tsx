import { OrderIcon } from '../../../../elements/OrderIcon';
import Button from '../../../../elements/Button';
import { ResourceIcon } from '../../../../elements/ResourceIcon';
import { ResourcesIds, findResourceById, resources } from '../../../../constants/resources';
import { currencyFormat } from '../../../../utils/utils.jsx';
import { ReactComponent as Clock } from '../../../../assets/icons/common/clock.svg';
import { ReactComponent as Farm } from '../../../../assets/icons/common/farm.svg';
import { ReactComponent as Village } from '../../../../assets/icons/common/village.svg';

import ProgressBar from '../../../../elements/ProgressBar';
import { useDojo } from '../../../../DojoContext';
import useRealm from '../../../../hooks/store/useRealmStore';
import { useComponentValue } from '@dojoengine/react';
import { Utils } from '@dojoengine/core';
import { LaborConfig, Realm } from '../../../../types';
import useBlockchainStore from '../../../../hooks/store/useBlockchainStore';
import { calculateNextHarvest, calculateProductivity, formatSecondsInHoursMinutes } from './laborUtils';
import { useMemo } from 'react';

type LaborComponentProps = {
    resourceId: number
    realm: Realm | undefined
    laborConfig: LaborConfig | undefined
    onBuild: () => void;
}

export const LaborComponent = ({ resourceId, realm, laborConfig, onBuild, ...props }: LaborComponentProps) => {
    const {
        components: { Labor, Resource },
        systemCalls: { harvest_labor }
    } = useDojo();

    const { nextBlockTimestamp } = useBlockchainStore();

    let realmEntityId = useRealm((state) => state.realmEntityId);
    let labor = useComponentValue(Labor, Utils.getEntityIdFromKeys([BigInt(realmEntityId), BigInt(resourceId)]))
    let resource = useComponentValue(Resource, Utils.getEntityIdFromKeys([BigInt(realmEntityId), BigInt(resourceId)]))

    // time until the next possible harvest (that happens every 7200 seconds (2hrs))
    // if labor balance is less than current time, then there is no time to next harvest
    const timeLeftToHarvest = useMemo(() => {
        if (nextBlockTimestamp && labor && laborConfig && labor.last_harvest > 0) {
            if (labor.balance > nextBlockTimestamp) {
                const timeSinceLastHarvest = nextBlockTimestamp - labor.last_harvest;
                return laborConfig.base_labor_units - (timeSinceLastHarvest % laborConfig.base_labor_units);
            }
        }
        return undefined;
    }, [labor, laborConfig, nextBlockTimestamp]);

    // if the labor balance does not exist or is lower than the current time, 
    // then there is no labor left
    const laborLeft = useMemo(() => {
        if (nextBlockTimestamp && labor && laborConfig && labor.balance > nextBlockTimestamp) {
            let left = labor.balance - nextBlockTimestamp;
            return left < laborConfig.base_labor_units ? 0 : left;
        }
        return 0;
    }, [nextBlockTimestamp, labor]);

    const isFood = useMemo(() => [254, 255].includes(resourceId), [resourceId]);

    const nextHarvest = useMemo(() => {
        if (labor && laborConfig && nextBlockTimestamp) {
            return calculateNextHarvest(
                labor.balance,
                labor.last_harvest,
                labor.multiplier,
                laborConfig.base_labor_units,
                isFood ? laborConfig.base_food_per_cycle : laborConfig.base_resources_per_cycle,
                nextBlockTimestamp);
        } else {
            return 0;
        }
    }, [labor, laborConfig, nextBlockTimestamp]);

    return (
        <div className='relative flex flex-col border rounded-md border-gray-gold text-xxs text-gray-gold'>
            <div className='absolute top-0 left-0 flex items-center px-1 italic border border-t-0 border-l-0 text-white/70 rounded-tl-md bg-black/60 rounded-br-md border-gray-gold'>
                {findResourceById(resourceId)?.trait}
            </div>
            <div className='grid grid-cols-6'>
                <img src={`/images/resources/${resourceId}.jpg`} className='object-cover w-full h-full rounded-md' />
                <div className='flex flex-col w-full h-full col-span-5 p-2 text-white/70'>
                    <div className='flex items-center mb-2'>
                        <ResourceIcon resource={findResourceById(resourceId)?.trait as any} size='sm' />
                        <div className='ml-2 text-xs font-bold text-white'>{currencyFormat(resource ? resource.balance : 0)}</div>
                        <div className='flex items-center ml-auto'>
                            {isFood && <Village />}
                            {/* // DISCUSS: when there is no labor anymore, it means full decay of the buildings, so it should be multiplier 0 */}
                            {resourceId == ResourcesIds['Wheat'] && <div className='px-2'>{`${laborLeft > 0 && labor ? labor.multiplier : 0}/${realm?.rivers}`}</div>}
                            {resourceId == ResourcesIds['Fish'] && <div className='px-2'>{`${laborLeft > 0 && labor ? labor.multiplier : 0}/${realm?.harbors}`}</div>}
                            {/* // TODO: show visual cue that it's disabled */}
                            <Button variant='outline' className='px-2 py-1' onClick={onBuild} disabled={isFood && laborLeft > 0} >{isFood ? `Build` : `Buy Tools`}</Button>
                        </div>
                    </div>
                    <ProgressBar rounded progress={laborConfig && timeLeftToHarvest ? 100 - timeLeftToHarvest / laborConfig.base_labor_units * 100 : 0} className='bg-white' />
                    <div className='flex items-center mt-2'>
                        <><Clock />
                            <div className='ml-1 italic text-white/70'>{laborLeft ? `${formatSecondsInHoursMinutes(laborLeft)} left` : 'No Labor'}</div></>

                        <div className='flex items-center mx-auto text-white/70'>
                            {laborConfig && labor && laborLeft > 0 ? `+${calculateProductivity(isFood ? laborConfig.base_food_per_cycle : laborConfig.base_resources_per_cycle, labor.multiplier, laborConfig.base_labor_units).toFixed(0)}` : '+0'}
                            <ResourceIcon containerClassName='mx-0.5' className='!w-[12px]' resource={findResourceById(resourceId)?.trait as any} size='xs' />
                            /h
                        </div>

                        <><ResourceIcon resource={findResourceById(resourceId)?.trait as any} size='xs' className='!w-[12px]' />
                            <div className='mx-1 text-brilliance'>{`+${nextHarvest}`}</div></>
                        {/* // TODO: visual cue to show disabled? */}
                        <Button className='!px-[6px] !py-[2px] text-xxs' variant='success' disabled={nextHarvest === 0} onClick={() => { harvest_labor({ realm_id: realmEntityId, resource_type: resourceId }) }}>Harvest</Button>
                    </div>
                </div>
            </div>
        </div >
    );
};


// TODO: move to utils
const formatTimeLeft = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    return `${hours}h:${minutes}m`;
};