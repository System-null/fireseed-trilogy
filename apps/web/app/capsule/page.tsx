'use client';

import { useEffect, useMemo, useState } from 'react';
import Ajv, { type ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import { CID } from 'multiformats/cid';
import { sha256 } from 'multiformats/hashes/sha2';
import * as dagCbor from '@ipld/dag-cbor';

import capsuleSchema from '../../../../schemas/capsule_v0.2.9.json';

type CapsuleRecord = Record<string, unknown>;

function formatAjvErrors(errors: ErrorObject[] | null | undefined): string[] {
  if (!errors || errors.length === 0) {
    return [];
  }
  return errors.map((error) => {
    const path = error.instancePath ? error.instancePath.replace(/^\//, '').replace(/\//g, '.') : '(root)';
    return `${path}: ${error.message ?? 'validation error'}`;
  });
}

async function computeCid(data: CapsuleRecord) {
  const bytes = dagCbor.encode(data);
  const hash = await sha256.digest(bytes);
  return CID.createV1(dagCbor.code, hash).toString();
}

export default function CapsulePage() {
  const [rawInput, setRawInput] = useState('');
  const [parsed, setParsed] = useState<CapsuleRecord | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [cid, setCid] = useState<string | null>(null);
  const [cidError, setCidError] = useState<string | null>(null);

  const validate = useMemo(() => {
    const ajv = new Ajv({ allErrors: true, strict: false, allowUnionTypes: true });
    addFormats(ajv);
    return ajv.compile<CapsuleRecord>(capsuleSchema as object);
  }, []);

  useEffect(() => {
    if (!rawInput.trim()) {
      setParsed(null);
      setJsonError(null);
      setValidationErrors([]);
      setCid(null);
      setCidError(null);
      return;
    }

    try {
      const nextParsed = JSON.parse(rawInput) as CapsuleRecord;
      if (typeof nextParsed !== 'object' || nextParsed === null || Array.isArray(nextParsed)) {
        throw new Error('Capsule must be a JSON object');
      }
      setParsed(nextParsed);
      setJsonError(null);
    } catch (error) {
      setParsed(null);
      setJsonError(error instanceof Error ? error.message : 'Invalid JSON');
      setCid(null);
      setCidError(null);
    }
  }, [rawInput]);

  useEffect(() => {
    if (!parsed) {
      setValidationErrors([]);
      return;
    }

    const isValid = validate(parsed);
    setValidationErrors(isValid ? [] : formatAjvErrors(validate.errors));
  }, [parsed, validate]);

  useEffect(() => {
    let cancelled = false;

    if (!parsed) {
      setCid(null);
      setCidError(null);
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        const computed = await computeCid(parsed);
        if (!cancelled) {
          setCid(computed);
          setCidError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setCid(null);
          setCidError(error instanceof Error ? error.message : 'CID computation failed');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [parsed]);

  const isValid = !jsonError && validationErrors.length === 0;

  return (
    <main style={{ padding: '2rem 0' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Capsule Workspace</h1>
      <p style={{ marginBottom: '1.5rem', color: '#4b5563' }}>
        Paste or draft a Fireseed capsule. The editor validates against <code>capsule_v0.2.9</code> and
        surfaces signing helpers.
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
          gap: '1.5rem',
          alignItems: 'start'
        }}
      >
        <section>
          <label htmlFor="capsule-json" style={{ display: 'block', fontWeight: 600, marginBottom: '0.75rem' }}>
            Capsule JSON
          </label>
          <textarea
            id="capsule-json"
            value={rawInput}
            onChange={(event) => setRawInput(event.target.value)}
            placeholder='{
  "capsule_id": "fireseed_example_001",
  "version": "capsule_v0",
  "payload": {}
}'
            style={{
              width: '100%',
              minHeight: '24rem',
              fontFamily: 'ui-monospace, SFMono-Regular, SFMono, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace',
              fontSize: '0.95rem',
              lineHeight: 1.55,
              padding: '1rem',
              borderRadius: '0.75rem',
              border: `2px solid ${isValid ? '#22c55e' : '#ef4444'}`,
              backgroundColor: isValid ? '#f1fdf5' : '#fff5f5',
              transition: 'border-color 0.2s ease, background-color 0.2s ease',
              resize: 'vertical'
            }}
          />
          <div style={{ marginTop: '1rem', color: '#dc2626', minHeight: '1.5rem' }}>
            {jsonError && <p>JSON 解析失败：{jsonError}</p>}
            {!jsonError && validationErrors.length > 0 && (
              <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                {validationErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            )}
            {!jsonError && validationErrors.length === 0 && rawInput.trim() && (
              <p style={{ color: '#16a34a' }}>AJV 校验通过。</p>
            )}
          </div>
        </section>

        <section
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            backgroundColor: '#f9fafb'
          }}
        >
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Artifacts</h2>
          <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.75rem 1rem', marginBottom: '1.5rem' }}>
            <dt style={{ fontWeight: 600 }}>CID</dt>
            <dd style={{ margin: 0, wordBreak: 'break-all' }}>
              {cid ? (
                <code>{cid}</code>
              ) : cidError ? (
                <span style={{ color: '#dc2626' }}>{cidError}</span>
              ) : (
                <span style={{ color: '#6b7280' }}>粘贴有效 JSON 以计算 CID。</span>
              )}
            </dd>
            <dt style={{ fontWeight: 600 }}>签名</dt>
            <dd style={{ margin: 0, wordBreak: 'break-all' }}>
              {parsed?.signature ? <code>{String(parsed.signature)}</code> : <span style={{ color: '#6b7280' }}>缺少 signature 字段。</span>}
            </dd>
            <dt style={{ fontWeight: 600 }}>Capsule ID</dt>
            <dd style={{ margin: 0, wordBreak: 'break-word' }}>
              {parsed?.capsule_id ? <code>{String(parsed.capsule_id)}</code> : <span style={{ color: '#6b7280' }}>尚未提供。</span>}
            </dd>
          </dl>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem' }}>命令提示</h3>
          <ol style={{ paddingLeft: '1.25rem', color: '#374151', lineHeight: 1.6 }}>
            <li>
              <code>node scripts/sign-capsule.mjs &lt;capsule.json&gt; --privkey-file ~/.fireseed/key</code>
            </li>
            <li>
              <code>node scripts/build-car.mjs &lt;capsule.json&gt;</code>
            </li>
            <li>
              <code>ipfs dag import capsule.car</code>
            </li>
            <li>
              <code>npm run dev --workspace @fireseed/web</code>
            </li>
          </ol>
          {parsed && (
            <details style={{ marginTop: '1.5rem' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600 }}>结构预览</summary>
              <pre
                style={{
                  marginTop: '1rem',
                  maxHeight: '18rem',
                  overflow: 'auto',
                  background: '#111827',
                  color: '#f9fafb',
                  padding: '1rem',
                  borderRadius: '0.75rem'
                }}
              >
                {JSON.stringify(parsed, null, 2)}
              </pre>
            </details>
          )}
        </section>
      </div>
    </main>
  );
}
