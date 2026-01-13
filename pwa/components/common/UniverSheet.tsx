import React, { useEffect, useRef, useState } from 'react';
import "@univerjs/design/lib/index.css";
import "@univerjs/ui/lib/index.css";
import "@univerjs/sheets-ui/lib/index.css";
import "@univerjs/sheets-formula-ui/lib/index.css";
import "@univerjs/docs-ui/lib/index.css";

import { Univer, LocaleType, LogLevel } from "@univerjs/core";
import { defaultTheme } from "@univerjs/design";
import { UniverDocsPlugin } from "@univerjs/docs";
import { UniverDocsUIPlugin } from "@univerjs/docs-ui";
import { UniverFormulaEnginePlugin } from "@univerjs/engine-formula";
import { UniverRenderEnginePlugin } from "@univerjs/engine-render";
import { UniverSheetsPlugin } from "@univerjs/sheets";
import { UniverSheetsFormulaPlugin } from "@univerjs/sheets-formula";
import { UniverSheetsFormulaUIPlugin } from "@univerjs/sheets-formula-ui";
import { UniverSheetsUIPlugin } from "@univerjs/sheets-ui";
import { UniverUIPlugin } from "@univerjs/ui";
import { FUniver } from "@univerjs/facade";

import { enUS as UniverDesignEnUS } from "@univerjs/design";
import { enUS as UniverDocsUIEnUS } from "@univerjs/docs-ui";
import { enUS as UniverSheetsUIEnUS } from "@univerjs/sheets-ui";
import { enUS as UniverUIEnUS } from "@univerjs/ui";

interface UniverSheetProps {
  data?: any;
}

const UniverSheet: React.FC<UniverSheetProps> = ({ data }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const univerRef = useRef<Univer | null>(null);
  const workbookRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clean up previous instance
    if (univerRef.current) {
        univerRef.current.dispose();
        univerRef.current = null;
    }

    // Initialize Univer
    const univer = new Univer({
      theme: defaultTheme,
      locale: LocaleType.EN_US,
      locales: {
        [LocaleType.EN_US]: {
          ...UniverDesignEnUS,
          ...UniverDocsUIEnUS,
          ...UniverSheetsUIEnUS,
          ...UniverUIEnUS,
        },
      },
      logLevel: LogLevel.VERBOSE,
    });

    univerRef.current = univer;

    // Register plugins
    univer.registerPlugin(UniverRenderEnginePlugin);
    univer.registerPlugin(UniverFormulaEnginePlugin);
    
    univer.registerPlugin(UniverUIPlugin, {
      container: containerRef.current,
      header: true,
      footer: true,
    });

    univer.registerPlugin(UniverDocsPlugin);
    univer.registerPlugin(UniverDocsUIPlugin);
    univer.registerPlugin(UniverSheetsPlugin);
    univer.registerPlugin(UniverSheetsUIPlugin);
    univer.registerPlugin(UniverSheetsFormulaPlugin);
    univer.registerPlugin(UniverSheetsFormulaUIPlugin);

    // Create workbook
    workbookRef.current = univer.createUniverSheet(data || {});

    // Facade API for ease of use
    const fUniver = FUniver.newAPI(univer);
    
    return () => {
      if (univerRef.current) {
        univerRef.current.dispose();
        univerRef.current = null;
      }
    };
  }, []); // Re-run if data changes if needed, but careful with full re-init

  return <div ref={containerRef} style={{ height: '100%', width: '100%' }} />;
};

export default UniverSheet;
