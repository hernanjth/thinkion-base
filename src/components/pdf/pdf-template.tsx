/**
 * Base PDF template using @react-pdf/renderer.
 *
 * This is a starting point — customize the layout, colors, and slots
 * for your specific document type.
 *
 * Usage in an API route:
 *   import { BaseDocument } from "@/components/pdf/pdf-template";
 *   import { generatePdf, uploadPdfToStorage } from "@/lib/pdf";
 *
 *   const buffer = await generatePdf(
 *     <BaseDocument title="Mi Documento" subtitle="Generado el 01/01/2025">
 *       <Text>Contenido aquí</Text>
 *     </BaseDocument>
 *   );
 *   const url = await uploadPdfToStorage(buffer, `docs/${id}.pdf`);
 *
 * ── Page-break rules (apply in your children blocks) ──────────────────────────
 *
 * RULE 1 — wrap={false} must go on a plain outer View, NOT on a styled View.
 * react-pdf ignores wrap={false} when the View has flex/border/borderRadius styles.
 *
 *   // ❌ wrap ignored — View has complex styles
 *   <View style={{ borderWidth: 1, borderRadius: 6, flexDirection: "row" }} wrap={false}>
 *
 *   // ✅ neutral wrapper holds wrap; styled View lives inside
 *   <View wrap={false}>
 *     <View style={{ borderWidth: 1, borderRadius: 6 }}>...</View>
 *   </View>
 *
 * RULE 2 — For blocks that might be longer than one page (e.g. conditions text),
 * prefer break={true} over wrap={false}. break forces the block to always start
 * on a new page — predictable and never gets cut mid-content.
 *
 *   <View wrap={false} break={hasLongContent}>
 *     <View style={s.block}>...</View>
 *   </View>
 *
 * RULE 3 — To keep a section header together with the first row of its table,
 * wrap both in a plain View with wrap={false}. Individual rows can still break.
 *
 *   <View style={s.section}>
 *     <View wrap={false} style={{ overflow: "hidden" }}>
 *       <View style={s.sectionHead}>...</View>
 *       <View style={s.tableHeader}>...</View>
 *     </View>
 *     {rows.map(...)}   ← these can still break across pages
 *   </View>
 *
 * RULE 4 — Use minPresenceAhead={N} on separators/dividers so they don't
 * render alone at the bottom of a page without the content that follows them.
 *
 *   <View style={s.divider} minPresenceAhead={100}>...</View>
 */

import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  Font,
  Svg,
  Path,
  StyleSheet,
} from "@react-pdf/renderer";
import nodePath from "path";

// Register Outfit font — TTF files must be in public/fonts/
Font.register({
  family: "Outfit",
  fonts: [
    { src: nodePath.join(process.cwd(), "public/fonts/Outfit-Regular.ttf"), fontWeight: 400 },
    { src: nodePath.join(process.cwd(), "public/fonts/Outfit-Medium.ttf"), fontWeight: 500 },
    { src: nodePath.join(process.cwd(), "public/fonts/Outfit-SemiBold.ttf"), fontWeight: 600 },
    { src: nodePath.join(process.cwd(), "public/fonts/Outfit-Bold.ttf"), fontWeight: 700 },
  ],
});

// ── Palette (Thinkion brand) ──────────────────────────────────────────────────
const V = "#7B61FF";       // violet
const GRAY_200 = "#e5e7eb";
const GRAY_600 = "#4b5563";
const GRAY_700 = "#374151";

