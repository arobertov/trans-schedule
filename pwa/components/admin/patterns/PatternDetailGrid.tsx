import React, { useState, useEffect, useCallback, memo, ChangeEvent } from "react";
import {
  useDataProvider,
  useNotify,
  useGetOne,
  useUpdate,
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
  rectSortingStrategy,
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
  Typography,
  Chip,
  useTheme,
} from "@mui/material";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";

// Добави липсващите типове и интерфейси
interface DetailRow {
  id: number;
  "@id"?: string;
  position_number: number;
  values: Record<string, string>;
  pattern?: string;
}

interface PatternDetailGridProps {
  patternId: string | number;
  onOrderChange?: () => void;
}

// Добави липсващата helper функция
const resolvePatternIri = (
  detail: DetailRow,
  pattern: any,
  patternId: string | number
): string => {
  if (detail.pattern) return detail.pattern;
  if (pattern?.["@id"]) return pattern["@id"];
  return `/api/order_patterns/${patternId}`;
};

const SortableRow = memo(({
  row,
  columns,
  onCellChange,
}: {
  row: DetailRow;
  columns: any[];
  onCellChange: (rowId: number, columnName: string, value: string) => void;
}) => {
  const theme = useTheme();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row["@id"] || String(row.id),
  });

  const isDarkMode = theme.palette.mode === 'dark';

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: isDragging 
      ? (isDarkMode ? theme.palette.grey[800] : "#f5f5f5")
      : (isDarkMode ? theme.palette.background.paper : "white"),
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={{
        ...style,
        pointerEvents: isDragging ? "none" : "auto",
      }}
    >
      <TableCell
        sx={{
          cursor: isDragging ? "grabbing" : "grab",
          width: 50,
          userSelect: "none",
          touchAction: "none",
        }}
        {...attributes}
        {...listeners}
      >
        <DragIndicatorIcon color="action" />
      </TableCell>
      <TableCell sx={{ width: 80, fontWeight: "bold", color: theme.palette.text.primary }}>
        {row.position_number}
      </TableCell>
      {columns.map((col) => (
        <TableCell key={col.id} sx={{ minWidth: 120, p: 0.5 }}>
          <input
            type="text"
            value={row.values[col.column_name] || ""}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              onCellChange(row.id, col.column_name, e.target.value);
            }}
            style={{
              width: "100%",
              padding: "4px 8px",
              border: `1px solid ${isDarkMode ? theme.palette.grey[700] : "#e0e0e0"}`,
              borderRadius: "4px",
              fontSize: "0.875rem",
              outline: "none",
              backgroundColor: isDarkMode ? theme.palette.grey[900] : "white",
              color: theme.palette.text.primary,
            }}
            onFocus={(e) => (e.target.style.borderColor = theme.palette.primary.main)}
            onBlur={(e) => (e.target.style.borderColor = isDarkMode ? theme.palette.grey[700] : "#e0e0e0")}
          />
        </TableCell>
      ))}
    </TableRow>
  );
});

SortableRow.displayName = "SortableRow";

