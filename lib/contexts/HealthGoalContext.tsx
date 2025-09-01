import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { HealthGoal, getDefaultHealthGoal, getHealthGoalById } from '../health-goals';

interface HealthGoalContextType {
  selectedGoal: HealthGoal;
  setSelectedGoal: (goal: HealthGoal) => void;
  updateGoalById: (goalId: string) => void;
}

const HealthGoalContext = createContext<HealthGoalContextType | undefined>(undefined);

interface HealthGoalProviderProps {
  children: ReactNode;
}

export const HealthGoalProvider: React.FC<HealthGoalProviderProps> = ({ children }) => {
  const [selectedGoal, setSelectedGoalState] = useState<HealthGoal>(getDefaultHealthGoal());

  // Load health goal from localStorage on mount
  useEffect(() => {
    try {
      const savedGoalId = localStorage.getItem('userHealthGoal');
      if (savedGoalId) {
        const goal = getHealthGoalById(savedGoalId);
        if (goal) {
          setSelectedGoalState(goal);
        }
      }
    } catch (error) {
      console.warn('Failed to load health goal from localStorage:', error);
    }
  }, []);

  const setSelectedGoal = (goal: HealthGoal) => {
    setSelectedGoalState(goal);
    try {
      localStorage.setItem('userHealthGoal', goal.id);
    } catch (error) {
      console.warn('Failed to save health goal to localStorage:', error);
    }
  };

  const updateGoalById = (goalId: string) => {
    const goal = getHealthGoalById(goalId);
    if (goal) {
      setSelectedGoal(goal);
    }
  };

  return (
    <HealthGoalContext.Provider value={{ selectedGoal, setSelectedGoal, updateGoalById }}>
      {children}
    </HealthGoalContext.Provider>
  );
};

export const useHealthGoal = (): HealthGoalContextType => {
  const context = useContext(HealthGoalContext);
  if (context === undefined) {
    throw new Error('useHealthGoal must be used within a HealthGoalProvider');
  }
  return context;
};
