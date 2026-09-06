import { useCallback, useEffect, useRef, useState } from 'react';
import { toAppError, type AppError } from '@/shared/errors';
import { useRefreshController } from '@/hooks/use-refresh-controller';
import { getStudentGroupsState, listGroupAdminState } from './api';
import type { GroupAdminState, StudentGroupState } from './types';

const EMPTY_STUDENT_STATE: StudentGroupState = {
  student_email: '',
  student_erp: '',
  current_group_id: null,
  groups: [],
  roster: [],
  my_join_request: null,
  incoming_join_requests: [],
};

const EMPTY_ADMIN_STATE: GroupAdminState = {
  viewer_email: '',
  groups: [],
  roster: [],
  join_requests: [],
};

export const useStudentGroupsState = (enabled: boolean) => {
  const [data, setData] = useState<StudentGroupState>(EMPTY_STUDENT_STATE);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<AppError | null>(null);
  const hasLoadedOnceRef = useRef(false);

  const fetchData = useCallback(async (mode: 'initial' | 'background') => {
    const showInitialLoader = mode === 'initial' && !hasLoadedOnceRef.current;
    if (showInitialLoader) setIsLoading(true);
    setError(null);
    try {
      setData(await getStudentGroupsState());
      hasLoadedOnceRef.current = true;
    } catch (err) {
      setError(toAppError(err, 'student_groups_state_fetch_failed'));
    } finally {
      if (showInitialLoader) setIsLoading(false);
    }
  }, []);

  const { requestRefresh, isUpdating } = useRefreshController(fetchData, enabled);

  const refetch = useCallback(() => requestRefresh('background'), [requestRefresh]);

  useEffect(() => {
    if (!enabled) {
      setData(EMPTY_STUDENT_STATE);
      setIsLoading(false);
      return;
    }
    void requestRefresh('initial');
  }, [enabled, requestRefresh]);

  return { data, setData, isLoading, isUpdating, error, refetch };
};

export const useGroupAdminState = (enabled = true) => {
  const [data, setData] = useState<GroupAdminState>(EMPTY_ADMIN_STATE);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<AppError | null>(null);
  const hasLoadedOnceRef = useRef(false);

  const fetchData = useCallback(async (mode: 'initial' | 'background') => {
    const showInitialLoader = mode === 'initial' && !hasLoadedOnceRef.current;
    if (showInitialLoader) setIsLoading(true);
    setError(null);
    try {
      setData(await listGroupAdminState());
      hasLoadedOnceRef.current = true;
    } catch (err) {
      setError(toAppError(err, 'group_admin_state_fetch_failed'));
    } finally {
      if (showInitialLoader) setIsLoading(false);
    }
  }, []);

  const { requestRefresh, isUpdating } = useRefreshController(fetchData, enabled);

  const refetch = useCallback(() => requestRefresh('background'), [requestRefresh]);

  useEffect(() => {
    if (!enabled) {
      setData(EMPTY_ADMIN_STATE);
      setIsLoading(false);
      return;
    }
    void requestRefresh('initial');
  }, [enabled, requestRefresh]);

  return { data, setData, isLoading, isUpdating, error, refetch };
};
