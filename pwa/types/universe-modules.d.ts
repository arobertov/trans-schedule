// Type declarations for @univerjs sub-path exports that TypeScript
// cannot resolve with "moduleResolution": "node" (no exports map support).

declare module "@univerjs/core/facade" {
    export { FUniver } from "@univerjs/core/lib/types/facade/index";
}
