/**
 * 호주 보고서 스타일 토큰 — react-pdf StyleSheet
 */
import { StyleSheet } from "@react-pdf/renderer";

export const NAVY = "#1B2A4A";
export const GRAY_TEXT = "#595959";
export const GRAY_LABEL_BG = "#F2F2F2";
export const GRAY_BORDER = "#D9D9D9";

export const pdfStyles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    padding: 32,
    fontFamily: "Pretendard",
    fontSize: 9,
    lineHeight: 1.4,
    color: GRAY_TEXT,
  },
  titleBar: {
    fontSize: 14,
    fontWeight: "bold",
    color: NAVY,
    textAlign: "center",
    marginBottom: 4,
  },
  subTitle: {
    fontSize: 9,
    color: GRAY_TEXT,
    textAlign: "center",
    marginBottom: 12,
  },
  headerBar: {
    backgroundColor: NAVY,
    padding: 6,
    marginBottom: 10,
  },
  headerBarText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
  },
  blockHeader: {
    fontSize: 10,
    fontWeight: "bold",
    color: NAVY,
    marginTop: 10,
    marginBottom: 4,
  },
  twoColTable: {
    borderWidth: 1,
    borderColor: GRAY_BORDER,
    marginBottom: 6,
  },
  twoColRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: GRAY_BORDER,
  },
  twoColRowLast: {
    flexDirection: "row",
  },
  labelCell: {
    width: "25%",
    backgroundColor: GRAY_LABEL_BG,
    padding: 5,
    fontWeight: "bold",
    color: NAVY,
    fontSize: 9,
  },
  contentCell: {
    width: "75%",
    padding: 5,
    fontSize: 9,
    color: GRAY_TEXT,
  },
  contentCellColumn: {
    width: "75%",
    padding: 5,
    flexDirection: "column",
    fontSize: 9,
    color: GRAY_TEXT,
  },
  verdictText: {
    fontSize: 11,
    fontWeight: "bold",
    color: NAVY,
  },
  reasoningItem: {
    fontSize: 9,
    color: GRAY_TEXT,
    marginBottom: 2,
  },
  /** 블록3 Aceclofenac scope=latam_average 각주 — 본문보다 한 단계 작게 */
  scopeFootnote: {
    fontSize: 7,
    color: GRAY_TEXT,
    marginTop: 4,
    fontStyle: "italic",
  },
  sourceTable: {
    borderWidth: 1,
    borderColor: GRAY_BORDER,
    marginTop: 4,
  },
  sourceHeaderRow: {
    flexDirection: "row",
    backgroundColor: NAVY,
    borderBottomWidth: 1,
    borderBottomColor: GRAY_BORDER,
  },
  sourceHeaderCell: {
    padding: 4,
    fontSize: 8,
    fontWeight: "bold",
    color: "#FFFFFF",
    flex: 1,
  },
  sourceRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: GRAY_BORDER,
  },
  sourceCell: {
    padding: 4,
    fontSize: 8,
    flex: 1,
    color: GRAY_TEXT,
  },
  footer: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: GRAY_BORDER,
    fontSize: 7,
    color: GRAY_TEXT,
  },
  paperTable: {
    borderWidth: 1,
    borderColor: GRAY_BORDER,
    padding: 6,
    minHeight: 180,
  },
  perplexitySection: {
    marginTop: "auto",
  },
  paperRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  paperIndex: {
    width: 14,
    fontSize: 8,
    color: NAVY,
    fontWeight: "bold",
  },
  paperBody: {
    flex: 1,
  },
  paperTitle: {
    fontSize: 8,
    color: NAVY,
    fontWeight: "bold",
  },
  paperMeta: {
    fontSize: 7,
    color: GRAY_TEXT,
    marginTop: 1,
  },
  paperUrl: {
    fontSize: 7,
    color: "#3b82f6",
    marginTop: 1,
  },
  emptyPaperText: {
    fontSize: 8,
    color: GRAY_TEXT,
    fontStyle: "italic",
  },
});
