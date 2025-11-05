# 旧文件回填（不改核心 JS 的接入方式）
在 `public/generator.html` 中，找到：
```html
<script src="./scripts/generator.js"></script>
```
在其后追加一行：
```html
<script src="./scripts/import-old-file.js"></script>
```
保存后刷新页面，即可在按钮区看到「上传旧文件并回填」。