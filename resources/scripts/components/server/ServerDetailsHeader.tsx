import React, { memo } from 'react';
import { ServerContext } from '@/state/server';
import isEqual from 'react-fast-compare';
import Can from '@/components/elements/Can';
import PowerButtons from '@/components/server/console/PowerButtons';

interface Props {
    showPowerButtons?: boolean;
}

const ServerDetailsHeader = ({ showPowerButtons }: Props) => {
    const name = ServerContext.useStoreState((state) => state.server.data!.name);
    const description = ServerContext.useStoreState((state) => state.server.data!.description);

    return (
        <div className={'grid grid-cols-4 gap-4 mb-4'}>
            <div className={showPowerButtons ? 'hidden sm:block sm:col-span-2 lg:col-span-3 pr-4' : 'col-span-4'}>
                <h1 className={'font-header font-medium text-2xl text-gray-50 leading-relaxed line-clamp-1'}>{name}</h1>
                <p className={'text-sm line-clamp-2'}>{description}</p>
            </div>
            {showPowerButtons && (
                <div className={'col-span-4 sm:col-span-2 lg:col-span-1 self-end'}>
                    <Can action={['control.start', 'control.stop', 'control.restart']} matchAny>
                        <PowerButtons className={'flex sm:justify-end space-x-2'} />
                    </Can>
                </div>
            )}
        </div>
    );
};

export default memo(ServerDetailsHeader, isEqual);
