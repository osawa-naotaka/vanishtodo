import { FormControl, FormControlLabel, Radio, RadioGroup } from "@mui/material";
import type React from "react";
import * as v from "valibot";

export const filterSchema = v.picklist(["all", "light", "medium", "heavy", "due-date"]);
export type FilterType = v.InferOutput<typeof filterSchema>;

export type TaskFilterProps = {
    filter: FilterType;
    setFilter: (filter: FilterType) => void;
};

export function TaskFilter({ filter, setFilter }: TaskFilterProps): React.ReactElement {
    return (
        <FormControl sx={{ marginLeft: 3, marginBottom: 1 }}>
            <RadioGroup
                row
                name="task-weight-group"
                value={filter}
                onChange={(e) => setFilter(v.parse(filterSchema, e.target.value))}
                sx={{ marginBlock: 2, marginInline: 1 }}
            >
                <FormControlLabel value={"all"} control={<Radio />} label="全て" />
                <FormControlLabel value={"light"} control={<Radio />} label="軽" />
                <FormControlLabel value={"medium"} control={<Radio />} label="中" />
                <FormControlLabel value={"heavy"} control={<Radio />} label="重" />
                <FormControlLabel value={"due-date"} control={<Radio />} label="締切" />
            </RadioGroup>
        </FormControl>
    );
}
