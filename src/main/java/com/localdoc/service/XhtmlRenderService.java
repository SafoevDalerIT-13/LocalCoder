package com.localdoc.service;

import com.localdoc.model.docstructure.Document211;
import com.localdoc.model.docstructure.ErrorInfo;
import com.localdoc.model.docstructure.FieldInfo;
import org.springframework.stereotype.Service;

@Service
public class XhtmlRenderService {

    public String render211(Document211 doc) {
        StringBuilder sb = new StringBuilder();

        sb.append("<h1>").append(esc(doc.getMethodName())).append("</h1>\n\n");

        sb.append("<h2>Общие сведения</h2>\n");
        sb.append("<table>\n");
        appendRow(sb, "Наименование метода", esc(doc.getMethodName()));
        appendRow(sb, "Описание метода", esc(doc.getDescription()));
        appendRow(sb, "Алгоритм выполнения",
                "<a href=\"/api/docs/algorithm/" + esc(doc.getAlgorithmCode()) + "\">" + esc(doc.getAlgorithmCode()) + "</a>");
        appendRow(sb, "Полномочия", esc(doc.getAuthorities()));
        appendRow(sb, "SLA p95", esc(doc.getSlaP95()));
        appendRow(sb, "SLA p99", esc(doc.getSlaP99()));
        sb.append("</table>\n\n");

        sb.append("<h2>Входные параметры метода</h2>\n");
        sb.append("<p>Содержит описание формата входных данных в виде таблицы</p>\n");
        sb.append("<table>\n");
        sb.append("  <tr>\n");
        sb.append("    <th>Наименование параметра</th>\n");
        sb.append("    <th>Тип параметра</th>\n");
        sb.append("    <th>Обязательность/Множественность</th>\n");
        sb.append("    <th>Описание параметра</th>\n");
        sb.append("    <th>Комментарий</th>\n");
        sb.append("  </tr>\n");
        for (FieldInfo f : doc.getInputParams()) {
            sb.append("  <tr>\n");
            sb.append("    <td>").append(esc(f.getName())).append("</td>\n");
            sb.append("    <td>").append(esc(f.getType())).append("</td>\n");
            sb.append("    <td>").append(esc(f.getRequired())).append("</td>\n");
            sb.append("    <td>").append(esc(f.getDescription())).append("</td>\n");
            sb.append("    <td>").append(esc(f.getComment())).append("</td>\n");
            sb.append("  </tr>\n");
        }
        sb.append("</table>\n\n");

        sb.append("<h2>Выходные параметры метода</h2>\n");
        sb.append("<p>Содержит описание формата выходных данных в виде таблицы:</p>\n");
        sb.append("<table>\n");
        sb.append("  <tr>\n");
        sb.append("    <th>Наименование параметра</th>\n");
        sb.append("    <th>Тип параметра</th>\n");
        sb.append("    <th>Обязательность/Множественность</th>\n");
        sb.append("    <th>Описание параметра</th>\n");
        sb.append("    <th>Мапинг на БД</th>\n");
        sb.append("  </tr>\n");
        for (FieldInfo f : doc.getOutputParams()) {
            sb.append("  <tr>\n");
            sb.append("    <td>").append(esc(f.getName())).append("</td>\n");
            sb.append("    <td>").append(esc(f.getType())).append("</td>\n");
            sb.append("    <td>").append(esc(f.getRequired())).append("</td>\n");
            sb.append("    <td>").append(esc(f.getDescription())).append("</td>\n");
            sb.append("    <td>").append(esc(f.getDbMapping())).append("</td>\n");
            sb.append("  </tr>\n");
        }
        sb.append("</table>\n\n");

        sb.append("<h2>Список возможных ошибок</h2>\n");
        sb.append("<table>\n");
        sb.append("  <tr><th>Код ошибки</th><th>Текст ошибки</th></tr>\n");
        for (ErrorInfo e : doc.getErrors()) {
            sb.append("  <tr><td>").append(esc(e.getCode())).append("</td><td>").append(esc(e.getText())).append("</td></tr>\n");
        }
        sb.append("</table>\n");

        return sb.toString();
    }

    private void appendRow(StringBuilder sb, String label, String value) {
        sb.append("  <tr>\n");
        sb.append("    <th>").append(label).append("</th>\n");
        sb.append("    <td>").append(value).append("</td>\n");
        sb.append("  </tr>\n");
    }

    private String esc(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }
}
