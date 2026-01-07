import React, { useState, useEffect, useCallback, memo, ChangeEvent } from "react";
import {
  useDataProvider,
  useNotify,
  useGetOne,
  useUpdate,
  Loading,
  Button,
  Confirm,
  useDeleteMany
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
  Checkbox,
  Tooltip,
  IconButton,
  Toolbar,
  alpha
} from "@mui/material";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import DeleteIcon from "@mui/icons-material/Delete";

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
  isSelected,
  onSelect,
}: {
  row: DetailRow;
  columns: any[];
  onCellChange: (rowId: number, columnName: string, value: string) => void;
  isSelected: boolean;
  onSelect: (rowId: number, checked: boolean) => void;
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
      : (isSelected 
          ? alpha(theme.palette.primary.main, theme.palette.action.selectedOpacity)
          : (isDarkMode ? theme.palette.background.paper : "white")
        ),
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={{
        ...style,
        pointerEvents: isDragging ? "none" : "auto",
      }}
      selected={isSelected}
    >
      <TableCell padding="checkbox">
        <Checkbox
            color="primary"
            checked={isSelected}
            onChange={(event) => {
                // Prevent drag start when clicking checkbox
                event.stopPropagation();
                onSelect(row.id, event.target.checked);
            }}
            inputProps={{
            'aria-labelledby': `enhanced-table-checkbox-${row.id}`,
            }}
            onPointerDown={(e) => e.stopPropagation()} // Stop DnD listeners
        />
      </TableCell>
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
            onPointerDown={(e) => e.stopPropagation()} // Stop DnD listeners for input
          />
        </TableCell>
      ))}
    </TableRow>
  );
});

SortableRow.displayName = "SortableRow";

export const PatternDetailGrid = ({ patternId, onOrderChange }: PatternDetailGridProps) => {
  const theme = useTheme();
  const [details, setDetails] = useState<DetailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const [update] = useUpdate();
  const [deleteMany, { isLoading: isDeleting }] = useDeleteMany();

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

  // Handle Select All
  const handleSelectAllClick = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setDetails(currentDetails => {
          const newSelecteds = currentDetails.map((n) => n.id);
          setSelectedIds(newSelecteds);
          return currentDetails;
      });
      return;
    }
    setSelectedIds([]);
  }, []);

  // Handle Single Select
  const handleSelect = useCallback((id: number, checked: boolean) => {
    setSelectedIds(prevSelectedIds => {
        const selectedIndex = prevSelectedIds.indexOf(id);
        let newSelected: number[] = [];

        if (selectedIndex === -1) {
            newSelected = newSelected.concat(prevSelectedIds, id);
        } else if (selectedIndex === 0) {
            newSelected = newSelected.concat(prevSelectedIds.slice(1));
        } else if (selectedIndex === prevSelectedIds.length - 1) {
            newSelected = newSelected.concat(prevSelectedIds.slice(0, -1));
        } else if (selectedIndex > 0) {
            newSelected = newSelected.concat(
                prevSelectedIds.slice(0, selectedIndex),
                prevSelectedIds.slice(selectedIndex + 1),
            );
        }
        return newSelected;
    });
  }, []);

  // Handle Bulk Delete
  const handleDeleteConfirm = useCallback(() => {
     deleteMany(
        'order_pattern_details',
        { ids: selectedIds },
        {
            onSuccess: () => {
                notify(`Изтрити са ${selectedIds.length} записа`, { type: 'success' });
                // Remove from local state
                setDetails(prev => prev.filter(d => !selectedIds.includes(d.id)));
                setSelectedIds([]);
                setIsConfirmOpen(false);
                if (onOrderChange) onOrderChange();
            },
            onError: (error: any) => {
                notify(`Грешка при изтриване: ${error.message}`, { type: 'error' });
                setIsConfirmOpen(false);
            }
        }
     );
  }, [selectedIds, deleteMany, notify, onOrderChange]);

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
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

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
    const movedItem = details[oldIndex];
    const newPosition = newIndex + 1;

    try {
      const patternIri = resolvePatternIri(movedItem, pattern, patternId);
      
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
      setDetails(details); 
      setIsDragging(false);
    }
  };

  if (loading || patternLoading) return <Loading />;

  if (!pattern) return <Box p={3}><Typography color="error">Порядъкът не е намерен</Typography></Box>;
  if (details.length === 0) return <Box p={3}><Typography>Няма детайли за този порядък</Typography></Box>;

  return (
    <Box>
      {/* Enhanced Toolbar for Batch Actions */}
      <Toolbar
        sx={{
          pl: { sm: 2 },
          pr: { xs: 1, sm: 1 },
          ...(selectedIds.length > 0 && {
            bgcolor: (theme) =>
              alpha(theme.palette.primary.main, theme.palette.action.activatedOpacity),
          }),
        }}
      >
        {selectedIds.length > 0 ? (
          <Typography sx={{ flex: '1 1 100%' }} color="inherit" variant="subtitle1" component="div">
            {selectedIds.length} избрани
          </Typography>
        ) : (
          <Box display="flex" justifyContent="space-between" width="100%" alignItems="center">
            <Typography variant="h6" id="tableTitle" component="div">
              {pattern.name} ({details.length} позиции)
            </Typography>
          </Box>
        )}

        {selectedIds.length > 0 && (
          <Tooltip title="Изтриване">
            <IconButton onClick={() => setIsConfirmOpen(true)}>
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        )}
      </Toolbar>

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
                   <TableCell padding="checkbox">
                    <Checkbox
                      color="primary"
                      indeterminate={selectedIds.length > 0 && selectedIds.length < details.length}
                      checked={details.length > 0 && selectedIds.length === details.length}
                      onChange={handleSelectAllClick}
                      inputProps={{
                        'aria-label': 'select all items',
                      }}
                    />
                  </TableCell>
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
                    isSelected={selectedIds.indexOf(row.id) !== -1}
                    onSelect={handleSelect}
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

      <Confirm
        isOpen={isConfirmOpen}
        title="Изтриване на детайли"
        content={`Сигурни ли сте, че искате да изтриете ${selectedIds.length} избрани позиции? Тази операция не може да бъде отменена.`}
        onConfirm={handleDeleteConfirm}
        onClose={() => setIsConfirmOpen(false)}
      />
    </Box>
  );
};