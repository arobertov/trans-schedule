import { useCallback, useMemo, useState, useEffect } from "react";
import {
  useGetOne,
  useCreate,
  SaveButton,
  SimpleForm,
  ReferenceInput,
  SelectInput,
  TextInput,
  useNotify,
  useDataProvider,
  useRedirect,
} from "react-admin";
import { 
  Button, 
  Stack, 
  Typography, 
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Box,
} from "@mui/material";
import { getToken } from "../../../jwt-frontend-auth/src/auth/authService";

const BulkImportForm = () => {
  console.log("===== BulkImportForm component rendered =====");
  
  const [patternId, setPatternId] = useState<string | undefined>();
  const [text, setText] = useState("");
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [pattern, setPattern] = useState<any>(null);
  const [patternLoading, setPatternLoading] = useState(false);
  const [showAllRows, setShowAllRows] = useState(false);
  const [createMany, { isLoading }] = useCreate();
  const notify = useNotify();
  const redirect = useRedirect();

  console.log("Current patternId:", patternId);
  console.log("Current pattern:", pattern);

  // Fetch pattern with columns
  useEffect(() => {
    console.log("===== useEffect START =====");
    console.log("useEffect triggered, patternId:", patternId);
    
    // Clear data when pattern changes
    setPreviewData([]);
    setErrors([]);
    setText("");
    
    if (!patternId) {
      console.log("No patternId, clearing pattern");
      setPattern(null);
      return;
    }

    console.log("About to fetch pattern with id:", patternId);
    setPatternLoading(true);
    
    const fetchPattern = async () => {
      try {
        console.log("Fetching from API...");
        const token = getToken();
        console.log("Token exists:", !!token);
        
        // Extract numeric ID if it's a URL
        const numericId = typeof patternId === 'string' && patternId.includes('/') 
          ? patternId.split('/').pop() 
          : patternId;
        
        console.log("Fetching pattern with numeric ID:", numericId);
        
        const response = await fetch(`${window.origin}/order_patterns/${numericId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/ld+json',
          },
        });
        
        console.log("Response received:", response.status);
        const data = await response.json();
        console.log("===== Pattern fetched successfully =====");
        console.log("Full data:", data);
        console.log("Columns count:", data.columns?.length);
        
        setPattern(data);
        setPatternLoading(false);
      } catch (error) {
        console.error("===== Error fetching pattern =====");
        console.error("Error:", error);
        setPatternLoading(false);
      }
    };
    
    fetchPattern();
  }, [patternId]);

  const columns = Array.isArray(pattern?.columns) ? pattern.columns : [];
  const columnCount = columns.length;
  
  console.log("Columns array:", columns);
  console.log("Column count:", columnCount);

  // Генериране на пример за въвеждане
  const exampleText = useMemo(() => {
    if (!columns.length) return "";
    // Header ред с имената на колоните
    const headerRow = columns.map((col: any) => col.column_name).join("\t");
    // Примерни редове с данни
    const exampleRow1 = columns.map(() => "СМ1-Д").join("\t");
    const exampleRow2 = columns.map(() => "СМ2-Н").join("\t");
    const exampleRow3 = columns.map(() => "О").join("\t");
    return `${headerRow}\n${exampleRow1}\n${exampleRow2}\n${exampleRow3}`;
  }, [columns]);

  // Валидация и преглед на данните
  const handlePreview = useCallback(() => {
    setErrors([]);
    setPreviewData([]);

    if (!patternId) {
      setErrors(["Моля, изберете порядък"]);
      return;
    }

    if (!text.trim()) {
      setErrors(["Моля, въведете данни за импорт"]);
      return;
    }

    // Разделяме по нови редове, запазваме всички редове (включително празни)
    const lines = text.split("\n");
    const rows = lines.map((line) => {
      // Split по TAB, запазваме празните стойности
      const cols = line.split("\t");
      // Допълваме с празни стрингове ако редът е по-къс от броя колони
      while (cols.length < columnCount) {
        cols.push("");
      }
      return cols;
    });

    const newErrors: string[] = [];
    const preview: any[] = [];

    rows.forEach((cols, idx) => {
      const rowNum = idx + 1;

      // Валидация: брой колони (tolerираме повече, но предупреждаваме)
      if (cols.length < columnCount) {
        newErrors.push(
          `Ред ${rowNum}: Има само ${cols.length} колони, очакват се ${columnCount}`
        );
      } else if (cols.length > columnCount) {
        // Отрязваме излишните колони
        cols.splice(columnCount);
      }

      // Създаване на обект за preview
      const values: Record<string, string> = {};
      columns.forEach((col: any, i: number) => {
        // Запазваме празните стрингове както са
        values[col.column_name] = cols[i] !== undefined ? cols[i] : "";
      });

      preview.push({
        position_number: rowNum,
        values,
        raw: cols,
        isEmpty: cols.every(c => !c || c.trim() === ""), // Маркираме дали редът е напълно празен
      });
    });

    setErrors(newErrors);
    setPreviewData(preview);
  }, [patternId, text, columns, columnCount]);

  // Импорт на данните
  const handleImport = useCallback(async () => {
    if (!patternId || !columns.length || !previewData.length || errors.length > 0) {
      notify("Моля, коригирайте грешките преди импорт", { type: "error" });
      return;
    }

    try {
      // Extract numeric ID if patternId is IRI format
      const numericId = typeof patternId === 'string' && patternId.includes('/') 
        ? patternId.split('/').pop() 
        : patternId;
      
      const payload = previewData.map((item) => ({
        pattern: `/order_patterns/${numericId}`,
        position_number: item.position_number,
        values: item.values,
      }));

      await Promise.all(payload.map((item) => createMany("order_pattern_details", { data: item })));
      
      notify(`Успешно импортирани ${payload.length} реда`, { type: "success" });
      setText("");
      setPreviewData([]);
      
      // Пренасочване към списъка с детайли след кратка пауза
      setTimeout(() => {
        redirect('/order_pattern_details');
      }, 1000);
    } catch (error: any) {
      notify(`Грешка при импорт: ${error.message}`, { type: "error" });
    }
  }, [patternId, columns, previewData, errors, createMany, notify, redirect]);

  return (
    <>
      <Stack spacing={3}>
        <Typography variant="h6">Масов импорт на детайли на порядък</Typography>

        <ReferenceInput
          source="pattern"
          reference="order_patterns"
          label="Порядък"
          perPage={1000}
        >
          <SelectInput 
            optionText="name"
            onChange={(e) => {
              console.log("SelectInput onChange triggered, value:", e.target.value);
              setPatternId(e.target.value);
            }}
          />
        </ReferenceInput>

        {patternLoading && (
          <Typography variant="body2" color="textSecondary">
            Зареждане на данни за порядъка...
          </Typography>
        )}

        {patternId && !patternLoading && columns.length === 0 && (
          <Alert severity="warning">
            Изборният порядък няма дефинирани колони. Моля, първо добавете колони към порядъка.
          </Alert>
        )}

        {columns.length > 0 && (
          <Alert severity="info">
            <Typography variant="body2" fontWeight="bold">
              Очаквани колони ({columnCount}): {columns.map((c: any) => c.column_name).join(" | ")}
            </Typography>
            <Typography variant="body2" mt={1}>
              Всеки ред трябва да съдържа точно {columnCount} колони, разделени с TAB.
            </Typography>
            <Typography variant="body2" mt={1}>
              Позициите се определят автоматично: 1, 2, 3...
            </Typography>
          </Alert>
        )}

        {columns.length > 0 && (
          <Box>
            <Typography variant="body2" color="textSecondary" mb={1}>
              Пример за въвеждане (копирайте от Excel с TAB разделител):
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, bgcolor: "grey.100" }}>
              <Typography 
                variant="body2" 
                fontFamily="monospace" 
                whiteSpace="pre"
                sx={{ color: "text.primary" }}
              >
                {exampleText}
              </Typography>
            </Paper>
            <Typography variant="caption" color="textSecondary" mt={1} display="block">
              Първият ред съдържа имената на колоните, следващите редове съдържат данните.
              Празните клетки се копират като празни стойности.
            </Typography>
          </Box>
        )}

        <TextInput
          source="data"
          label="Постави таблица (редове, разделени с TAB)"
          multiline
          fullWidth
          minRows={6}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setPreviewData([]);
            setErrors([]);
          }}
          helperText="Копирайте директно от Excel или друга таблица"
        />

        <Box display="flex" gap={2}>
          <Button 
            variant="outlined" 
            onClick={handlePreview} 
            disabled={!patternId || !text.trim()}
          >
            Преглед на данните
          </Button>
          
          <Button 
            variant="contained" 
            onClick={handleImport} 
            disabled={isLoading || !patternId || previewData.length === 0 || errors.length > 0}
          >
            {isLoading ? "Импортиране..." : `Импортирай ${previewData.length} реда`}
          </Button>
        </Box>

        {errors.length > 0 && (
          <Alert severity="error">
            <Typography variant="body2" fontWeight="bold" mb={1}>
              Открити грешки:
            </Typography>
            {errors.map((err, idx) => (
              <Typography key={idx} variant="body2">• {err}</Typography>
            ))}
          </Alert>
        )}

        {previewData.length > 0 && errors.length === 0 && (
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Преглед на данните ({previewData.length} реда)
              </Typography>
              {previewData.length > 20 && (
                <Button
                  size="small"
                  onClick={() => setShowAllRows(!showAllRows)}
                >
                  {showAllRows ? "Покажи първите 20" : "Покажи всички редове"}
                </Button>
              )}
            </Box>
            <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Позиция</strong></TableCell>
                    {columns.map((col: any) => (
                      <TableCell key={col.id}>
                        <strong>{col.column_name}</strong>
                        <br />
                        <Chip label={col.label} size="small" />
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(showAllRows ? previewData : previewData.slice(0, 20)).map((row, idx) => (
                    <TableRow 
                      key={idx} 
                      hover
                      sx={row.isEmpty ? { bgcolor: 'grey.100' } : {}}
                    >
                      <TableCell>{row.position_number}</TableCell>
                      {columns.map((col: any) => (
                        <TableCell key={col.id}>
                          {row.values[col.column_name] || <em style={{ color: "#999" }}>празно</em>}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {!showAllRows && previewData.length > 20 && (
              <Typography variant="body2" color="textSecondary" mt={1}>
                Показани първите 20 от {previewData.length} реда
              </Typography>
            )}
          </Box>
        )}
      </Stack>
    </>
  );
};

export const PatternBulkImport = () => {
  return (
    <SimpleForm toolbar={false}>
      <BulkImportForm />
    </SimpleForm>
  );
};