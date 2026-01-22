import { Dispatch, SetStateAction, useEffect, useState } from 'react';

export function usePersistedState<S>(key: string, defaultValue: S): [S, Dispatch<SetStateAction<S>>] {
    const [state, setState] = useState<S>(() => {
        try {
            const item = localStorage.getItem(key);

            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.warn('Failed to retrieve persisted value from store.', e);

            return defaultValue;
        }
    });

    useEffect(() => {
        localStorage.setItem(key, JSON.stringify(state));
    }, [key, state]);

    return [state, setState];
}
