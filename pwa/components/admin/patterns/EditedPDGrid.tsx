import { useState, useEffect, useCallback, memo, ChangeEvent } from "react";
import {
  useDataProvider,
  useNotify,
  useGetOne,
  useUpdate,
  useRefresh,
  Loading,
} from "react-admin";
import {
  DndContext,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Chip,
} from "@mui/material";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";

// --- Types ---
interface DetailRow {
  id: number;
  "@id"?: string;
  position_number: number;
  values: Record<string, string>;
  pattern?: string | { "@id"?: string } | null;
  [key: string]: unknown;
}

interface PatternDetailGridProps {
  patternId: string;
}

// --- Helpers ---
const resolvePatternIri = (row: DetailRow, patternId: string): string => {
  if (typeof row.pattern === "string") return row.pattern;
  if (typeof row.pattern === "object" && row.pattern?.["@id"]) return row.pattern["@id"];
  return `/order_patterns/${patternId}`;
};

// --- Sub-components ---
const SortableRow = memo(({
  row,
  columns,
  onPersistCell,
}: {
  row: DetailRow;
  columns: any[];
  onPersistCell: (rowId: number, columnName: string, value: string) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row["@id"] || String(row.id),
  });

  // Локален стейт за клетките, за да не лагва при писане
  const [localValues, setLocalValues] = useState(row.values);

  // Синхронизация, ако данните се рефрешнат отвън
  useEffect(() => {
    setLocalValues(row.values);
  }, [row.values]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    backgroundColor: isDragging ? "#fafafa" : "white",
    zIndex: isDragging ? 1 : "auto",
    position: "relative" as const,
  };

  const handleChange = (columnName: string, value: string) => {
    setLocalValues(prev => ({ ...prev, [columnName]: value }));
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell
        {...attributes}
        {...listeners}
        sx={{ cursor: isDragging ? "grabbing" : "grab", width: 50 }}
      >
        <DragIndicatorIcon color="action" />
      </TableCell>
      <TableCell sx={{ width: 80, fontWeight: "bold" }}>{row.position_number}</TableCell>
      {columns.map((col) => (
        <TableCell key={col.id} sx={{ minWidth: 120, p: 0.5 }}>
          <input
            type="text"
            value={localValues[col.column_name] || ""}
            onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange(col.column_name, e.target.value)}
            onBlur={(e: ChangeEvent<HTMLInputElement>) => onPersistCell(row.id, col.column_name, e.target.value)}
            style={{
              width: "100%",
              padding: "6px 8px",
              border: "1px solid #e0e0e0",
              borderRadius: "4px",
              fontSize: "0.875rem",
              outline: "none",
            }}
          />
        </TableCell>
      ))}
    </TableRow>
  );
});

