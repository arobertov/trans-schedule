<TableContainer component={Paper}>
                <Table size="small" stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell style={{ minWidth: 150, zIndex: 10, left: 0, position: 'sticky', background: '#fff' }}>Служител</TableCell>
                            {isDriverPosition && (
                                <TableCell style={{ minWidth: 80, zIndex: 10, left: 150, position: 'sticky', background: '#fff' }}>Матрица Ред</TableCell>
                            )}
                            {daysArray.map(d => (
                                <TableCell key={d} align="center" style={{ minWidth: 40, padding: 2 }}>{d}</TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((row, index) => (
                            <TableRow key={row.employee_id}>
                                <TableCell style={{ position: 'sticky', left: 0, background: '#fff', zIndex: 5 }}>
                                    {row.employee_name}
                                </TableCell>
                                {isDriverPosition && (
                                    <TableCell style={{ position: 'sticky', left: 150, background: '#fff', zIndex: 5 }}>
                                        <TextField 
                                            size="small" 
                                            value={row.matrix_row || ''} 
                                            onChange={(e) => handleCellChange(index, 'matrix_row', e.target.value)}
                                            onBlur={(e) => importMatrixRow(index, e.target.value)}
                                            placeholder="#"
                                            sx={{ width: 60 }}
                                        />
                                    </TableCell>
                                )}
                                {daysArray.map(d => (
                                    <TableCell key={d} padding="none">
                                        <TextField
                                            variant="standard"
                                            InputProps={{ disableUnderline: true }}
                                            value={row[`day_${d}`] || ''}
                                            onChange={(e) => handleCellChange(index, `day_${d}`, e.target.value)}
                                            sx={{ 
                                                input: { 
                                                    textAlign: 'center', 
                                                    padding: '8px 2px',
                                                    fontSize: '0.8rem'
                                                } 
                                            }}
                                        />
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer> 