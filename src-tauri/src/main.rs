// 防止在 release 模式下终端窗口出现
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    danzhao_study_vue3_lib::run()
}