// Поправен export - премахнато "DragTableExample", използва PatternDetailGrid
export const PatternDetailGrid = ({ patternId, onOrderChange }: PatternDetailGridProps) => {
  const theme = useTheme();
  const [details, setDetails] = useState<DetailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const [update] = useUpdate();

  const { data: pattern, isLoading: patternLoading } = useGetOne("order_patterns", {
    id: patternId,
  });

  const columns = pattern?.columns || [];

  const fetchDetails = useCallback(async () => {
    if (!patternId || isDragging) return;

    try {
      if (details.length === 0) setLoading(true);
      const { data } = await dataProvider.getList("order_pattern_details", {
        pagination: { page: 1, perPage: 1000 },
        sort: { field: "position_number", order: "ASC" },
        filter: { pattern: patternId },
      });

      setDetails(data as DetailRow[]);
    } catch (error: any) {
      notify(`Грешка при зареждане: ${error.message}`, { type: "error" });
    } finally {
      setLoading(false);
    }
  }, [patternId, dataProvider, notify, isDragging, details.length]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const handleCellChange = useCallback(
    async (rowId: number, columnName: string, value: string) => {
      const row = details.find((d) => d.id === rowId);
      if (!row) return;

      const newValues = { ...row.values, [columnName]: value };

      // Оптимистична актуализация
      setDetails((prev) =>
        prev.map((d) => (d.id === rowId ? { ...d, values: newValues } : d))
      );

      try {
        const payload = {
          ...row,
          values: newValues,
          pattern: resolvePatternIri(row, pattern, patternId),
        };

        await update("order_pattern_details", {
          id: (row["@id"] as string | undefined) ?? rowId,
          data: payload,
          previousData: row,
        }, { mutationMode: "pessimistic" });
      } catch (error: any) {
        notify(`Грешка при запис: ${error.message}`, { type: "error" });
        setDetails((prev) => prev.map((d) => (d.id === rowId ? row : d)));
      }
    },
    [details, update, notify, pattern, patternId]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      setIsDragging(false);
      return;
    }

    const oldIndex = details.findIndex(
      (d) => (d["@id"] && d["@id"] === active.id) || String(d.id) === active.id
    );
    const newIndex = details.findIndex(
      (d) => (d["@id"] && d["@id"] === over.id) || String(d.id) === over.id
    );

    if (oldIndex === -1 || newIndex === -1) {
      setIsDragging(false);
      return;
    }

    // 1. Оптимистично обновяване на UI (локално)
    const reordered = arrayMove(details, oldIndex, newIndex);
    const updatedDetails = reordered.map((detail, index: number) => ({
      ...detail,
      position_number: index + 1,
    }));

    setDetails(updatedDetails);

    // 2. Изпращане на заявка към API
    // Тъй като вече имаме StateProcessor на бекенда, е нужно да обновим само
    // елемента, който е преместен. Бекендът автоматично ще пренареди останалите.
    const movedItem = details[oldIndex];
    const newPosition = newIndex + 1;

    try {
      const patternIri = resolvePatternIri(movedItem, pattern, patternId);
      
      // Изпращаме само новата позиция на преместения елемент
      await update("order_pattern_details", {
        id: (movedItem["@id"] as string | undefined) ?? movedItem.id,
        data: { 
            ...movedItem, 
            position_number: newPosition,
            pattern: patternIri 
        },
        previousData: movedItem,
      }, { 
        mutationMode: "pessimistic" ,
        onSuccess: () => {
          notify("Позициите са обновени", { type: "success" });
          setIsDragging(false);
          if (onOrderChange) {
            onOrderChange();
          }
        }
      });
      
    } catch (error: any) {
      notify(`Грешка при запис: ${error.message}`, { type: "error" });
      setDetails(details); // Връщане на старото състояние при грешка
      setIsDragging(false);
    }
  };

  if (loading || patternLoading) return <Loading />;

  if (!pattern) {
    return (
      <Box p={3}>
        <Typography color="error">Порядъкът не е намерен</Typography>
      </Box>
    );
  }

  if (details.length === 0) {
    return (
      <Box p={3}>
        <Typography>Няма детайли за този порядък</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box p={2} display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">{pattern.name}</Typography>
        <Typography variant="body2" color="textSecondary">
          {details.length} позиции
        </Typography>
      </Box>

      <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={details.map((d) => d["@id"] || String(d.id))}
          strategy={rectSortingStrategy}
        >
          <TableContainer>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 50 }}></TableCell>
                  <TableCell sx={{ width: 80, fontWeight: "bold", color: theme.palette.text.primary }}>
                    Поз.
                  </TableCell>
                  {columns.map((col: any) => (
                    <TableCell key={col.id} sx={{ minWidth: 120, color: theme.palette.text.primary }}>
                      <Box>
                        <Chip label={col.label} sx={{ mt: 0.5 }} />
                      </Box>
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
                    onCellChange={handleCellChange}
                  />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </SortableContext>
      </DndContext>

      <Box p={2}>
        <Typography variant="caption" color="textSecondary">
          💡 Съвет: Кликнете върху клетка за редактиране. Използвайте ⋮⋮ за преместване на редове.
        </Typography>
      </Box>
    </Box>
  );
};