package com.localdoc.service;

import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import org.apache.poi.xwpf.usermodel.*;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Element;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;

@Service
public class ExportService {

    public byte[] exportHtml(String xhtml) {
        String full = "<!DOCTYPE html>\n<html lang=\"ru\">\n<head>\n<meta charset=\"UTF-8\"/>\n<title>Documentation</title>\n<style>\n" +
                "body { font-family: 'Noto Sans', 'Segoe UI', Arial, sans-serif; padding: 2rem; color: #1f2937; line-height: 1.6; max-width: 1200px; margin: 0 auto; }\n" +
                "h1 { font-size: 1.6rem; margin: 0 0 0.75rem; color: #111827; }\n" +
                "h2 { font-size: 1.3rem; margin: 1rem 0 0.5rem; color: #1f2937; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.3rem; }\n" +
                "h3 { font-size: 1.1rem; margin: 0.75rem 0 0.4rem; color: #374151; }\n" +
                "table { border-collapse: collapse; width: 100%; margin: 0.5rem 0; table-layout: fixed; }\n" +
                "th, td { border: 1px solid #d1d5db; padding: 0.4rem 0.6rem; text-align: left; font-size: 0.9rem; word-wrap: break-word; overflow-wrap: break-word; }\n" +
                "th { background: #f3f4f6; font-weight: 600; }\n" +
                "ol, ul { padding-left: 1.5rem; margin: 0.5rem 0; }\n" +
                "code, pre { font-family: 'Courier New', monospace; background: #f1f5f9; padding: 0.2rem 0.4rem; border-radius: 4px; font-size: 0.85rem; }\n" +
                "pre { padding: 0.75rem; white-space: pre-wrap; word-break: break-word; }\n" +
                "</style>\n</head>\n<body>\n" + stripConfluenceMacros(xhtml) + "\n</body>\n</html>";
        return full.getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    public byte[] exportPdf(String xhtml) throws Exception {
        byte[] htmlBytes = exportHtml(xhtml);
        // openhtmltopdf requires strict XHTML — use Jsoup to produce valid XML output
        org.jsoup.nodes.Document doc = Jsoup.parse(new String(htmlBytes, java.nio.charset.StandardCharsets.UTF_8));
        doc.outputSettings().syntax(org.jsoup.nodes.Document.OutputSettings.Syntax.xml);
        doc.outputSettings().escapeMode(org.jsoup.nodes.Entities.EscapeMode.xhtml);
        String xhtmlDoc = doc.html();
        ByteArrayOutputStream os = new ByteArrayOutputStream();
        PdfRendererBuilder builder = new PdfRendererBuilder();
        byte[] fontBytes = readFontBytes();
        if (fontBytes != null) {
            builder.useFont(() -> new java.io.ByteArrayInputStream(fontBytes), "Noto Sans");
            builder.useFont(() -> new java.io.ByteArrayInputStream(fontBytes), "Segoe UI");
            builder.useFont(() -> new java.io.ByteArrayInputStream(fontBytes), "Arial");
            builder.useFont(() -> new java.io.ByteArrayInputStream(fontBytes), "sans-serif");
        }
        builder.withHtmlContent(xhtmlDoc, null);
        builder.toStream(os);
        builder.run();
        return os.toByteArray();
    }

    private byte[] readFontBytes() {
        try (var fontStream = getClass().getClassLoader().getResourceAsStream("fonts/NotoSans-Regular.ttf")) {
            if (fontStream == null) return null;
            return fontStream.readAllBytes();
        } catch (Exception e) {
            return null;
        }
    }

    public byte[] exportDocx(String xhtml) throws Exception {
        byte[] htmlBytes = exportHtml(xhtml);
        String html = new String(htmlBytes, java.nio.charset.StandardCharsets.UTF_8);
        org.jsoup.nodes.Document doc = Jsoup.parse(html);
        ByteArrayOutputStream os = new ByteArrayOutputStream();
        XWPFDocument document = new XWPFDocument();

        for (Element el : doc.body().children()) {
            String tag = el.tagName();
            if ("h1".equals(tag)) {
                addParagraph(document, el.text(), true, 18, ParagraphAlignment.LEFT);
            } else if ("h2".equals(tag)) {
                addParagraph(document, el.text(), true, 15, ParagraphAlignment.LEFT);
            } else if ("h3".equals(tag)) {
                addParagraph(document, el.text(), true, 13, ParagraphAlignment.LEFT);
            } else if ("p".equals(tag)) {
                addParagraph(document, el.text(), false, 11, ParagraphAlignment.LEFT);
            } else if (tag.matches("h[4-6]")) {
                addParagraph(document, el.text(), true, 12, ParagraphAlignment.LEFT);
            } else if ("table".equals(tag)) {
                org.jsoup.select.Elements rows = el.select("tr");
                if (rows.isEmpty()) continue;
                int colCount = rows.get(0).select("th, td").size();
                XWPFTable table = document.createTable(rows.size(), colCount);
                for (int ri = 0; ri < rows.size(); ri++) {
                    org.jsoup.select.Elements cells = rows.get(ri).select("th, td");
                    for (int ci = 0; ci < cells.size() && ci < colCount; ci++) {
                        XWPFTableCell cell = table.getRow(ri).getCell(ci);
                        cell.setText(cells.get(ci).text());
                        cell.getCTTc().addNewTcPr().addNewTcW().setW(java.math.BigInteger.valueOf(5000));
                        if (ri == 0) {
                            cell.getCTTc().addNewTcPr().addNewShd().setFill("D9E2F3");
                        }
                    }
                }
            } else if ("ol".equals(tag)) {
                for (Element li : el.select("> li")) {
                    XWPFParagraph p = document.createParagraph();
                    p.setIndentationLeft(400);
                    p.setIndentationHanging(200);
                    XWPFRun r = p.createRun();
                    r.setFontSize(11);
                    r.setText(li.text());
                }
            } else if ("ul".equals(tag)) {
                for (Element li : el.select("> li")) {
                    XWPFParagraph p = document.createParagraph();
                    p.setIndentationLeft(400);
                    p.setIndentationHanging(200);
                    XWPFRun r = p.createRun();
                    r.setFontSize(11);
                    r.setText("• " + li.text());
                }
            } else if ("pre".equals(tag)) {
                XWPFParagraph p = document.createParagraph();
                XWPFRun r = p.createRun();
                r.setFontFamily("Courier New");
                r.setFontSize(9);
                r.setText(el.text());
            }
        }

        document.write(os);
        document.close();
        return os.toByteArray();
    }

    private void addParagraph(XWPFDocument doc, String text, boolean bold, int fontSize, ParagraphAlignment align) {
        XWPFParagraph p = doc.createParagraph();
        p.setAlignment(align);
        XWPFRun r = p.createRun();
        r.setBold(bold);
        r.setFontSize(fontSize);
        r.setText(text);
    }

    public byte[] exportMarkdown(String xhtml) {
        String html = new String(exportHtml(xhtml), java.nio.charset.StandardCharsets.UTF_8);
        org.jsoup.nodes.Document doc = Jsoup.parse(html);
        StringBuilder md = new StringBuilder();
        for (Element el : doc.body().children()) {
            convertToMarkdown(el, md, 0);
        }
        return md.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    private void convertToMarkdown(Element el, StringBuilder md, int depth) {
        String tag = el.tagName();
        switch (tag) {
            case "h1": md.append("# ").append(el.text()).append("\n\n"); break;
            case "h2": md.append("## ").append(el.text()).append("\n\n"); break;
            case "h3": md.append("### ").append(el.text()).append("\n\n"); break;
            case "h4": md.append("#### ").append(el.text()).append("\n\n"); break;
            case "h5": md.append("##### ").append(el.text()).append("\n\n"); break;
            case "h6": md.append("###### ").append(el.text()).append("\n\n"); break;
            case "p": {
                String inline = extractInline(el);
                if (!inline.isEmpty()) md.append(inline).append("\n\n");
                break;
            }
            case "table": md.append(convertTable(el)).append("\n"); break;
            case "ol": {
                int idx = 1;
                for (Element li : el.select("> li")) {
                    md.append("  ".repeat(depth)).append(idx++).append(". ")
                      .append(extractInline(li)).append("\n");
                }
                md.append("\n");
                break;
            }
            case "ul": {
                for (Element li : el.select("> li")) {
                    md.append("  ".repeat(depth)).append("- ").append(extractInline(li)).append("\n");
                }
                md.append("\n");
                break;
            }
            case "pre": {
                md.append("```\n").append(el.text()).append("\n```\n\n");
                break;
            }
            case "hr": md.append("---\n\n"); break;
        }
    }

    private String extractInline(Element el) {
        StringBuilder sb = new StringBuilder();
        for (org.jsoup.nodes.Node child : el.childNodes()) {
            if (child instanceof org.jsoup.nodes.TextNode) {
                sb.append(((org.jsoup.nodes.TextNode) child).text());
            } else if (child instanceof Element) {
                Element c = (Element) child;
                String t = c.tagName();
                if ("strong".equals(t) || "b".equals(t)) {
                    sb.append("**").append(c.text()).append("**");
                } else if ("em".equals(t) || "i".equals(t)) {
                    sb.append("*").append(c.text()).append("*");
                } else if ("code".equals(t)) {
                    sb.append("`").append(c.text()).append("`");
                } else if ("a".equals(t)) {
                    sb.append("[").append(c.text()).append("](").append(c.attr("href")).append(")");
                } else if ("br".equals(t)) {
                    sb.append("\n");
                } else {
                    sb.append(c.text());
                }
            }
        }
        String result = sb.toString().trim();
        // escape markdown special chars
        result = result.replace("\\", "\\\\").replace("*", "\\*").replace("_", "\\_")
                       .replace("[", "\\[").replace("`", "\\`");
        return result;
    }

    private String convertTable(Element table) {
        org.jsoup.select.Elements rows = table.select("tr");
        if (rows.isEmpty()) return "";
        StringBuilder sb = new StringBuilder();
        // header row
        org.jsoup.select.Elements headerCells = rows.get(0).select("th, td");
        sb.append("| ");
        for (Element cell : headerCells) sb.append(cell.text()).append(" | ");
        sb.append("\n| ");
        for (Element cell : headerCells) sb.append("--- | ");
        sb.append("\n");
        // body rows
        for (int i = 1; i < rows.size(); i++) {
            sb.append("| ");
            for (Element cell : rows.get(i).select("th, td")) sb.append(cell.text()).append(" | ");
            sb.append("\n");
        }
        return sb.toString();
    }

    private String stripConfluenceMacros(String xhtml) {
        return xhtml.replaceAll("<ac:[a-zA-Z]+[^>]*>", "")
                .replaceAll("</ac:[a-zA-Z]+>", "")
                .replaceAll("<ri:[a-zA-Z]+[^>]*/>", "")
                .replaceAll("<!\\[CDATA\\[", "")
                .replaceAll("\\]\\]>", "");
    }
}
