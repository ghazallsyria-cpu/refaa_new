'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export type Period = {
  id: string;
  period_number: number;
  start_time: string;
  end_time: string;
};

export function usePeriodsSystem() {
  const [loading, setLoading] = useState(false);

  const fetchPeriods = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('class_periods')
        .select('*')
        .order('period_number');
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching periods:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const addPeriod = useCallback(async (period: Omit<Period, 'id'>) => {
    try {
      const response = await fetch('/api/periods/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(period),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to add period');
      return data;
    } catch (error) {
      console.error('Error adding period:', error);
      throw error;
    }
  }, []);

  const deletePeriod = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/periods/delete?id=${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete period');
    } catch (error) {
      console.error('Error deleting period:', error);
      throw error;
    }
  }, []);

  return {
    loading,
    fetchPeriods,
    addPeriod,
    deletePeriod
  };
}
