import type { DiagnosticReport, DiagnosticItem, PdfFontInfo, RiskLevel } from '../analyzer/types';

const RISK_LABELS: Record<RiskLevel, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

const RISK_EMOJI: Record<RiskLevel, string> = {
  high: '\u{1F6A8}',
  medium: '\u26A0\uFE0F',
  low: '\u2705\uFE0F',
};

export function renderReport(
  container: HTMLElement,
  report: DiagnosticReport,
): void {
  container.innerHTML = '';

  const header = document.createElement('h2');
  header.textContent = `診断結果: ${report.fileName} (${report.pageCount} ページ)`;
  container.appendChild(header);

  if (report.items.length === 0) {
    const noIssues = document.createElement('p');
    noIssues.textContent = '検出された問題はありません';
    container.appendChild(noIssues);
  } else {
    const summary = document.createElement('p');
    summary.textContent = `${report.items.length} 件の指摘があります`;
    container.appendChild(summary);

    const grouped = groupByRisk(report.items);
    for (const level of ['high', 'medium', 'low'] as RiskLevel[]) {
      const items = grouped.get(level);
      if (!items || items.length === 0) continue;
      container.appendChild(renderRiskSection(level, items));
    }
  }

  container.appendChild(renderFontTable(report.fonts));
}

function groupByRisk(items: DiagnosticItem[]): Map<RiskLevel, DiagnosticItem[]> {
  const map = new Map<RiskLevel, DiagnosticItem[]>();
  for (const item of items) {
    if (!map.has(item.riskLevel)) map.set(item.riskLevel, []);
    map.get(item.riskLevel)!.push(item);
  }
  return map;
}

function renderRiskSection(level: RiskLevel, items: DiagnosticItem[]): HTMLElement {
  const section = document.createElement('details');
  section.open = true;
  section.className = `risk-${level}`;

  const summaryEl = document.createElement('summary');
  summaryEl.textContent = `リスク: ${RISK_LABELS[level]} (${items.length} 件)`;
  section.appendChild(summaryEl);

  for (const item of items) {
    section.appendChild(renderItem(item));
  }

  return section;
}

function renderItem(item: DiagnosticItem): HTMLElement {
  const article = document.createElement('article');

  const heading = document.createElement('h4');
  heading.textContent = `${RISK_EMOJI[item.riskLevel]} [パターン ${item.patternId}] ${item.message}`;
  article.appendChild(heading);

  const pages = document.createElement('p');
  const pagesSmall = document.createElement('small');
  pagesSmall.textContent = `📗 ページ: ${item.pageNumbers.join(', ')}`;
  pages.appendChild(pagesSmall);
  article.appendChild(pages);

  const remedy = document.createElement('p');
  const remedyEm = document.createElement('em');
  remedyEm.textContent = item.remedy;
  remedy.appendChild(remedyEm);
  article.appendChild(remedy);

  if (item.details) {
    const detailsEl = renderDetails(item.details);
    if (detailsEl) article.appendChild(detailsEl);
  }

  return article;
}

function renderDetails(details: Record<string, unknown>): HTMLElement | null {
  const examples = details.examples;
  if (!Array.isArray(examples) || examples.length === 0) return null;

  const list = document.createElement('ul');
  for (const example of examples) {
    const li = document.createElement('li');
    const code = document.createElement('code');
    code.textContent = String(example);
    li.appendChild(code);
    list.appendChild(li);
  }
  return list;
}

function renderFontTable(fonts: PdfFontInfo[]): HTMLElement {
  const section = document.createElement('section');

  const heading = document.createElement('h3');
  heading.textContent = 'フォント一覧';
  section.appendChild(heading);

  const table = document.createElement('table');

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  for (const label of ['フォント名', '種別', '埋め込み', 'ToUnicode', 'ページ']) {
    const th = document.createElement('th');
    th.textContent = label;
    headerRow.appendChild(th);
  }
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const font of fonts) {
    const tr = document.createElement('tr');

    const tdName = document.createElement('td');
    tdName.textContent = font.name;
    tr.appendChild(tdName);

    const tdType = document.createElement('td');
    tdType.textContent = `${font.type ?? '-'} / ${font.subtype ?? '-'}`;
    tr.appendChild(tdType);

    const tdEmbed = document.createElement('td');
    tdEmbed.textContent = font.missingFile ? 'なし' : 'あり';
    tr.appendChild(tdEmbed);

    const tdToUnicode = document.createElement('td');
    tdToUnicode.textContent = font.toUnicode ? 'あり' : 'なし';
    tr.appendChild(tdToUnicode);

    const tdPages = document.createElement('td');
    tdPages.textContent = Array.from(font.pageNumbers).sort((a, b) => a - b).join(', ');
    tr.appendChild(tdPages);

    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  section.appendChild(table);

  return section;
}
