/**
 * content-schema 的浏览器侧加载入口
 *
 * 说明：schema 是区块类型与字段的唯一真相源。浏览器侧走 Vite 的 JSON 导入
 *      （构建时内联，不产生额外请求，也不进主包 —— 只有 /editor 这个懒加载路由会用到）。
 *      Node 侧（scripts/validate-content.mjs）跑在裸 Node 下、没有打包器，
 *      用 fs 读同一份文件。
 *
 *      两端的「加载方式」天生不同、无法共用（Node 不能直接 import 无 import-attribute 的 JSON），
 *      但「怎么用这份 schema」的逻辑全部收敛在 src/utils/validateBlock.js 与
 *      src/views/editor/schemaForm.js 两个纯函数模块里，都接收 schema 作参数。
 *      所以这里只负责把同一个文件喂进去，不存在两份规则。
 */
import schema from '../../schema/content-schema.json'

export default schema
