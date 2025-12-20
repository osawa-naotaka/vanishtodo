import type { JSX } from "react";

export function BottomTaskFilter(): JSX.Element {
    return (
        <footer className="bottom-nav">
            <div className="responsive">
                <input type="radio" name="tab" id="tab-all" />
                <label htmlFor="tab-all">すべて</label>
                <input type="radio" name="tab" id="tab-light" defaultChecked />
                <label htmlFor="tab-light">軽</label>
                <input type="radio" name="tab" id="tab-medium" />
                <label htmlFor="tab-medium">中</label>
                <input type="radio" name="tab" id="tab-heavy" />
                <label htmlFor="tab-heavy">重</label>
                <input type="radio" name="tab" id="tab-due-date" />
                <label htmlFor="tab-due-date">締切</label>
            </div>
        </footer>
    );
}
