#!/usr/bin/env node
/**
 * 题库实质重复检测（内容侧交付给功能侧，建议固化进 validate:content）
 *
 * 背景：
 *   只按「题干」比对 → 通用题干（如"下列各句中，没有语病的一项是"）会大量误报；
 *   按「题干 + 选项 + 答案全文」比对 → 会漏掉"题干/选项/正确项全同、只有解析不同"的实质重复。
 *   因此这里用三档口径，从严到宽并列输出，由人判断。
 *
 * 口径：
 *   L1 题干 + 选项（有序）              → 同文件内命中判「重复」，跨文件命中判「重复」
 *   L2 题干 + 正确项文本（选项可不同）    → 跨文件命中判「重复」（照抄正课页只换干扰项，就是这一类）
 *   L3 题干主干 + 正确项文本（模糊）      → 只报「疑似」，必须人工确认（题干被微改，如加"Premiere 中"）
 *
 * 用法：
 *   node scripts/check-duplicates.mjs            # 全量检查
 *   node scripts/check-duplicates.mjs --quiet    # 只打印汇总
 *   node scripts/check-duplicates.mjs --l3-only  # 只看疑似
 *
 * 退出码：L1 或 L2 有命中 → 1（便于 CI 卡口）；否则 0
 *
 * 依赖：需先跑 `npm run build:practice` 生成题库产物
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const SUBJECTS = ["math", "chinese", "computer"];
const BANK_DIR = join(process.cwd(), "public", "practice-bank");

/** 归一化：只去掉空白字符，保留 LaTeX 与中英文标点（去掉 LaTeX 会让"解不等式"全撞车） */
const norm = (s) => String(s ?? "").replace(/\s+/g, "");

/** 取正确项文本；无选项（填空/简答）时返回空串，这类题只参与 L1 的题干比对 */
const correctText = (item) => {
  const o = item.o || [];
  const ci = item.ci;
  return typeof ci === "number" && ci >= 0 && ci < o.length ? norm(o[ci]) : "";
};

/** L3：抽题干主干——去掉"下列/下列各句中/下列句子中/下列关于"等套话与纯占位符 */
const fuzzyStem = (q) =>
  norm(q)
    .replace(/^[下列个一句中于关的\s]*(?:下列各?[句项词短语句子中]*[，,]?)?/, "")
    .replace(/[（(]\u3000*[)）]/g, "")
    .replace(/[：:，,。.？?、；;]$/g, "");

const load = (subject) => JSON.parse(readFileSync(join(BANK_DIR, `${subject}.json`), "utf8"));

function group(items, keyFn) {
  const g = new Map();
  for (const it of items) {
    const k = keyFn(it);
    if (!k) continue;
    if (!g.has(k)) g.set(k, []);
    g.get(k).push(it);
  }
  return g;
}

const fmt = (items) =>
  items.map((x) => `${x.k}@${x.fk}`).join("  ||  ");

let hardHits = 0; // L1 + L2
let fuzzyHits = 0; // L3
const quiet = process.argv.includes("--quiet");
const l3only = process.argv.includes("--l3-only");

for (const subject of SUBJECTS) {
  const items = load(subject);
  const report = [];

  // ---- L1：题干 + 选项（有序）----
  for (const [, bucket] of group(items, (it) => `${norm(it.q)}|${(it.o || []).map(norm).join("|")}`)) {
    if (bucket.length < 2) continue;
    const sameFile = new Set(bucket.map((x) => x.fk)).size === 1;
    report.push({
      level: "L1",
      verdict: sameFile ? "同文件重复（严重）" : "跨文件重复",
      items: bucket,
      stem: norm(bucket[0].q),
    });
    hardHits++;
  }

  // ---- L2：题干 + 正确项文本 ----
  for (const [, bucket] of group(items, (it) => `${norm(it.q)}|${correctText(it)}`)) {
    if (bucket.length < 2) continue;
    const crossFile = new Set(bucket.map((x) => x.fk)).size > 1;
    if (!crossFile) continue; // 同文件内题干+正确项相同但选项不同，通常是合法的同类练习
    // 已被 L1 抓到的组合不重复报
    const l1Keys = new Set(
      bucket.map((x) => `${norm(x.q)}|${(x.o || []).map(norm).join("|")}`)
    );
    if (l1Keys.size < bucket.length) continue;
    report.push({
      level: "L2",
      verdict: "跨文件重复（题干同、正确项同，干扰项被换过）",
      items: bucket,
      stem: norm(bucket[0].q),
    });
    hardHits++;
  }

  // ---- L3：题干主干 + 正确项文本（模糊，仅疑似）----
  for (const [, bucket] of group(items, (it) => `${fuzzyStem(it.q)}|${correctText(it)}`)) {
    if (bucket.length < 2) continue;
    const crossFile = new Set(bucket.map((x) => x.fk)).size > 1;
    if (!crossFile) continue;
    const l2Keys = new Set(bucket.map((x) => `${norm(x.q)}|${correctText(x)}`));
    if (l2Keys.size < bucket.length) continue; // 已被 L2 精确命中
    report.push({
      level: "L3",
      verdict: "疑似（题干被微改，需人工确认）",
      items: bucket,
      stem: norm(bucket[0].q),
    });
    fuzzyHits++;
  }

  const shown = l3only ? report.filter((r) => r.level === "L3") : report;
  console.log(`\n===== ${subject}：${items.length} 题 | L1/L2 命中 ${report.filter((r) => r.level !== "L3").length} 组 | L3 疑似 ${report.filter((r) => r.level === "L3").length} 组 =====`);
  if (quiet) continue;
  for (const r of shown) {
    console.log(`  [${r.level}] ${r.verdict}`);
    console.log(`      ${fmt(r.items)}`);
    console.log(`      题干：${r.stem.slice(0, 70)}`);
  }
}

console.log(`\n汇总：L1/L2 命中 ${hardHits} 组（计入退出码）｜L3 疑似 ${fuzzyHits} 组（不卡 CI，需人工确认）`);
if (hardHits > 0) {
  console.log("结论：存在实质重复，建议按「改测验侧副本、正课页保持原样」处理后再重跑。");
  process.exit(1);
}
console.log("结论：未发现 L1/L2 实质重复。");
