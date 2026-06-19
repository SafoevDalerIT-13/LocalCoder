package com.localdoc.service;

import com.localdoc.model.docstructure.AlgorithmStep;
import com.localdoc.model.docstructure.Document211;
import com.localdoc.model.docstructure.Document230;
import com.localdoc.model.docstructure.ErrorInfo;
import com.localdoc.model.docstructure.FieldInfo;
import org.springframework.stereotype.Service;

@Service
public class XhtmlRenderService {

    public String render211(Document211 doc) {
        StringBuilder sb = new StringBuilder();

        String methodTitle = doc.getMethodName()
                + (doc.getAlgorithmDescription() != null && !doc.getAlgorithmDescription().isBlank()
                        ? " - " + doc.getAlgorithmDescription() : "");
        sb.append("<h1>").append(esc(methodTitle)).append("</h1>\n\n");

        sb.append("<ul style=\"font-size:8pt\">\n");
        sb.append("  <li><a href=\"#overview\">Общие сведения</a></li>\n");
        sb.append("  <li><a href=\"#input\">Входные параметры метода</a></li>\n");
        sb.append("  <li><a href=\"#output\">Выходные параметры метода</a></li>\n");
        sb.append("  <li><a href=\"#errors\">Список возможных ошибок</a></li>\n");
        sb.append("</ul>\n\n");

        sb.append("<h2 id=\"overview\">Общие сведения</h2>\n");
        sb.append("<table>\n");
        appendRow(sb, "Наименование метода", esc(doc.getMethodName()));
        appendRow(sb, "Описание метода", esc(doc.getDescription()));
        String algValue = esc(doc.getAlgorithmCode() + " - " + doc.getAlgorithmDescription());
        if (doc.getAlgorithmLink() != null && !doc.getAlgorithmLink().isBlank()) {
            algValue = "<a href=\"" + esc(doc.getAlgorithmLink()) + "\">" + algValue + "</a>";
        }
        appendRow(sb, "Алгоритм выполнения", algValue);
        appendRow(sb, "Полномочия", esc(doc.getAuthorities()));
        appendRow(sb, "SLA p95", esc(doc.getSlaP95()));
        appendRow(sb, "SLA p99", esc(doc.getSlaP99()));
        sb.append("</table>\n\n");

        sb.append("<h2 id=\"input\">Входные параметры метода</h2>\n");
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

        sb.append("<h2 id=\"output\">Выходные параметры метода</h2>\n");
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

        sb.append("<h2 id=\"errors\">Список возможных ошибок</h2>\n");
        sb.append("<table>\n");
        sb.append("  <tr><th>Код ошибки</th><th>Текст ошибки</th></tr>\n");
        for (ErrorInfo e : doc.getErrors()) {
            sb.append("  <tr><td>").append(esc(e.getCode())).append("</td><td>").append(esc(e.getText())).append("</td></tr>\n");
        }
        sb.append("</table>\n");

        return sb.toString();
    }

    public String render230(Document230 doc) {
        StringBuilder sb = new StringBuilder();

        sb.append("<h1>").append(esc(doc.getAlgorithmCode()))
                .append(" - ").append(esc(doc.getAlgorithmDescription())).append("</h1>\n\n");

        sb.append("<ul style=\"font-size:8pt\">\n");
        sb.append("  <li><a href=\"#overview\">Общие сведения</a></li>\n");
        sb.append("  <li><a href=\"#algorithm\">Описание алгоритма</a></li>\n");
        sb.append("</ul>\n\n");

        sb.append("<h2 id=\"overview\">Общие сведения</h2>\n");
        sb.append("<table>\n");
        String algValue = esc(doc.getAlgorithmCode() + " - " + doc.getAlgorithmDescription());
        if (doc.getAlgorithmLink() != null && !doc.getAlgorithmLink().isBlank()) {
            algValue = "<a href=\"" + esc(doc.getAlgorithmLink()) + "\">" + algValue + "</a>";
        }
        appendRow(sb, "Наименование алгоритма", algValue);
        appendRow(sb, "Наименование метода", esc(doc.getMethodName()));
        appendRow(sb, "Входные параметры", esc(doc.getInputParamsDescription()));
        appendRow(sb, "Выходные параметры", esc(doc.getOutputParamsDescription()));
        appendRow(sb, "Ожидаемый результат", esc(doc.getExpectedResult()));
        sb.append("</table>\n\n");

        sb.append("<h2 id=\"algorithm\">Описание алгоритма</h2>\n");
        sb.append("<table>\n");
        sb.append("  <tr><th style=\"width:5%\">№</th><th>Действие</th><th>АС</th></tr>\n");
        for (AlgorithmStep step : doc.getSteps()) {
            String number = step.getNumber();
            boolean isScenarioHeader = number != null && (number.startsWith("ОС") || number.startsWith("АС"));
            sb.append("  <tr>\n");
            if (isScenarioHeader) {
                sb.append("    <td style=\"text-align:center;font-weight:bold\">").append(esc(number)).append("</td>\n");
                sb.append("    <td colspan=\"2\" style=\"font-weight:bold\">").append(esc(step.getAction())).append("</td>\n");
            } else {
                sb.append("    <td style=\"text-align:center\">").append(esc(number)).append("</td>\n");
                sb.append("    <td>").append(esc(step.getAction())).append("</td>\n");
                String asVal = step.getAs() != null ? step.getAs() : "\u2014";
                sb.append("    <td style=\"text-align:center\">").append(esc(asVal)).append("</td>\n");
            }
            sb.append("  </tr>\n");
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