// SVG paths extracted from the Thinkion logo (viewBox 0 0 4535.43 793.82)
const LOGO_PATH_MAIN =
  "M569.84,75.48v10.11c0,40.46-10.11,50.58-50.59,50.58h-174.21v593.58c0,41.59-10.11,51.71-51.71,51.71h-15.72c-41.59,0-51.71-10.11-51.71-51.71V136.18H50.57C10.11,136.18,0,126.06,0,85.6v-10.11C0,35.02,10.11,24.9,50.57,24.9h468.69c40.47,0,50.59,10.11,50.59,50.58ZM964.34,211.61c-82.05,0-141.63,26.98-174.22,69.69V62.04c0-40.46-10.11-50.58-50.57-50.58h-14.62c-40.46,0-50.57,10.11-50.57,50.58v668.84c0,40.46,10.11,50.58,50.57,50.58h14.62c40.46,0,50.57-10.11,50.57-50.58v-269.75c0-106.77,51.71-141.62,138.26-141.62s119.13,30.35,119.13,104.53v306.84c0,40.46,10.11,50.58,50.59,50.58h14.6c40.46,0,50.59-10.11,50.59-50.58v-324.83c0-141.61-86.55-194.45-198.94-194.45ZM1355.47,0c-39.34,0-71.93,31.48-71.93,70.81s32.6,70.81,71.93,70.81,70.81-31.47,70.81-70.81S1394.81,0,1355.47,0ZM1362.21,223.97h-14.6c-40.47,0-50.59,10.11-50.59,50.58v456.33c0,40.46,10.11,50.58,50.59,50.58h14.6c40.47,0,50.59-10.11,50.59-50.58v-456.33c0-40.46-10.11-50.58-50.59-50.58Z";
const LOGO_PATH_SECONDARY =
  "M4490.47,388.07c35.98,39.34,44.96,60.69,44.96,95.54,0,33.71-8.98,61.82-44.96,103.4l-125.88,147.24c-33.71,38.21-53.94,47.21-104.53,47.21h-19.11c-50.57,0-55.08-9-21.35-47.21l179.83-207.93c11.23-12.37,21.35-25.85,21.35-39.34,0-14.61-10.11-28.1-22.48-40.46l-156.22-175.34c-33.73-38.22-29.22-47.21,21.35-47.21h19.11c50.57,0,70.81,8.99,104.53,47.21l103.39,116.89Z";

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: "Outfit",
    fontSize: 10,
    color: GRAY_700,
    backgroundColor: "#fff",
  },

  // Violet header band
  header: {
    backgroundColor: V,
    paddingHorizontal: 40,
    paddingTop: 28,
    paddingBottom: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: { flex: 1 },
  headerRight: { alignItems: "flex-end" },
  headerTitle: { fontSize: 18, fontWeight: 700, color: "#fff" },
  headerSub: { fontSize: 10, color: "#fff", opacity: 0.85, marginTop: 2 },

  // Body content area
  body: {
    paddingHorizontal: 40,
    paddingTop: 24,
    paddingBottom: 40,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: GRAY_200,
    paddingTop: 8,
  },
  footerText: { fontSize: 8, color: GRAY_600, opacity: 0.7 },
});

// ── Component ─────────────────────────────────────────────────────────────────

interface BaseDocumentProps {
  title: string;
  subtitle?: string;
  footerLeft?: string;
  footerRight?: string;
  children?: React.ReactNode;
}

/**
 * Base PDF document with Thinkion branding.
 * - Violet header with logo SVG + title/subtitle
 * - Content area (pass children — use @react-pdf/renderer primitives)
 * - Footer with optional left/right labels and page number
 */
export function BaseDocument({
  title,
  subtitle,
  footerLeft = "Thinkion",
  footerRight,
  children,
}: BaseDocumentProps) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* ── Header ─────────────────────────────────────────────────── */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            {/* Thinkion logo in white */}
            <Svg viewBox="0 0 4535.43 793.82" style={{ width: 80, height: 14 }}>
              <Path d={LOGO_PATH_MAIN} fill="#ffffff" />
              <Path d={LOGO_PATH_SECONDARY} fill="rgba(255,255,255,0.6)" />
            </Svg>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerTitle}>{title}</Text>
            {subtitle && <Text style={s.headerSub}>{subtitle}</Text>}
          </View>
        </View>

        {/* ── Body ───────────────────────────────────────────────────── */}
        <View style={s.body}>
          {children}
        </View>

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>{footerLeft}</Text>
          {footerRight && <Text style={s.footerText}>{footerRight}</Text>}
          <Text
            style={s.footerText}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
