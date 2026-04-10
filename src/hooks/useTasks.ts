import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCircle } from '../contexts/CircleContext';
import { subscribeTasks } from '../services/taskService';
import { canUserSeeTask } from '../utils/taskVisibility';
import type { Task } from '../types';

export function useTasks() {
  const { userProfile } = useAuth();
  const { activeCircle, role } = useCircle();
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!activeCircle) {
      setAllTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeTasks(
      activeCircle.id,
      (data) => {
        setAllTasks(data);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [activeCircle?.id]);

  const tasks = useMemo(() => {
    if (!userProfile) return allTasks;
    return allTasks.filter((task) => canUserSeeTask(task, userProfile.uid, role));
  }, [allTasks, userProfile, role]);

  return { tasks, loading, error };
}
