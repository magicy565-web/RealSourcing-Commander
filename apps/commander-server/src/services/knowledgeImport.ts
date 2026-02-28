/**
 * 行业知识库批量导入服务 (Phase 3 Sprint 3.2)
 *
 * 支持格式：
 *   - Excel (.xlsx, .xls)：每行一条知识点，列顺序：industry | category | key | value
 *   - Word (.docx)：解析段落，格式为 "key: value"，通过文档名/首行推断 industry/category
 *
 * Excel 模板规范（第一行为表头，从第二行开始）：
 *   | industry | category | key | value |
 *   | furniture | price_range | 实木餐桌 | FOB $80-$150/套 |
 *
 * Word 规范：
 *   文档标题（第一段）格式：[industry] [category]
 *   后续段落格式：key: value
 *   示例：
 *     furniture price_range
 *     实木餐桌: FOB $80-$150/套
 *     实木椅子: FOB $15-$30/把
 */
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';

export interface KnowledgeRecord {
  industry: string;
  category: string;
  key: string;
  value: string;
}

export interface ImportResult {
  total: number;
  imported: number;
  skipped: number;
  errors: string[];
  records: KnowledgeRecord[];
}

const VALID_INDUSTRIES = ['furniture', 'textile', 'electronics', 'lighting', 'other'];
const VALID_CATEGORIES = ['price_range', 'term', 'template', 'cert', 'other'];

function normalizeIndustry(v: string): string {
  const lower = (v || '').toLowerCase().trim();
  if (lower.includes('furniture') || lower.includes('家具')) return 'furniture';
  if (lower.includes('textile') || lower.includes('纺织') || lower.includes('面料')) return 'textile';
  if (lower.includes('electronics') || lower.includes('电子')) return 'electronics';
  if (lower.includes('lighting') || lower.includes('照明') || lower.includes('led')) return 'lighting';
  return 'other';
}

function normalizeCategory(v: string): string {
  const lower = (v || '').toLowerCase().trim();
  if (lower.includes('price') || lower.includes('价格') || lower.includes('报价')) return 'price_range';
  if (lower.includes('term') || lower.includes('术语') || lower.includes('条款')) return 'term';
  if (lower.includes('template') || lower.includes('模板')) return 'template';
  if (lower.includes('cert') || lower.includes('认证') || lower.includes('证书')) return 'cert';
  return 'other';
}

/**
 * 解析 Excel 文件（Buffer）
 */
export function parseExcel(buffer: Buffer): ImportResult {
  const result: ImportResult = { total: 0, imported: 0, skipped: 0, errors: [], records: [] };

  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      result.errors.push('Excel 文件为空或无工作表');
      return result;
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<any>(sheet, { header: 1, defval: '' });

    if (rows.length < 2) {
      result.errors.push('Excel 文件无数据行（至少需要表头行 + 1 条数据）');
      return result;
    }

    // 检测表头行（第一行）
    const header = (rows[0] as any[]).map((h: any) => String(h).toLowerCase().trim());
    const colMap = {
      industry: header.findIndex((h) => h.includes('industry') || h.includes('行业')),
      category: header.findIndex((h) => h.includes('category') || h.includes('分类') || h.includes('类别')),
      key: header.findIndex((h) => h === 'key' || h.includes('名称') || h.includes('关键词')),
      value: header.findIndex((h) => h === 'value' || h.includes('内容') || h.includes('值')),
    };

    // 若找不到表头，按位置推断（industry=0, category=1, key=2, value=3）
    if (colMap.industry === -1) colMap.industry = 0;
    if (colMap.category === -1) colMap.category = 1;
    if (colMap.key === -1) colMap.key = 2;
    if (colMap.value === -1) colMap.value = 3;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] as any[];
      result.total++;

      const industry = normalizeIndustry(String(row[colMap.industry] ?? ''));
      const category = normalizeCategory(String(row[colMap.category] ?? ''));
      const key = String(row[colMap.key] ?? '').trim();
      const value = String(row[colMap.value] ?? '').trim();

      if (!key || !value) {
        result.skipped++;
        result.errors.push(`第 ${i + 1} 行：key 或 value 为空，已跳过`);
        continue;
      }

      result.records.push({ industry, category, key, value });
      result.imported++;
    }
  } catch (err: any) {
    result.errors.push(`Excel 解析失败: ${err?.message || String(err)}`);
  }

  return result;
}

/**
 * 解析 Word 文件（Buffer）
 * 格式：第一段为 "[industry] [category]"，后续段落为 "key: value"
 */
export async function parseWord(buffer: Buffer): Promise<ImportResult> {
  const result: ImportResult = { total: 0, imported: 0, skipped: 0, errors: [], records: [] };

  try {
    const { value: text } = await mammoth.extractRawText({ buffer });
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

    if (lines.length === 0) {
      result.errors.push('Word 文档为空');
      return result;
    }

    // 第一行推断 industry 和 category
    let defaultIndustry = 'other';
    let defaultCategory = 'other';
    let startLine = 0;

    const firstLine = lines[0].toLowerCase();
    if (firstLine.includes(' ') && !firstLine.includes(':')) {
      const parts = lines[0].split(/\s+/);
      defaultIndustry = normalizeIndustry(parts[0]);
      defaultCategory = normalizeCategory(parts.slice(1).join(' '));
      startLine = 1;
    }

    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i];
      result.total++;

      // 支持 "key: value" 或 "key：value"（中文冒号）
      const colonIdx = line.indexOf(':') !== -1 ? line.indexOf(':') : line.indexOf('：');
      if (colonIdx === -1) {
        // 尝试作为新的 industry/category 声明行
        if (!line.includes(':') && !line.includes('：') && line.includes(' ')) {
          const parts = line.split(/\s+/);
          const newIndustry = normalizeIndustry(parts[0]);
          const newCategory = normalizeCategory(parts.slice(1).join(' '));
          if (newIndustry !== 'other' || newCategory !== 'other') {
            defaultIndustry = newIndustry;
            defaultCategory = newCategory;
            result.total--;
            continue;
          }
        }
        result.skipped++;
        result.errors.push(`第 ${i + 1} 行：格式不符（需要 "key: value"），已跳过`);
        continue;
      }

      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim();

      if (!key || !value) {
        result.skipped++;
        result.errors.push(`第 ${i + 1} 行：key 或 value 为空，已跳过`);
        continue;
      }

      result.records.push({
        industry: defaultIndustry,
        category: defaultCategory,
        key,
        value,
      });
      result.imported++;
    }
  } catch (err: any) {
    result.errors.push(`Word 解析失败: ${err?.message || String(err)}`);
  }

  return result;
}
