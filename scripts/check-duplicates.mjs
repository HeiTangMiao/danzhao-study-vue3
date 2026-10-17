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
 *   node scripts/check-duplicates.mjs            # 自检 + 全量检查
 *   node scripts/check-duplicates.mjs --quiet    # 只打印汇总
 *   node scripts/check-duplicates.mjs --l3-only  # 只看疑似
 *   node scripts/check-duplicates.mjs --selftest # 只跑自检（证明判据真的会触发）
 *
 * 退出码：L1 或 L2 有命中 → 1（便于 CI 卡口）；否则 0
 *
 * 依赖：需先跑 `npm run build:practice` 生成题库产物
 *
 * 为什么必须有 --selftest：2026-10-17 评估实证，把 L1 分组键误加一个唯一字段后，
 * 查重器**事实失效**（永远 0 命中），但退出码仍是 0、CI 全绿——「0 命中」与
 * 「检测器坏了」在日志里完全无法区分。自检用人造样本证明三档判据都能触发。
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

/**
 * 对单科条目跑三档检测（纯函数，供主流程与 --selftest 共用）
 * @param {Array<object>} items 题库条目（紧凑键 q/o/ci/fk/k）
 * @returns {Array<{level:'L1'|'L2'|'L3', verdict:string, items:Array, stem:string}>}
 */
function detect(items) {
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
  }

  return report;
}

const fmt = (items) => items.map((x) => `${x.k}@${x.fk}`).join("  ||  ");

// ════════════════════════════════════════════════════════════════
// --selftest：用人造样本证明三档判据都能触发（防「检测器坏了却 0 命中」）
// ════════════════════════════════════════════════════════════════
function selftest() {
  const mk = (k, fk, q, o, ci) => ({ k, fk, q, o, ci });
  const cases = [
    {
      name: "L1 同文件重复（最严重）",
      items: [
        mk("a/0/0/0", "fileA", "下列正确的是？", ["对", "错"], 0),
        mk("a/0/0/1", "fileA", "下列正确的是？", ["对", "错"], 0),
      ],
      expectLevel: "L1",
      expectVerdict: "同文件重复（严重）",
    },
    {
      name: "L1 跨文件重复",
      items: [
        mk("a/0/0/0", "fileA", "1+1 等于几？", ["1", "2"], 1),
        mk("a/0/0/1", "fileB", "1+1 等于几？", ["1", "2"], 1),
      ],
      expectLevel: "L1",
      expectVerdict: "跨文件重复",
    },
    {
      name: "L2 跨文件·只换干扰项（正确项文本不变）",
      items: [
        mk("a/0/0/0", "fileA", "中国的首都？", ["北京", "上海"], 0),
        mk("a/0/0/1", "fileB", "中国的首都？", ["北京", "广州"], 0),
      ],
      expectLevel: "L2",
      expectVerdict: "跨文件重复（题干同、正确项同，干扰项被换过）",
    },
    {
      name: "反向锚：无重复的干净样本不得误报",
      items: [
        mk("a/0/0/0", "fileA", "下列正确的是？", ["对", "错"], 0),
        mk("a/0/0/1", "fileB", "另一道完全不同的题", ["甲", "乙"], 1),
      ],
      expectLevel: null,
    },
  ];

  let failed = 0;
  for (const c of cases) {
    const report = detect(c.items);
    if (c.expectLevel === null) {
      if (report.length !== 0) {
        console.error(`✗ ${c.name}：期望 0 命中，实际 ${report.length} 组 → ${fmt(report.flatMap((r) => r.items))}`);
        failed++;
      } else {
        console.log(`✓ ${c.name}`);
      }
      continue;
    }
    const hit = report.find((r) => r.level === c.expectLevel && r.verdict === c.expectVerdict);
    if (!hit) {
      console.error(`✗ ${c.name}：期望命中 ${c.expectLevel}「${c.expectVerdict}」，实际 ${report.length} 组`);
      for (const r of report) console.error(`    实得 [${r.level}] ${r.verdict}`);
      failed++;
    } else {
      console.log(`✓ ${c.name} → [${hit.level}] ${hit.verdict}`);
    }
  }

  if (failed > 0) {
    console.error(`\n✗ 自检失败（${failed} 项）——查重判据可能已失效，「0 命中」不再可信！`);
    process.exit(1);
  }
  console.log("\n✓ 自检通过：L1 同文件 / L1 跨文件 / L2 换干扰项均能触发，干净样本不误报。");
  console.log("  （若哪天分组键被改坏，这里会先红，而不是让 CI 拿着「0 命中」放行）");
}

if (process.argv.includes("--selftest")) {
  selftest();
  process.exit(0);
}

const load = (subject) => JSON.parse(readFileSync(join(BANK_DIR, `${subject}.json`), "utf8"));

const quiet = process.argv.includes("--quiet");
const l3only = process.argv.includes("--l3-only");

let hardHits = 0; // L1 + L2
let fuzzyHits = 0; // L3

for (const subject of SUBJECTS) {
  const items = load(subject);
  const report = detect(items);

  hardHits += report.filter((r) => r.level !== "L3").length;
  fuzzyHits += report.filter((r) => r.level === "L3").length;

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
