import * as v from "valibot";
import { dateSchema } from "../types";

export type ShortDate = {
    past_or_future: "past" | "future" | "now";
    date: string;
};

export function shortFutureDate(target: string, current: string): ShortDate {
    const diff = dayDifference(target, current);
    const target_day = dayOf(target);
    const current_day = dayOf(current);

    if (diff < 0) {
        if (target_day.year !== current_day.year) {
            return {
                past_or_future: "past",
                date: `${target_day.year}-${target_day.month}-${target_day.day}`,
            };
        }
        return {
            past_or_future: "past",
            date: `${target_day.month}-${target_day.day}`,
        };
    }

    if (diff === 0) {
        return {
            past_or_future: "now",
            date: "今日",
        };
    }

    if (diff === 1) {
        return {
            past_or_future: "future",
            date: "明日",
        };
    }

    if (diff === 2) {
        return {
            past_or_future: "future",
            date: "明後日",
        };
    }

    if (diff < 7) {
        return {
            past_or_future: "future",
            date: `あと${diff}日`,
        };
    }

    if (target_day.year !== current_day.year) {
        return {
            past_or_future: "future",
            date: `${target_day.year}-${target_day.month}-${target_day.day}`,
        };
    }

    return {
        past_or_future: "future",
        date: `${target_day.month}-${target_day.day}`,
    };
}

export function shortPastDate(target: string, current: string): ShortDate {
    const diff = dayDifference(target, current);
    const target_day = dayOf(target);
    const current_day = dayOf(current);

    if (diff > 0) {
        if (target_day.year !== current_day.year) {
            return {
                past_or_future: "future",
                date: `${target_day.year}-${target_day.month}-${target_day.day}`,
            };
        }
        return {
            past_or_future: "future",
            date: `${target_day.month}-${target_day.day}`,
        };
    }

    if (diff === 0) {
        return {
            past_or_future: "now",
            date: "今日",
        };
    }

    if (diff === -1) {
        return {
            past_or_future: "past",
            date: "昨日",
        };
    }

    if (diff === -2) {
        return {
            past_or_future: "past",
            date: "一昨日",
        };
    }

    if (diff > -7) {
        return {
            past_or_future: "past",
            date: `${diff}日前`,
        };
    }

    if (target_day.year !== current_day.year) {
        return {
            past_or_future: "past",
            date: `${target_day.year}-${target_day.month}-${target_day.day}`,
        };
    }

    return {
        past_or_future: "past",
        date: `${target_day.month}-${target_day.day}`,
    };
}

export function dayDifference(target: string, current: string): number {
    const target_parsed = v.parse(dateSchema, target);
    const current_parsed = v.parse(dateSchema, current);

    const target_date = new Date(resetTimeWithTimezone(target_parsed));
    const current_date = new Date(resetTimeWithTimezone(current_parsed));

    return Math.floor((target_date.getTime() - current_date.getTime()) / (1000 * 60 * 60 * 24));
}

export type MonthDay = {
    year: number;
    month: number;
    day: number;
};

export function dayOf(target: string): MonthDay {
    const target_parsed = v.parse(dateSchema, target);
    const date = new Date(target_parsed);

    return {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
    };
}

export function resetTimeWithTimezone(dateString: string): string {
    const offset = dateString.match(/([+-]\d{2}:\d{2}|Z)$/)?.[1] || "Z";
    const datePart = dateString.split("T")[0];

    return `${datePart}T00:00:00.000${offset}`;
}
