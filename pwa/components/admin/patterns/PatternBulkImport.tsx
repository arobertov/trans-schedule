import { useCallback, useMemo, useState } from "react";
import {
  useGetOne,
  useCreate,
  SaveButton,
  SimpleForm,
  ReferenceInput,
  SelectInput,
  TextInput,
  NumberInput,
} from "react-admin";
import { Button, Stack, Typography } from "@mui/material";

export const PatternBulkImport = () => {
  const [patternId, setPatternId] = useState<string | undefined>();
  const [text, setText] = useState("");
  const [startPos, setStartPos] = useState(1);
  const { data: pattern } = useGetOne("order_patterns", { id: patternId || "" }, { enabled: !!patternId });
  const [createMany, { isLoading }] = useCreate();

  const columns = pattern?.columns ?? [];

  const handleImport = useCallback(async () => {
    if (!patternId || !columns.length || !text.trim()) return;

    const rows = text
      .trim()
      .split("\n")
      .map((line) => line.split(/\t|;/));

    const payload = rows.map((cols, idx) => {
      const values: Record<string, string> = {};
      columns.forEach((col: any, i: number) => {
        values[col.column_name] = cols[i] ?? "";
      });
      return {
        pattern: `/order_patterns/${patternId}`,
        position_number: startPos + idx,
        values,
      };
    });

    await Promise.all(payload.map((item) => createMany("order_pattern_details", { data: item })));
    setText("");
  }, [patternId, columns, text, startPos, createMany]);

  return (
    <SimpleForm toolbar={false}>
      <Stack spacing={2}>
        <ReferenceInput
          source="pattern"
          reference="order_patterns"
          label="Порядък"
          perPage={1000}
          onChange={(e) => setPatternId(e.target.value)}
        >
          <SelectInput optionText="name" />
        </ReferenceInput>

        <NumberInput source="start" label="Начална позиция" min={1} defaultValue={1} onChange={(e) => setStartPos(Number(e.target.value || 1))} />

        {columns.length > 0 && (
          <Typography variant="body2">
            Очаквани колони (подредба): {columns.map((c: any) => c.column_name).join(" | ")}
          </Typography>
        )}

        <TextInput
          source="data"
          label="Постави таблица (редове, разделени с TAB или ; )"
          multiline
          fullWidth
          minRows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <Button variant="contained" onClick={handleImport} disabled={isLoading || !patternId}>
          Импорт
        </Button>
      </Stack>
    </SimpleForm>
  );
};