import { useEffect, useState } from 'react';
import { useCircle } from '../contexts/CircleContext';
import { subscribeTasks } from '../services/taskService';
import type { Task } from '../types';

export function useTasks() {
  const { activeCircle } = useCircle();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!activeCircle) {
      setTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeTasks(
      activeCircle.id,
      (data) => {
        setTasks(data);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [activeCircle?.id]);

  return { tasks, loading, error };
}
