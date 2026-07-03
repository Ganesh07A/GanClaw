import { UUID } from "crypto";

export interface PlanStep {
    id: string,
    title: string,
    description: string,
    hints?: string[],
    complexity: 'low'| 'medium'| 'high' | 'very_high',
}

export interface Plan {
    goal: string,
    reserachSummary?:string,
    steps: PlanStep[]
}