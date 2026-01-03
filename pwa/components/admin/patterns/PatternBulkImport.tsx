import { useCallback, useMemo, useState, useEffect } from "react";
import {
  useGetOne,
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
  LinearProgress,
  CircularProgress
} from "@mui/material";

const BulkImportForm = () => {
  console.log("===== BulkImportForm component rendered =====");
  
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const redirect = useRedirect();
  // const [create, { isLoading }] = useCreate();
  
  const [patternId, setPatternId] = useState<string | undefined>();
  const [text, setText] = useState("");
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [pattern, setPattern] = useState<any>(null);
  const [patternLoading, setPatternLoading] = useState(false);
  const [showAllRows, setShowAllRows] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);

  console.log("Current patternId:", patternId);
  console.log("Current pattern:", pattern);

  // Fetch pattern with columns
  useEffect(() => {
    // Clear data when pattern changes
    setPreviewData([]);
    setErrors([]);
    setText("");
    
    if (!patternId) {
      setPattern(null);
      return;
    }
    setPatternLoading(true);
    
    const fetchPattern = async () => {

      try {
        const { data } = await dataProvider.getOne('order_patterns', { id: patternId });
        setPattern(data);
      } catch (err: any) {
        notify('Грешка при зареждане на порядъка', { type: 'error' });
        console.error('Error loading pattern:', err);
      } finally {
        setPatternLoading(false);
      }
     
    };
    
    fetchPattern();
  }, [patternId, dataProvider, notify]);

  const columns = Array.isArray(pattern?.columns) ? pattern.columns : [];
  const columnCount = columns.length;
  
  console.log("Columns array:", columns);
  console.log("Column count:", columnCount);


  // Валидация и преглед на данните
  const parseData = useCallback((inputText: string) => {
    setErrors([]);
    setPreviewData([]);

    if (!patternId) {
      return;
    }

    if (!inputText.trim()) {
      return;
    }

    // Разделяме по нови редове, запазваме всички редове (включително празни)
    const lines = inputText.split("\n");
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
  }, [patternId, columns, columnCount]);

  // Импорт на данните
  const handleImport = useCallback(async () => {
    if (!patternId || !columns.length || !previewData.length || errors.length > 0) {
      notify("Моля, коригирайте грешките преди импорт", { type: "error" });
      return;
    }

    setIsImporting(true);
    setProgress(0);
    const importErrors: string[] = [];

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

      let successCount = 0;
      for (let i = 0; i < payload.length; i++) {
        try {
            await dataProvider.create("order_pattern_details", { data: payload[i] });
            successCount++;
        } catch (err: any) {
            console.error(`Error importing row ${i + 1}`, err);
            const errorMsg = err?.body?.['hydra:description'] || err?.message || 'Неизвестна грешка';
            importErrors.push(`Ред ${i + 1}: ${errorMsg}`);
        }
        setProgress(Math.round(((i + 1) / payload.length) * 100));
        // Allow UI update
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      
      if (importErrors.length > 0) {
        setErrors(importErrors);
        notify(`Импортирани ${successCount} от ${payload.length} реда. Има грешки!`, { type: "warning" });
      } else {
        notify(`Успешно импортирани ${successCount} от ${payload.length} реда`, { type: "success" });
        setText("");
        setPreviewData([]);
        
        // Пренасочване към списъка с детайли след кратка пауза
        setTimeout(() => {
          redirect('/order_pattern_details');
        }, 1000);
      }

    } catch (error: any) {
      notify(`Грешка при импорт: ${error.message}`, { type: "error" });
    } finally {
        setIsImporting(false);
    }
  }, [patternId, columns, previewData, errors, dataProvider, notify, redirect]);

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
          <Box display="flex" alignItems="center" gap={1}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="textSecondary">
              Зареждане на данни за порядъка...
            </Typography>
          </Box>
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

        <TextInput
          source="data"
          label="Постави таблица (редове, разделени с TAB)"
          multiline
          fullWidth
          minRows={6}
          value={text}
          onChange={(e) => {
            const newVal = e.target.value;
            setText(newVal);
            parseData(newVal);
          }}
          helperText="Копирайте директно от Excel или друга таблица"
          disabled={isImporting}
        />

        {isImporting && (
          <Box sx={{ width: '100%', mb: 2 }}>
            <LinearProgress variant="determinate" value={progress} />
            <Typography variant="body2" color="textSecondary" align="center">
              Импортиране... {progress}%
            </Typography>
          </Box>
        )}

        <Box display="flex" gap={2}>
          <Button 
            variant="contained" 
            onClick={handleImport} 
            disabled={isImporting || !patternId || previewData.length === 0 || errors.length > 0}
          >
            {isImporting ? "Импортиране..." : `Импортирай ${previewData.length} реда`}
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