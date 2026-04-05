import { useEffect, useState } from 'react';
import { useCircle } from '../contexts/CircleContext';
import { getCircleMembers } from '../services/circleService';
import type { CircleMember } from '../types';

export function useCircleMembers() {
  const { activeCircle } = useCircle();
  const [members, setMembers] = useState<CircleMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeCircle) {
      setMembers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    getCircleMembers(activeCircle.id)
      .then(setMembers)
      .finally(() => setLoading(false));
  }, [activeCircle?.id]);

  return { members, loading };
}
