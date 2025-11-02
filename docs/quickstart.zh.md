# 快速上手（10 分钟）

> 生成最小 **capsule_v0.yml**，签名并归档。

1. **克隆仓库**
```bash
git clone https://github.com/System-null/fireseed-trilogy.git
cd fireseed-trilogy
```

2. **拷贝模板**
```bash
cp -r templates/minimal ./my-capsule
```

3. **仅改三行**（`my-capsule/principles.yml`）
```yaml
owner: "<你的名字>"
public_key_fingerprint: "<GPG 指纹或 DID>"
ethics: "不伤害、尊重同意、可撤销。"
```

4. **（可选）校验 schema**
```bash
# 使用任意 JSON Schema 工具对 schemas/fireseed_capsule.schema.json 进行校验
```

5. **签名与打包**
```bash
gpg --detach-sign -a my-capsule/principles.yml
zip -r capsule_v0.zip my-capsule/
```
