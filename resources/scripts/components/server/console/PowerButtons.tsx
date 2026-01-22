import React, { useEffect, useState } from 'react';
import { Button } from '@/components/elements/button/index';
import Can from '@/components/elements/Can';
import { ServerContext } from '@/state/server';
import { PowerAction } from '@/components/server/console/ServerConsoleContainer';
import { Dialog } from '@/components/elements/dialog';

interface PowerButtonProps {
    className?: string;
}

export default ({ className }: PowerButtonProps) => {
    const [action, setAction] = useState<PowerAction | null>(null);
    const name = ServerContext.useStoreState((state) => state.server.data!.name);
    const status = ServerContext.useStoreState((state) => state.status.value);
    const instance = ServerContext.useStoreState((state) => state.socket.instance);

    const killable = status === 'stopping';
    const onButtonClick = (action: PowerAction, e: React.MouseEvent<HTMLButtonElement, MouseEvent>): void => {
        e.preventDefault();
        if (action === 'start' || (action === 'restart' && status === 'offline')) {
            instance && instance.send('set state', action);
        } else {
            setAction(action);
        }
    };

    useEffect(() => {
        if (status === 'offline') {
            setAction(null);
        }
    }, [status]);

    const onConfirmAction = (): void => {
        if (instance && action) {
            instance.send('set state', action);
        }
        setAction(null);
    };

    return (
        <div className={className}>
            <Dialog.Confirm
                open={!!action}
                hideCloseIcon
                onClose={() => setAction(null)}
                title={
                    action === 'kill' ? (
                        <>
                            Forcibly Stop Process: <span className={'font-bold'}>{name}</span>
                        </>
                    ) : action === 'restart' ? (
                        <>
                            Restart Server: <span className={'font-bold'}>{name}</span>
                        </>
                    ) : (
                        <>
                            Stop Server: <span className={'font-bold'}>{name}</span>
                        </>
                    )
                }
                confirm={'Continue'}
                onConfirmed={onConfirmAction}
            >
                {action === 'kill' ? (
                    <>
                        Forcibly stopping <span className={'font-bold'}>{name}</span> can lead to data corruption.
                    </>
                ) : action === 'restart' ? (
                    <>
                        Are you sure you want to restart <span className={'font-bold'}>{name}</span>? This will stop all
                        running processes.
                    </>
                ) : (
                    <>
                        Are you sure you want to stop <span className={'font-bold'}>{name}</span>?
                    </>
                )}
            </Dialog.Confirm>
            <Can action={'control.start'}>
                <Button
                    className={'flex-1'}
                    disabled={status !== 'offline'}
                    onClick={onButtonClick.bind(this, 'start')}
                >
                    Start
                </Button>
            </Can>
            <Can action={'control.restart'}>
                <Button.Text className={'flex-1'} disabled={!status} onClick={onButtonClick.bind(this, 'restart')}>
                    Restart
                </Button.Text>
            </Can>
            <Can action={'control.stop'}>
                <Button.Danger
                    className={'flex-1'}
                    disabled={status === 'offline'}
                    onClick={onButtonClick.bind(this, killable ? 'kill' : 'stop')}
                >
                    {killable ? 'Kill' : 'Stop'}
                </Button.Danger>
            </Can>
        </div>
    );
};
