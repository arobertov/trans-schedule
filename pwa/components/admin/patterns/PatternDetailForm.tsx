import { Fragment, useMemo } from "react";
import { useWatch } from "react-hook-form";
import { useGetOne, TextInput, NumberInput, ReferenceInput, SelectInput, SimpleFormIterator, ArrayInput } from "react-admin";

type Props = {
  isEdit?: boolean;
};

export const PatternDetailForm = ({ isEdit = false }: Props) => {
  const patternId = useWatch({ name: "pattern" });
  const { data: pattern } = useGetOne("order_patterns", { id: patternId || "" }, { enabled: !!patternId });

  const columnInputs = useMemo(() => {
    if (!pattern?.columns) return null;
    return pattern.columns.map((col: any) => (
      <TextInput
        key={col.id}
        source={`values.${col.column_name}`}
        label={`${col.label ?? col.column_name}`}
        fullWidth
      />
    ));
  }, [pattern]);

  return (
    <Fragment>
      {!isEdit && (
        <ReferenceInput source="pattern" reference="order_patterns" label="Порядък" perPage={1000}>
          <SelectInput label="Порядък" optionText="name" emptyText="Изберете порядък" />
        </ReferenceInput>
      )}
      <NumberInput source="position_number" label="Позиция" min={1} isRequired />
      {columnInputs}
    </Fragment>
  );
};