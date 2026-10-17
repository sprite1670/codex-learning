# 家务抽签 Android 版

Android 8.0（API 26）及以上。应用名称：家务抽签；包名：`com.sprite1670.householdlottery`。

这是离线个人使用版，内置游戏页面，使用手机的 Android System WebView 显示。无需联网，不申请网络、照片、存储、联系人等权限。名字和抽签记录保存在应用自身的数据中；关闭再打开可恢复，卸载或清除应用数据会清空记录。

## 使用

将 `downloads/household-lottery-1.0.apk` 传到安卓手机，用文件管理器打开。系统提示时，只给打开该 APK 的应用授予“允许安装此来源的应用”。安装后打开“家务抽签”，选择 1～5 人，依次输入名字并抽签。点击后会播放 5 秒动画，五种结果轮番出现，随后揭晓结果。动画期间按钮锁定，不能重复抽签或重开；结束后交给下一位输入。中途重启会恢复已经抽中的结果和剩余动画时间。

抽签结果固定为刷碗、扫地、沏茶、做饭、玩。人数少于 5 时，会留下未抽中的结果。同名不能重复参加，实际参与者需要遵守每人使用一个固定名字的规则。

## 构建

构建工具：Python 3、Java JDK 17 或以上、Android SDK Platform 35、Build Tools 35.0.0。没有第三方应用依赖，也无需 Gradle。构建脚本同时支持标准 SDK 安装目录和 Google 独立压缩包的解压目录。

本次使用的 Google 官方 SDK 文件（已核对官方仓库 XML 中的 SHA-1 校验值）：

| 文件 | 官方地址 | SHA-1 |
| --- | --- | --- |
| Build Tools 35 Linux | https://dl.google.com/android/repository/build-tools_r35_linux.zip | `2cfaa0bbb2336e9ec18ed3ecea84fa2e2af607bc` |
| Android Platform 35 | https://dl.google.com/android/repository/platform-35_r02.zip | `0bb560a90a7a2cbd0dd8348224d518b638fe7949` |

从仓库根目录运行：

```sh
python3 android/build.py \
  --sdk-root /workspace/android-tools/sdk \
  --keystore /workspace/android-signing/household-debug.p12
```

脚本生成 `dist/household-lottery-1.0.apk` 与对应 SHA-256 校验文件，并检查 APK 签名和对齐。私钥放在仓库外；这份 APK 使用个人测试用签名，不是应用商店发行版本。后续覆盖安装需要保留同一个签名密钥。

网页源文件位于 `app/src/main/assets/index.html`，Android 入口位于 `app/src/main/java/com/sprite1670/householdlottery/MainActivity.java`。打包后的网页可提取出来，用现有浏览器测试工具验证抽签行为；Android 真机上的安装、键盘、系统弹窗和数据恢复仍需设备验证。

## 已执行验证

在安装了 Playwright 和 Chromium 的开发环境中运行 `node android/tests/game.cjs`。可以通过 `CHROMIUM_PATH` 指定浏览器路径，通过 `GAME_HTML` 指定从 APK 提取的游戏页面。

本次对 APK 中实际打包的页面进行了浏览器验证：5 秒轮播包含所有五个结果、结束前不展示分工、动画期间刷新保持原抽签结果、动画期间禁止重复提交和重开、重复姓名拦截、五人结果互不重复、单人局、重开确认、手机宽度显示。另用真实浏览器计时检查了 5 秒后才揭晓。APK 的 v2/v3 签名及 ZIP 对齐检查通过，清单中没有权限请求。
