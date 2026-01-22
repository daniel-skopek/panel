import http, { FractalResponseData, FractalResponseList } from '@/api/http';

export interface UserServerGroup {
    id: number;
    uuid: string;
    name: string;
    order: number;
}

export const rawDataToUserServerGroup = (data: FractalResponseData): UserServerGroup => ({
    id: data.attributes.id,
    uuid: data.attributes.uuid,
    name: data.attributes.name,
    order: data.attributes.order,
});

export const getServerGroups = (): Promise<UserServerGroup[]> => {
    return http
        .get('/api/client/account/server-groups')
        .then(({ data }) => (data.data || []).map(rawDataToUserServerGroup));
};

export const createServerGroup = (name: string): Promise<UserServerGroup> => {
    return http.post('/api/client/account/server-groups', { name }).then(({ data }) => rawDataToUserServerGroup(data));
};

export const updateServerGroup = (id: number, name: string): Promise<UserServerGroup> => {
    return http
        .patch(`/api/client/account/server-groups/${id}`, { name })
        .then(({ data }) => rawDataToUserServerGroup(data));
};

export const deleteServerGroup = (id: number): Promise<void> => {
    return http.delete(`/api/client/account/server-groups/${id}`);
};

export const reorderServerGroups = (groups: { id: number; order: number }[]): Promise<void> => {
    return http.post('/api/client/account/server-groups/reorder', { groups });
};

export const updateServerPreferences = (
    servers: { server_id: number | string; group_id: number | null; order: number }[]
): Promise<void> => {
    return http.post('/api/client/account/server-preferences', { servers });
};
