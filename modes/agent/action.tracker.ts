import { randomUUID } from "crypto";
import type { ActionLog, ActionStatus } from "./types.ts";
import { isMutationType } from "./types.ts";



export class ActionTracker {
    private actions: ActionLog[] = [];

    //we create some methods to perfome
    log( entry: Omit<ActionLog, "id" | "timestamp"> & {
        id?: string;
        timestamp?: Date
    }): ActionLog {
        const log: ActionLog = {
            id: entry.id || randomUUID(),
            timestamp: entry.timestamp || new Date(),
            type: entry.type,
            path: entry.path,
            details: entry.details,
            status: entry.status,
            userApproved: entry.userApproved,
        };

        this.actions.push(log);
        return log;
    }

    getActions(): ActionLog[] {
        return this.actions;
    }

    getPendingMutataions(): ActionLog[] {
        return this.actions.filter(
            (action) => action.status === "pending" && isMutationType(action.type)
        );
    }

    updateStaus(id: string, status: ActionStatus, userApproved?: boolean): boolean {
        const action = this.actions.find((a) => a.id === id);
        if (action) {
            action.status = status;
            if (userApproved != null) {
                action.userApproved = userApproved;
            }
            return true;
        }

        return false;
    }
}