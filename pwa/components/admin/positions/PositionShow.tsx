import { ShowGuesser, FieldGuesser } from "@api-platform/admin";
import {NumberField} from "react-admin";

export const PositionsShow = () => (
    <ShowGuesser>
        <FieldGuesser source="name" label="Длъжност"/>
        <NumberField source="employees.length"  label="Брой служители"/>
        <FieldGuesser source="description" label="Описание"/>
    </ShowGuesser>
);
