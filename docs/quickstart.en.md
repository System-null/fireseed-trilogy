# Quickstart (10 minutes)

> Create a minimal **capsule_v0.yml**, sign it, and archive it.

1. **Clone**
```bash
git clone https://github.com/System-null/fireseed-trilogy.git
cd fireseed-trilogy
```

2. **Copy a template**
```bash
cp -r templates/minimal ./my-capsule
```

3. **Edit three fields** in `my-capsule/principles.yml`:
```yaml
owner: "<your_name>"
public_key_fingerprint: "<GPG fingerprint or DID>"
ethics: "Do no harm. Respect consent. Reversible by design."
```

4. **(Optional) Validate** against schema
```bash
# use any JSON Schema validator with schemas/fireseed_capsule.schema.json
```

5. **Sign & archive**
```bash
gpg --detach-sign -a my-capsule/principles.yml
zip -r capsule_v0.zip my-capsule/
```
