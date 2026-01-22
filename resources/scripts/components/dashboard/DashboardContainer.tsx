import React, { useEffect, useMemo, useState } from 'react';
import { Server } from '@/api/server/getServer';
import getServers from '@/api/getServers';
import ServerRow from '@/components/dashboard/ServerRow';
import Spinner from '@/components/elements/Spinner';
import PageContentBlock from '@/components/elements/PageContentBlock';
import useFlash from '@/plugins/useFlash';
import { useStoreState } from 'easy-peasy';
import { usePersistedState } from '@/plugins/usePersistedState';
import Switch from '@/components/elements/Switch';
import useSWR from 'swr';
import { PaginatedResult } from '@/api/http';
import Pagination from '@/components/elements/Pagination';
import { useLocation } from 'react-router-dom';
import { getServerGroups, updateServerPreferences, UserServerGroup } from '@/api/account/serverGroups';
import { Button } from '@/components/elements/button/index';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/solid';
import ManageGroupsModal from '@/components/dashboard/ManageGroupsModal';

export default () => {
    const { search } = useLocation();
    const defaultPage = Number(new URLSearchParams(search).get('page') || '1');

    const [page, setPage] = useState(!isNaN(defaultPage) && defaultPage > 0 ? defaultPage : 1);
    const { clearFlashes, clearAndAddHttpError } = useFlash();
    const uuid = useStoreState((state) => state.user.data!.uuid);
    const rootAdmin = useStoreState((state) => state.user.data!.rootAdmin);
    const [showOnlyAdmin, setShowOnlyAdmin] = usePersistedState(`${uuid}:show_all_servers`, false);
    const [collapsedGroups, setCollapsedGroups] = usePersistedState<number[]>(`${uuid}:collapsed_groups`, []);
    const [manageGroups, setManageGroups] = useState(false);
    const [reorderMode, setReorderMode] = useState(false);

    const {
        data: servers,
        error,
        mutate: mutateServers,
    } = useSWR<PaginatedResult<Server>>(['/api/client/servers', showOnlyAdmin && rootAdmin, page], () =>
        getServers({ page, type: showOnlyAdmin && rootAdmin ? 'admin' : undefined })
    );

    const { data: groups } = useSWR<UserServerGroup[]>('/api/client/account/server-groups', getServerGroups);

    useEffect(() => {
        if (!servers) return;
        if (servers.pagination.currentPage > 1 && !servers.items.length) {
            setPage(1);
        }
    }, [servers?.pagination.currentPage]);

    useEffect(() => {
        // Don't use react-router to handle changing this part of the URL, otherwise it
        // triggers a needless re-render. We just want to track this in the URL incase the
        // user refreshes the page.
        window.history.replaceState(null, document.title, `/${page <= 1 ? '' : `?page=${page}`}`);
    }, [page]);

    useEffect(() => {
        if (error) clearAndAddHttpError({ key: 'dashboard', error });
        if (!error) clearFlashes('dashboard');
    }, [error]);

    const toggleGroup = (id: number) => {
        setCollapsedGroups((s) => (s.includes(id) ? s.filter((v) => v !== id) : [...s, id]));
    };

    const groupedServers = useMemo(() => {
        if (!servers) return [];

        const g: Record<number, Server[]> = { 0: [] };
        groups?.forEach((group) => {
            g[group.id] = [];
        });

        servers.items.forEach((server) => {
            const groupId = server.userPreference?.groupId ?? 0;
            if (g[groupId] === undefined) {
                g[0].push(server);
            } else {
                g[groupId].push(server);
            }
        });

        Object.keys(g).forEach((key) => {
            g[Number(key)].sort((a, b) => (a.userPreference?.order ?? 0) - (b.userPreference?.order ?? 0));
        });

        const result =
            groups
                ?.map((group) => ({
                    group,
                    servers: g[group.id],
                }))
                .filter((v) => v.servers.length > 0) || [];

        if (g[0].length > 0) {
            result.push({
                group: { id: 0, name: 'Ungrouped', order: 999, uuid: '' },
                servers: g[0],
            });
        }

        return result.sort((a, b) => a.group.order - b.group.order);
    }, [servers, groups]);

    const moveServer = (serverId: number | string, groupId: number | null, direction: 'up' | 'down' | 'none') => {
        const groupServers = groupedServers.find((gs) => gs.group.id === (groupId ?? 0))?.servers || [];
        const index = groupServers.findIndex((s) => s.internalId === serverId);

        if (direction !== 'none') {
            if (index === -1) return;
            const newServers = [...groupServers];
            const targetIndex = direction === 'up' ? index - 1 : index + 1;
            if (targetIndex < 0 || targetIndex >= newServers.length) return;
            [newServers[index], newServers[targetIndex]] = [newServers[targetIndex], newServers[index]];

            const payload = newServers.map((s, i) => ({
                server_id: s.internalId,
                group_id: groupId,
                order: i,
            }));

            updateServerPreferences(payload)
                .then(() => mutateServers())
                .catch((error) => clearAndAddHttpError({ key: 'dashboard', error }));
        } else {
            updateServerPreferences([
                {
                    server_id: serverId,
                    group_id: groupId === 0 ? null : groupId,
                    order: 0,
                },
            ])
                .then(() => mutateServers())
                .catch((error) => clearAndAddHttpError({ key: 'dashboard', error }));
        }
    };

    return (
        <PageContentBlock title={'Dashboard'} showFlashKey={'dashboard'}>
            <ManageGroupsModal
                visible={manageGroups}
                onDismissed={() => setManageGroups(false)}
                groups={groups || []}
            />
            <div className={'mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center'}>
                <div className={'flex items-center mb-2 sm:mb-0'}>
                    <Button.Text onClick={() => setManageGroups(true)} className={'mr-2'}>
                        Manage Groups
                    </Button.Text>
                    <Button.Text onClick={() => setReorderMode((s) => !s)}>
                        {reorderMode ? 'Finish Reordering' : 'Reorder Servers'}
                    </Button.Text>
                </div>
                {rootAdmin && (
                    <div className={'flex items-center'}>
                        <p className={'uppercase text-xs text-neutral-400 mr-2'}>
                            {showOnlyAdmin ? "Showing others' servers" : 'Showing your servers'}
                        </p>
                        <Switch
                            name={'show_all_servers'}
                            defaultChecked={showOnlyAdmin}
                            onChange={() => setShowOnlyAdmin((s) => !s)}
                        />
                    </div>
                )}
            </div>
            {!servers ? (
                <Spinner centered size={'large'} />
            ) : (
                <Pagination data={servers} onPageSelect={setPage}>
                    {({ items }) =>
                        groupedServers.length > 0 ? (
                            groupedServers.map(({ group, servers: groupItems }) => (
                                <div key={group.id} className={'mb-4'}>
                                    {group.id !== 0 && (
                                        <button
                                            className={
                                                'flex items-center w-full bg-neutral-700 p-3 rounded mb-2 hover:bg-neutral-600 transition-colors'
                                            }
                                            onClick={() => toggleGroup(group.id)}
                                        >
                                            <div className={'mr-4'}>
                                                {collapsedGroups.includes(group.id) ? (
                                                    <ChevronDownIcon className={'w-5 h-5'} />
                                                ) : (
                                                    <ChevronUpIcon className={'w-5 h-5'} />
                                                )}
                                            </div>
                                            <p className={'font-header font-medium uppercase text-sm'}>{group.name}</p>
                                            <p className={'ml-auto text-xs text-neutral-400'}>
                                                {groupItems.length} server{groupItems.length === 1 ? '' : 's'}
                                            </p>
                                        </button>
                                    )}
                                    {!collapsedGroups.includes(group.id) &&
                                        groupItems.map((server, index) => (
                                            <div key={server.uuid} className={'relative group'}>
                                                <ServerRow
                                                    server={server}
                                                    className={index > 0 || group.id !== 0 ? 'mt-2' : undefined}
                                                />
                                                {reorderMode && (
                                                    <div
                                                        className={
                                                            'absolute top-0 right-0 h-full flex items-center pr-8 pointer-events-none z-30'
                                                        }
                                                    >
                                                        <div
                                                            className={
                                                                'flex items-center bg-black/50 p-1 rounded pointer-events-auto'
                                                            }
                                                        >
                                                            <Button.Text
                                                                size={Button.Sizes.Small}
                                                                disabled={index === 0}
                                                                onClick={() =>
                                                                    moveServer(
                                                                        server.internalId,
                                                                        group.id || null,
                                                                        'up'
                                                                    )
                                                                }
                                                                className={'mr-1'}
                                                            >
                                                                <ChevronUpIcon className={'w-4 h-4'} />
                                                            </Button.Text>
                                                            <Button.Text
                                                                size={Button.Sizes.Small}
                                                                disabled={index === groupItems.length - 1}
                                                                onClick={() =>
                                                                    moveServer(
                                                                        server.internalId,
                                                                        group.id || null,
                                                                        'down'
                                                                    )
                                                                }
                                                                className={'mr-2'}
                                                            >
                                                                <ChevronDownIcon className={'w-4 h-4'} />
                                                            </Button.Text>
                                                            <select
                                                                className={
                                                                    'bg-neutral-800 text-xs rounded border-none py-1 pl-2 pr-6'
                                                                }
                                                                value={group.id}
                                                                onChange={(e) =>
                                                                    moveServer(
                                                                        server.internalId,
                                                                        Number(e.target.value) || null,
                                                                        'none'
                                                                    )
                                                                }
                                                            >
                                                                <option value={0}>No Group</option>
                                                                {groups?.map((g) => (
                                                                    <option key={g.id} value={g.id}>
                                                                        {g.name}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                </div>
                            ))
                        ) : (
                            <p className={'text-center text-sm text-neutral-400'}>
                                {showOnlyAdmin
                                    ? 'There are no other servers to display.'
                                    : 'There are no servers associated with your account.'}
                            </p>
                        )
                    }
                </Pagination>
            )}
        </PageContentBlock>
    );
};
