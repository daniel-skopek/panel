import React, { useState } from 'react';
import { Dialog } from '@/components/elements/dialog';
import { Button } from '@/components/elements/button/index';
import {
    createServerGroup,
    deleteServerGroup,
    reorderServerGroups,
    updateServerGroup,
    UserServerGroup,
} from '@/api/account/serverGroups';
import useFlash from '@/plugins/useFlash';
import { mutate } from 'swr';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashAlt, faArrowUp, faArrowDown } from '@fortawesome/free-solid-svg-icons';
import Input from '@/components/elements/Input';

interface Props {
    visible: boolean;
    onDismissed: () => void;
    groups: UserServerGroup[];
}

export default ({ visible, onDismissed, groups }: Props) => {
    const { addError, clearFlashes } = useFlash();
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [editing, setEditing] = useState<number | null>(null);
    const [editName, setEditName] = useState('');

    const onCreateGroup = () => {
        if (!name.length) return;
        setLoading(true);
        clearFlashes('groups');
        createServerGroup(name)
            .then(() => {
                setName('');
                mutate('/api/client/account/server-groups');
            })
            .catch((error) => addError({ key: 'groups', message: error.message }))
            .then(() => setLoading(false));
    };

    const onDeleteGroup = (id: number) => {
        if (!confirm('Are you sure you want to delete this group? Servers will be moved to Ungrouped.')) return;
        setLoading(true);
        deleteServerGroup(id)
            .then(() => mutate('/api/client/account/server-groups'))
            .catch((error) => addError({ key: 'groups', message: error.message }))
            .then(() => setLoading(false));
    };

    const onReorder = (id: number, direction: 'up' | 'down') => {
        const index = groups.findIndex((g) => g.id === id);
        if (index === -1) return;
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === groups.length - 1) return;

        const newGroups = [...groups];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        [newGroups[index], newGroups[targetIndex]] = [newGroups[targetIndex], newGroups[index]];

        const payload = newGroups.map((g, i) => ({ id: g.id, order: i }));
        reorderServerGroups(payload)
            .then(() => mutate('/api/client/account/server-groups'))
            .catch((error) => addError({ key: 'groups', message: error.message }));
    };

    const onRename = (id: number) => {
        if (!editName.length) return;
        setLoading(true);
        updateServerGroup(id, editName)
            .then(() => {
                setEditing(null);
                mutate('/api/client/account/server-groups');
            })
            .catch((error) => addError({ key: 'groups', message: error.message }))
            .then(() => setLoading(false));
    };

    return (
        <Dialog
            open={visible}
            onClose={onDismissed}
            title={'Manage Server Groups'}
            description={'Create, rename, or delete your server groups.'}
        >
            <div className={'mt-6'}>
                <div className={'flex items-center mb-6'}>
                    <Input
                        placeholder={'Group Name'}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && onCreateGroup()}
                    />
                    <Button onClick={onCreateGroup} disabled={loading || !name.length} className={'ml-4'}>
                        Create
                    </Button>
                </div>
                {groups.map((group, index) => (
                    <div key={group.id} className={'flex items-center bg-neutral-900 p-3 rounded mb-2'}>
                        {editing === group.id ? (
                            <div className={'flex-1 flex items-center'}>
                                <Input
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && onRename(group.id)}
                                    className={'mr-2'}
                                />
                                <Button.Text onClick={() => setEditing(null)} className={'mr-2'}>
                                    Cancel
                                </Button.Text>
                                <Button onClick={() => onRename(group.id)}>Save</Button>
                            </div>
                        ) : (
                            <>
                                <div className={'flex-1'}>
                                    <p className={'font-medium'}>{group.name}</p>
                                </div>
                                <div className={'flex items-center'}>
                                    <Button.Text
                                        onClick={() => {
                                            setEditing(group.id);
                                            setEditName(group.name);
                                        }}
                                        className={'mr-2'}
                                    >
                                        Rename
                                    </Button.Text>
                                    <Button.Text
                                        disabled={index === 0}
                                        onClick={() => onReorder(group.id, 'up')}
                                        className={'mr-1'}
                                    >
                                        <FontAwesomeIcon icon={faArrowUp} />
                                    </Button.Text>
                                    <Button.Text
                                        disabled={index === groups.length - 1}
                                        onClick={() => onReorder(group.id, 'down')}
                                        className={'mr-2'}
                                    >
                                        <FontAwesomeIcon icon={faArrowDown} />
                                    </Button.Text>
                                    <Button.Danger
                                        variant={Button.Variants.Secondary}
                                        onClick={() => onDeleteGroup(group.id)}
                                    >
                                        <FontAwesomeIcon icon={faTrashAlt} />
                                    </Button.Danger>
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
            <Dialog.Footer>
                <Button.Text onClick={onDismissed}>Close</Button.Text>
            </Dialog.Footer>
        </Dialog>
    );
};
