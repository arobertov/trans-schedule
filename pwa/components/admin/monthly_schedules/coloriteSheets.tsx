const applyMatrixFrequencyStyles = async (
        commandService: any,
        unitId: string,
        subUnitId: string,
        sheet: any,
        lastEmployeeRow: number,
        matrixColumns: number[] = [0, 1, 2, 3]
    ) => {
        const globalConflictSummary = getGlobalColumnConflictSummary(sheet, lastEmployeeRow);

        for (const col of matrixColumns) {
            const counts = new Map<string, number>();

            for (let r = GRID_ROW_OFFSET; r <= lastEmployeeRow; r++) {
                const raw = String(sheet.getCell(r, col)?.v ?? '').trim();
                if (raw) {
                    counts.set(raw, (counts.get(raw) || 0) + 1);
                }
            }

            for (let r = GRID_ROW_OFFSET; r <= lastEmployeeRow; r++) {
                const currentValue = sheet.getCell(r, col)?.v ?? '';
                const key = String(currentValue ?? '').trim();

                const globalConflict = key
                    ? (col === 0
                        ? globalConflictSummary.p1Values.has(key)
                            || globalConflictSummary.p2Values.has(key)
                            || globalConflictSummary.p3Values.has(key)
                        : globalConflictSummary.globalValues.has(key))
                    : false;

                let style = SCHEDULE_TEMPLATE.matrixInputCell;
                if (key) {
                    const freq = counts.get(key) || 0;
                    style = freq === 1 && !globalConflict
                        ? getValidationMatrixStyle(matrixValidationColorsRef.current.single)
                        : getValidationMatrixStyle(matrixValidationColorsRef.current.duplicate);
                }

                // When the cell is empty we must explicitly reset bg to null.
                // Without it Univer merges the new style with the existing one and
                // the previous validation color (green/duplicate) persists.
                const resolvedStyle = key ? style : { ...SCHEDULE_TEMPLATE.matrixInputCell, bg: null };
                await setCellValueSafely(commandService, unitId, subUnitId, sheet, r, col, currentValue, resolvedStyle);
            }
        }
    };