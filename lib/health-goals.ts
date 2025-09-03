export interface HealthGoal {
  id: string;
  name: string;
  description: string;
  icon: string;
  targetCalories?: number;
  proteinMultiplier?: number;
  restrictions?: string[];
}

export const HEALTH_GOALS: HealthGoal[] = [
  {
    id: 'general-wellness',
    name: 'General Wellness',
    description: 'Default balanced approach to healthy eating',
    icon: '🌟',
    targetCalories: 2000,
    proteinMultiplier: 1.0,
  },
  {
    id: 'weight-loss',
    name: 'Weight Loss',
    description: 'Reduce calories while maintaining nutrition',
    icon: '⚖️',
    targetCalories: 1800,
    proteinMultiplier: 1.2,
  },
  {
    id: 'muscle-gain',
    name: 'Muscle Gain',
    description: 'Increase protein and calories for muscle building',
    icon: '💪',
    targetCalories: 2400,
    proteinMultiplier: 1.8,
  },
  {
    id: 'maintenance',
    name: 'Health Maintenance',
    description: 'Balanced nutrition for overall wellness',
    icon: '🏃',
    targetCalories: 2000,
    proteinMultiplier: 1.0,
  },
  {
    id: 'heart-health',
    name: 'Heart Health',
    description: 'Low sodium, healthy fats focus',
    icon: '❤️',
    restrictions: ['low-sodium', 'omega-3-rich'],
  },
];

// Helper function to get health goal by ID
export const getHealthGoalById = (id: string): HealthGoal | undefined => {
  return HEALTH_GOALS.find(goal => goal.id === id);
};

// Helper function to get default health goal
export const getDefaultHealthGoal = (): HealthGoal => {
  return HEALTH_GOALS[2]; // Health Maintenance as default
};