// --- Main Component ---
export const PatternDetailGrid = ({ patternId }: PatternDetailGridProps) => {
  const [details, setDetails] = useState<DetailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const refresh = useRefresh();
  const [update] = useUpdate();

  const { data: pattern, isLoading: patternLoading } = useGetOne("order_patterns", { id: patternId });
  const columns = pattern?.columns || [];

  const fetchDetails = useCallback(async () => {
    if (!patternId) return;
    try {
      setLoading(true);
      const { data } = await dataProvider.getList("order_pattern_details", {
        pagination: { page: 1, perPage: 1000 },
        sort: { field: "position_number", order: "ASC" },
        filter: { pattern: patternId },
      });
      setDetails(data as DetailRow[]);
    } catch (error: any) {
      notify(`Грешка: ${error.message}`, { type: "error" });
    } finally {
      setLoading(false);
    }
  }, [patternId, dataProvider, notify]);

  useEffect(() => { fetchDetails(); }, [fetchDetails]);

  // Запис на промяна в клетка (само при Blur)
  const handlePersistCell = useCallback(async (rowId: number, columnName: string, value: string) => {
    const row = details.find((d) => d.id === rowId);
    if (!row || row.values[columnName] === value) return;

    const newValues = { ...row.values, [columnName]: value };
    
    // Оптимистичен ъпдейт в UI
    setDetails(prev => prev.map(d => d.id === rowId ? { ...d, values: newValues } : d));

    try {
      await update("order_pattern_details", {
        id: row["@id"] ?? rowId,
        data: { ...row, values: newValues, pattern: resolvePatternIri(row, patternId) },
        previousData: row,
      });
    } catch (error: any) {
      notify("Грешка при запис", { type: "error" });
      fetchDetails(); // Връщане на старите данни при грешка
    }
  }, [details, update, patternId, notify, fetchDetails]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // 1. Намираме индексите
    const oldIndex = details.findIndex(d => (d["@id"] || String(d.id)) === active.id);
    const newIndex = details.findIndex(d => (d["@id"] || String(d.id)) === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // 2. Пренареждаме масива локално
    const reordered = arrayMove(details, oldIndex, newIndex);

    // 3. Важно: Генерираме НОВИТЕ позиции за абсолютно всички редове в новия списък
    const updatedWithPositions = reordered.map((row, index) => ({
      ...row,
      position_number: index + 1, // Винаги от 1 до N
    }));

    // Оптимистично обновяваме UI веднага
    setDetails(updatedWithPositions);

    try {
      // 4. Намираме кои редове реално са си променили позицията спрямо текущия стейт
      const changedRows = updatedWithPositions.filter((row) => {
        const originalRow = details.find(d => d.id === row.id);
        return originalRow && originalRow.position_number !== row.position_number;
      });

      if (changedRows.length === 0) return;

      // 5.Unique Constraint Fix: Временни позиции (избягваме дублиране на номера в базата)
      const tempOffset = 1000; 

      // Първо преместваме всички променени редове на временни позиции (N + 1000)
      for (const row of changedRows) {
        await update("order_pattern_details", {
          id: row["@id"] ?? row.id,
          data: { 
            ...row, 
            position_number: row.position_number + tempOffset, 
            pattern: resolvePatternIri(row, patternId) 
          },
        }, { mutationMode: 'pessimistic' });
      }

      // Второ: Наместваме ги на реалните им нови позиции
      for (const row of changedRows) {
        await update("order_pattern_details", {
          id: row["@id"] ?? row.id,
          data: { 
            ...row, 
            position_number: row.position_number, 
            pattern: resolvePatternIri(row, patternId) 
          },
        }, { mutationMode: 'pessimistic' });
      }

      notify("Подредбата е записана успешно", { type: "success" });
      
      // 6. Рефрешваме от сървъра, за да сме сигурни, че всичко е синхронизирано
      refresh();
      await fetchDetails(); 
    } catch (error: any) {
      notify(`Грешка при преподреждане: ${error.message}`, { type: "error" });
      // Връщаме старата подредба при фатална грешка
      fetchDetails();
    }
  };

  if (loading || patternLoading) return <Loading />;

  return (
    <Box>
      <Box p={2} display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">{pattern?.name || "Детайли"}</Typography>
        <Chip label={`${details.length} позиции`} variant="outlined" size="small" />
      </Box>

      <DndContext sensors={sensors} collisionDetection={rectIntersection} onDragEnd={handleDragEnd}>
        <SortableContext items={details.map(d => d["@id"] || String(d.id))} strategy={verticalListSortingStrategy}>
          <TableContainer component={Paper} sx={{ maxHeight: "calc(100vh - 250px)", overflowY: "auto" }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 50 }} />
                  <TableCell sx={{ width: 80 }}>№</TableCell>
                  {columns.map((col: any) => (
                    <TableCell key={col.id} sx={{ minWidth: 150 }}>
                      <Chip label={col.label} size="small" />
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {details.map((row) => (
                  <SortableRow
                    key={row["@id"] || String(row.id)}
                    row={row}
                    columns={columns}
                    onPersistCell={handlePersistCell}
                  />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </SortableContext>
      </DndContext>
    </Box>
  );
};