"use client";

import { useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import "@excalidraw/excalidraw/index.css";

const Excalidraw = dynamic(
    () => import("@excalidraw/excalidraw").then(m => ({ default: m.Excalidraw })),
    { ssr: false }
);

interface ExcalidrawCanvasProps {
    initialData?: unknown;
    onChange?: (data: { elements: unknown[]; appState: unknown }) => void;
    darkMode?: boolean;
    /** Read-only: shows the scene without editing tools. */
    viewOnly?: boolean;
}

export function ExcalidrawCanvas({ initialData, onChange, darkMode = true, viewOnly = false }: ExcalidrawCanvasProps) {
    const isInitialRef = useRef(true);
     
    const excalidrawAPIRef = useRef<any>(null);

    const handleChange = useCallback(
         
        (elements: readonly any[], appState: any) => {
            // Skip the very first onChange call from initialization
            if (isInitialRef.current) {
                isInitialRef.current = false;
                return;
            }
            onChange?.({
                elements: [...elements],
                appState: {
                    viewBackgroundColor: appState.viewBackgroundColor,
                    currentItemStrokeColor: appState.currentItemStrokeColor,
                    currentItemBackgroundColor: appState.currentItemBackgroundColor,
                },
            });
        },
        [onChange]
    );

    // Build initial data object
     
    const initial = initialData as any;
    const initialDataObj = initial?.elements
        ? {
              elements: initial.elements,
              appState: {
                  ...initial.appState,
                  theme: darkMode ? "dark" : "light",
              },
          }
        : {
              elements: [],
              appState: {
                  viewBackgroundColor: darkMode ? "#171717" : "#ffffff",
                  theme: darkMode ? "dark" : "light",
              },
          };

    return (
        <div className="h-full w-full" style={{ minHeight: "400px" }}>
            <Excalidraw
                initialData={initialDataObj}
                onChange={handleChange}
                theme={darkMode ? "dark" : "light"}
                viewModeEnabled={viewOnly}
                UIOptions={{
                    canvasActions: {
                        saveToActiveFile: false,
                        loadScene: false,
                        export: false,
                        toggleTheme: false,
                    },
                }}
                 
                excalidrawAPI={(api: any) => {
                    excalidrawAPIRef.current = api;
                }}
            />
        </div>
    );
}

export default ExcalidrawCanvas;