import { useState, useEffect, useCallback } from "react";
import {
  useDataProvider,
  useNotify,
  useGetOne,
  useUpdate,
  Loading,
} from "react-admin";
import {
  DndContext,
  closestCenter,
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
  TextField,
  IconButton,
  Typography,
  Chip,
} from "@mui/material";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";

interface PatternDetailGridProps {
  patternId: string;
}

interface DetailRow {
  id: number;
  position_number: number;
  values: Record<string, string>;
}

const SortableRow = ({
  row,
  columns,
  onCellChange,
}: {
  row: DetailRow;
  columns: any[];
  onCellChange: (rowId: number, columnName: string, value: string) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: isDragging ? "#f5f5f5" : "white",
  };

  return (
    <TableRow ref={setNodeRef} style={style} hover>
      <TableCell sx={{ cursor: "grab", width: 50 }} {...attributes} {...listeners}>
        <DragIndicatorIcon color="action" />
      </TableCell>
      <TableCell sx={{ width: 80, fontWeight: "bold" }}>{row.position_number}</TableCell>
      {columns.map((col) => (
        <TableCell key={col.id} sx={{ minWidth: 120, p: 0.5 }}>
          <TextField
            fullWidth
            variant="standard"
            size="small"
            value={row.values[col.column_name] || ""}
            onChange={(e) => {
              onCellChange(row.id, col.column_name, e.target.value);
            }}
            sx={{
              "& .MuiInput-root": {
                fontSize: "0.875rem",
                "&:before": { borderBottom: "none" },
                "&:hover:before": { borderBottom: "1px solid rgba(0, 0, 0, 0.42)" },
              },
            }}
          />
        </TableCell>
      ))}
    </TableRow>
  );
};

export const PatternDetailGrid = ({ patternId }: PatternDetailGridProps) => {
  const [details, setDetails] = useState<DetailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const [update] = useUpdate();

  // Fetch pattern to get columns
  const { data: pattern, isLoading: patternLoading } = useGetOne("order_patterns", {
    id: patternId,
  });

  const columns = pattern?.columns || [];

  // Fetch all details for this pattern
  useEffect(() => {
    if (!patternId) return;

    const fetchDetails = async () => {
      try {
        setLoading(true);
        const { data } = await dataProvider.getList("order_pattern_details", {
          pagination: { page: 1, perPage: 1000 },
          sort: { field: "position_number", order: "ASC" },
          filter: { pattern: patternId },
        });

        setDetails(data as DetailRow[]);
        setLoading(false);
      } catch (error: any) {
        notify(`Грешка при зареждане: ${error.message}`, { type: "error" });
        setLoading(false);
      }
    };

    fetchDetails();
  }, [patternId, dataProvider, notify]);

  // Auto-save cell change
  const handleCellChange = useCallback(
    async (rowId: number, columnName: string, value: string) => {
      const row = details.find((d) => d.id === rowId);
      if (!row) return;

      const newValues = { ...row.values, [columnName]: value };

      // Optimistic update
      setDetails((prev) =>
        prev.map((d) => (d.id === rowId ? { ...d, values: newValues } : d))
      );

      try {
        await update("order_pattern_details", {
          id: rowId,
          data: { values: newValues },
          previousData: row,
        });
      } catch (error: any) {
        notify(`Грешка при запис: ${error.message}`, { type: "error" });
        // Revert on error
        setDetails((prev) => prev.map((d) => (d.id === rowId ? row : d)));
      }
    },
    [details, update, notify]
  );

  // Handle drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = details.findIndex((d) => d.id === active.id);
    const newIndex = details.findIndex((d) => d.id === over.id);

    const newDetails = arrayMove(details, oldIndex, newIndex);

    // Update position numbers
    const updatedDetails = newDetails.map((detail : any, index: number) => ({
      ...detail,
      position_number: index + 1,
    }));

    // Optimistic update
    setDetails(updatedDetails);

    // Save to backend
    try {
      await Promise.all(
        updatedDetails
          .filter((d, i) => d.position_number !== details[i]?.position_number)
          .map((detail) =>
            update("order_pattern_details", {
              id: detail.id,
              data: { position_number: detail.position_number },
              previousData: details.find((d) => d.id === detail.id)!,
            })
          )
      );

      notify("Позициите са преподредени успешно", { type: "success" });
    } catch (error: any) {
      notify(`Грешка при преподреждане: ${error.message}`, { type: "error" });
      // Revert on error
      setDetails(details);
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

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={details.map((d) => d.id)} strategy={verticalListSortingStrategy}>
          <TableContainer component={Paper} sx={{ maxHeight: "calc(100vh - 200px)" }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 50 }}></TableCell>
                  <TableCell sx={{ width: 80, fontWeight: "bold" }}>Поз.</TableCell>
                  {columns.map((col: any) => (
                    <TableCell key={col.id} sx={{ minWidth: 120 }}>
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {col.column_name}
                        </Typography>
                        <Chip label={col.label} size="small" sx={{ mt: 0.5 }} />
                      </Box>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {details.map((row) => (
                  <SortableRow
                    key={row.id}
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
          💡 Съвет: Кликнете върху клетка за редактиране. Използвайте ⋮⋮ за преместване на
          редове.
        </Typography>
      </Box>
    </Box>
  );
};
