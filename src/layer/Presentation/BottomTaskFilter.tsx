import type { JSX } from "react";
import type { TaskWeight } from "../../../type/types";

export type BottomTaskFilterProps = {
    filter: TaskWeight | "due-date" | "all";
    onChange: (filter: TaskWeight | "due-date" | "all") => void;
};

export function BottomTaskFilter({ filter, onChange }: BottomTaskFilterProps): JSX.Element {
    return (
        <footer className="bottom-nav">
            <div className="responsive-mobile">
                <input type="radio" name="tab" id="tab-all" value="all" checked={filter === "all"} onChange={() => onChange("all")} />
                <label htmlFor="tab-all">すべて</label>
                <input type="radio" name="tab" id="tab-light" value="light" checked={filter === "light"} onChange={() => onChange("light")} />
                <label htmlFor="tab-light">軽</label>
                <input type="radio" name="tab" id="tab-medium" value="medium" checked={filter === "medium"} onChange={() => onChange("medium")} />
                <label htmlFor="tab-medium">中</label>
                <input type="radio" name="tab" id="tab-heavy" value="heavy" checked={filter === "heavy"} onChange={() => onChange("heavy")} />
                <label htmlFor="tab-heavy">重</label>
                <input type="radio" name="tab" id="tab-due-date" value="due-date" checked={filter === "due-date"} onChange={() => onChange("due-date")} />
                <label htmlFor="tab-due-date">締切</label>
            </div>
        </footer>
    );
}
