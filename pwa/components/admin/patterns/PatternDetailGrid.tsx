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
  Paper,
  Typography,
  Chip,
} from "@mui/material";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";

interface PatternDetailGridProps {
  patternId: string;
}

interface DetailRow {
  id: number;
  "@id"?: string; // API Platform IRI
  position_number: number;
  values: Record<string, string>;
  pattern?: string | { "@id"?: string } | null;
  [key: string]: unknown;
}

const resolvePatternIri = (
  detail: DetailRow,
  patternResource: unknown,
  fallbackPatternId: string
): string => {
  const detailPattern = detail.pattern;

  if (typeof detailPattern === "string" && detailPattern.length > 0) {
    return detailPattern;
  }

  if (
    detailPattern &&
    typeof detailPattern === "object" &&
    "@id" in detailPattern &&
    typeof detailPattern["@id"] === "string" &&
    detailPattern["@id"]
  ) {
    return detailPattern["@id"] as string;
  }

  if (typeof patternResource === "string" && patternResource.length > 0) {
    return patternResource;
  }

  if (
    patternResource &&
    typeof patternResource === "object" &&
    "@id" in (patternResource as Record<string, unknown>) &&
    typeof (patternResource as Record<string, unknown>)["@id"] === "string"
  ) {
    return (patternResource as Record<string, unknown>)["@id"] as string;
  }

  if (
    patternResource &&
    typeof patternResource === "object" &&
    "id" in (patternResource as Record<string, unknown>) &&
    (patternResource as Record<string, unknown>)["id"]
  ) {
    return `/order_patterns/${(patternResource as Record<string, unknown>)["id"]}`;
  }

  return `/order_patterns/${fallbackPatternId}`;
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row["@id"] || String(row.id),
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: isDragging ? "#f5f5f5" : "white",
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={{
        ...style,
        pointerEvents: isDragging ? "none" : "auto", // Allow hit-testing other rows while dragging
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
      <TableCell sx={{ width: 80, fontWeight: "bold" }}>{row.position_number}</TableCell>
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
              border: "1px solid #e0e0e0",
              borderRadius: "4px",
              fontSize: "0.875rem",
              outline: "none",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#1976d2")}
            onBlur={(e) => (e.target.style.borderColor = "#e0e0e0")}
          />
        </TableCell>
      ))}
    </TableRow>
  );
});

SortableRow.displayName = "SortableRow";

export const PatternDetailGrid = ({ patternId }: PatternDetailGridProps) => {
  const [details, setDetails] = useState<DetailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const refresh = useRefresh();
  const [update] = useUpdate();

  const { data: pattern, isLoading: patternLoading } = useGetOne("order_patterns", {
    id: patternId,
  });

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
      notify(`Грешка при зареждане: ${error.message}`, { type: "error" });
    } finally {
      setLoading(false);
    }
  }, [patternId, dataProvider, notify]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const handleCellChange = useCallback(
    async (rowId: number, columnName: string, value: string) => {
      const row = details.find((d) => d.id === rowId);
      if (!row) return;

      const newValues = { ...row.values, [columnName]: value };

      setDetails((prev) =>
        prev.map((d) => (d.id === rowId ? { ...d, values: newValues } : d))
      );

      try {
        // Build full payload so API keeps pattern reference in sync with edited value
        const payload = {
          ...row,
          values: newValues,
          pattern: resolvePatternIri(row, pattern, patternId),
        };

        await update("order_pattern_details", {
          id: (row["@id"] as string | undefined) ?? rowId,
          data: payload,
          previousData: row,
        });

        refresh();
      } catch (error: any) {
        notify(`Грешка при запис: ${error.message}`, { type: "error" });
        setDetails((prev) => prev.map((d) => (d.id === rowId ? row : d)));
      }
    },
    [details, update, notify, pattern, patternId, refresh]
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

  const handleDragStart = (event: any) => {
    console.log("DragStart event:", { activeId: event.active.id });
  };

  const handleDragOver = (event: any) => {
    console.log("DragOver event:", { activeId: event.active.id, overId: event.over?.id });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    console.log("DragEnd event:", { activeId: active.id, overId: over?.id });

    if (!over || active.id === over.id) return;

    const oldIndex = details.findIndex(
      (d) => (d["@id"] && d["@id"] === active.id) || String(d.id) === active.id
    );
    const newIndex = details.findIndex(
      (d) => (d["@id"] && d["@id"] === over.id) || String(d.id) === over.id
    );

    console.log("Drag indices:", { oldIndex, newIndex });

    if (oldIndex === -1 || newIndex === -1) {
      console.error("Invalid indices:", { oldIndex, newIndex });
      return;
    }

    // Reorder the in-memory list and normalize displayed positions 1..N
    const reordered = arrayMove(details, oldIndex, newIndex);

    const updatedDetails = reordered.map((detail, index: number) => ({
      ...detail,
      position_number: index + 1,
    }));

    setDetails(updatedDetails);

    try {
      // Determine which rows actually changed position_number
      const changed = updatedDetails
        .map((detail) => ({
          detail,
          previous: details.find((orig) => orig.id === detail.id),
        }))
        .filter(
          (entry): entry is { detail: DetailRow; previous: DetailRow } =>
            !!entry.previous && entry.previous.position_number !== entry.detail.position_number
        );

      if (changed.length === 0) {
        return;
      }

      // Stage updates using temporary positions to avoid unique constraint collisions
      const total = updatedDetails.length;
      const stagedById = new Map<number, DetailRow>();

      for (const { detail, previous } of changed) {
        const tempPosition = detail.position_number + total;
        const patternIri = resolvePatternIri(detail, pattern, patternId);
        const payload = {
          ...previous,
          position_number: tempPosition,
          pattern: patternIri,
        } as DetailRow;

        stagedById.set(detail.id, payload);

        await update("order_pattern_details", {
          id: (detail["@id"] as string | undefined) ?? detail.id,
          data: payload,
          previousData: previous,
        });
      }

      // Finalize each row with its true position once staging is persisted
      for (const { detail } of changed) {
        const staged = stagedById.get(detail.id);
        if (!staged) continue;

        const finalPayload = {
          ...staged,
          position_number: detail.position_number,
        };

        await update("order_pattern_details", {
          id: (detail["@id"] as string | undefined) ?? detail.id,
          data: finalPayload,
          previousData: staged,
        });
      }

      notify("Позициите са преподредени успешно", { type: "success" });
      refresh();
      await fetchDetails();
    } catch (error: any) {
      notify(`Грешка при преподреждане: ${error.message}`, { type: "error" });
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

      <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={details.map((d) => d["@id"] || String(d.id))}
          strategy={rectSortingStrategy}
        >
          <TableContainer component={Paper} sx={{ maxHeight: "calc(100vh - 200px)" }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 50 }}></TableCell>
                  <TableCell sx={{ width: 80, fontWeight: "bold" }}>Поз.</TableCell>
                  {columns.map((col: any) => (
                    <TableCell key={col.id} sx={{ minWidth: 120 }}>
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
