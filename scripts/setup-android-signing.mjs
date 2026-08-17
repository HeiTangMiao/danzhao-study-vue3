/**
 * Android 签名配置脚本（CI 使用）
 * 职责：
 *  - 若配置了 ANDROID_KEYSTORE_BASE64 等 Secrets，则解码使用正式 keystore
 *  - 否则自动生成一个临时 keystore（便于安装测试）
 *  - 创建 keystore.properties
 *  - 向 app/build.gradle.kts 注入 release 签名配置
 * 用法：node scripts/setup-android-signing.mjs
 */
import { execSync } from 'node:child_process'
import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const genDir = join(process.cwd(), 'src-tauri', 'gen', 'android')
const appDir = join(genDir, 'app')
const gradlePath = join(appDir, 'build.gradle.kts')
const keystorePath = join(genDir, 'danzhao-release.keystore')

if (!existsSync(gradlePath)) {
  console.error('[signing] 未找到 app/build.gradle.kts，请先执行 tauri android init')
  process.exit(1)
}

// 1. 准备 keystore：优先使用 Secrets 提供的正式 keystore，否则自动生成
const base64 = process.env.ANDROID_KEYSTORE_BASE64
const password = process.env.ANDROID_KEYSTORE_PASSWORD || 'danzhao-release'
const alias = process.env.ANDROID_KEY_ALIAS || 'danzhao'

if (base64) {
  writeFileSync(keystorePath, Buffer.from(base64, 'base64'))
  console.log('[signing] 使用 Secrets 提供的正式 keystore')
} else {
  if (!existsSync(keystorePath)) {
    execSync(
      `keytool -genkey -v -keystore "${keystorePath}" -storetype JKS -keyalg RSA ` +
        `-keysize 2048 -validity 10000 -alias "${alias}" -storepass "${password}" ` +
        `-keypass "${password}" -dname "CN=Danzhao Study, OU=Dev, O=Danzhao, L=Hangzhou, S=Zhejiang, C=CN"`,
      { stdio: 'inherit' }
    )
  }
  console.log('[signing] 已生成临时 keystore（未配置 Secrets 时使用）')
}

// 2. 创建 keystore.properties
writeFileSync(
  join(genDir, 'keystore.properties'),
  `password=${password}\nkeyAlias=${alias}\nstoreFile=${keystorePath}\n`
)

// 3. 向 build.gradle.kts 注入签名配置（幂等）
let content = readFileSync(gradlePath, 'utf8')

if (!content.includes('java.io.FileInputStream')) {
  content = content.replace(
    'import java.util.Properties',
    'import java.util.Properties\nimport java.io.FileInputStream'
  )
}

if (!content.includes('create("release")')) {
  content = content.replace(
    '    buildTypes {',
    `    signingConfigs {
        create("release") {
            val keystorePropertiesFile = rootProject.file("keystore.properties")
            val keystoreProperties = Properties()
            if (keystorePropertiesFile.exists()) {
                keystoreProperties.load(FileInputStream(keystorePropertiesFile))
            }
            keyAlias = keystoreProperties["keyAlias"] as String
            keyPassword = keystoreProperties["password"] as String
            storeFile = file(keystoreProperties["storeFile"] as String)
            storePassword = keystoreProperties["password"] as String
        }
    }
    buildTypes {`
  )
}

if (!content.includes('signingConfig = signingConfigs.getByName("release")')) {
  content = content.replace(
    '        getByName("release") {',
    '        getByName("release") {\n            signingConfig = signingConfigs.getByName("release")'
  )
}

writeFileSync(gradlePath, content)
console.log('[signing] 签名配置注入完成')
