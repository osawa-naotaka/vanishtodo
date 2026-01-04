import type { Task } from "../../type/types";
import { dayDifference } from "../lib/date";

type LimitOptions = {
    heavy: number;
    medium: number;
    light: number;
};

export function generateLimitter<T>(ext: (t: T) => Task) {
    function tasksToday(today: string, opt: LimitOptions, tasks: T[]): T[] {
        const pre = process(sortByCreatedDate("asc")(tasks), or(isIncomplete, isCompleteToday(today)));
        const limited = limit(opt)(pre);
        return process(sortByCreatedDate("asc")(limited), isIncomplete);
    }

    function limit(opt: LimitOptions): (tasks: T[]) => T[] {
        return (tasks: T[]) => {
            const heavy_tasks = tasks.filter((task) => ext(task).data.weight === "heavy").slice(0, opt.heavy);
            const medium_tasks = tasks.filter((task) => ext(task).data.weight === "medium").slice(0, opt.medium);
            const light_tasks = tasks.filter((task) => ext(task).data.weight === "light").slice(0, opt.light);
            const due_date_tasks = tasks.filter((task) => ext(task).data.weight === undefined);
            return [...heavy_tasks, ...medium_tasks, ...light_tasks, ...due_date_tasks];
        };
    }

    function sortByUpdatedDate(opt: "asc" | "desc"): (tasks: T[]) => T[] {
        return (tasks: T[]) => {
            return tasks.sort((a, b) => {
                const da = new Date(ext(a).meta.updatedAt);
                const db = new Date(ext(b).meta.updatedAt);
                if (opt === "asc") {
                    return db.getTime() - da.getTime();
                } else {
                    return da.getTime() - db.getTime();
                }
            });
        };
    }

    function sortByCreatedDate(opt: "asc" | "desc"): (tasks: T[]) => T[] {
        return (tasks: T[]) => {
            return tasks.sort((a, b) => {
                const da = new Date(ext(a).meta.createdAt);
                const db = new Date(ext(b).meta.createdAt);
                if (opt === "asc") {
                    return db.getTime() - da.getTime();
                } else {
                    return da.getTime() - db.getTime();
                }
            });
        };
    }

    function or(...fns: ((task: T) => boolean)[]): (task: T) => boolean {
        return (task: T) => {
            for (const fn of fns) {
                if (fn(task)) {
                    return true;
                }
            }
            return false;
        };
    }

    function process(tasks: T[], ...fns: ((task: T) => boolean)[]): T[] {
        if (fns.length === 0) {
            return tasks;
        }

        return process(tasks.filter(fns[0]), ...fns.slice(1));
    }

    function hasDueDate(task: T): boolean {
        return ext(task).data.weight === undefined;
    }

    function hasWeight(task: T): boolean {
        return ext(task).data.weight !== undefined;
    }

    function isIncomplete(task: T): boolean {
        return ext(task).data.completedAt === undefined && ext(task).data.isDeleted === false;
    }

    function isCompleteToday(current_date: string): (task: T) => boolean {
        return (task: T) => {
            const completedAt = ext(task).data.completedAt;
            return completedAt !== undefined && dayDifference(current_date, completedAt) === 0;
        };
    }

    function isDeleted(task: T): boolean {
        return ext(task).data.isDeleted;
    }

    function isCompleted(task: T): boolean {
        return ext(task).data.completedAt !== undefined && ext(task).data.isDeleted === false;
    }

    return { tasksToday, isDeleted, isCompleted };
}
