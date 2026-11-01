<script setup>
/**
 * 背诵正文渲染：把「汉字（pīn yīn）」逐字展开成 `<ruby>`，对不齐的原样保留括号。
 *
 * ★ 为什么在组件里解析、而不是在数据侧拼好 HTML：
 *   ① 内容永远走文本绑定，不引入 `v-html`（多一条注入面）；
 *   ② 排版归 CSS，解析归 `reciteRuby.parseAnnotatedText`（纯函数、可单测）。
 *
 * ★ 逐字 ruby 的排版代价：`<rt>` 会把每个字的行高撑起来，且拼音长的字横向更宽
 *   （浏览器原生行为，无法完全消除）。所以这里只用 `ruby-align: center` 居中，
 *   并把段落 `line-height` 放宽到 2.6 —— 宁可松一点，也不要拼音压住下一行。
 */
import { computed } from 'vue'
import { parseAnnotatedText } from '@/utils/reciteRuby'

const props = defineProps({
  /** 正文段落（产物 `piece.paragraphs`，注音以内联括号形式存在） */
  paragraphs: { type: Array, default: () => [] }
})

/** 每段解析成 token 数组；段落数很少，一次 computed 足够 */
const blocks = computed(() =>
  (Array.isArray(props.paragraphs) ? props.paragraphs : []).map((p) => parseAnnotatedText(p))
)
</script>

<template>
  <article class="rp-passage">
    <p v-for="(tokens, i) in blocks" :key="i" class="rp-passage__para">
      <template v-for="(t, j) in tokens" :key="j">
        <template v-if="t.type === 'ruby'">
          <ruby v-for="(c, k) in t.chars" :key="k" class="rp-ruby">{{ c.char }}<rt>{{ c.pinyin }}</rt></ruby>
        </template>
        <span v-else>{{ t.text }}</span>
      </template>
    </p>
  </article>
</template>

<style scoped>
.rp-passage {
  padding: 14px 16px;
  background: var(--surface, #fff);
  border-radius: 12px;
}

.rp-passage__para {
  margin: 0 0 12px;
  font-size: 17px;
  /* 给 <rt> 留出上方空间：太紧会让拼音压住上一行 */
  line-height: 2.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.rp-passage__para:last-child {
  margin-bottom: 0;
}

.rp-ruby {
  ruby-align: center;
  /* 逐字 ruby 之间留一丝缝，避免连读时拼音粘连 */
  margin: 0 1px;
}

.rp-ruby rt {
  font-size: 0.52em;
  font-weight: 400;
  letter-spacing: 0;
  color: var(--text-secondary, #7a7a7a);
  user-select: none;
}
</style>
