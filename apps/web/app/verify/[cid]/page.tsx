import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Buffer } from 'node:buffer';
import { CarReader } from '@ipld/car';
import { CID } from 'multiformats/cid';
import { sha256 } from 'multiformats/hashes/sha2';
import * as dagCbor from '@ipld/dag-cbor';
import canonicalize from 'json-canonicalize';
import * as ed from '@noble/ed25519';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

import capsuleSchema from '../../../../../schemas/capsule_v0.2.9.json';

export const dynamic = 'force-dynamic';

interface VerifyPageProps {
  params: {
    cid: string;
  };
}

interface StepResult {
  name: string;
  status: 'ok' | 'error';
  detail: string;
}

interface VerificationOutcome {
  cid: string;
  rootCid: string | null;
  capsule: Record<string, unknown> | null;
  steps: StepResult[];
}

const ajv = new Ajv({ allErrors: true, strict: false, allowUnionTypes: true });
addFormats(ajv);

// 删除 $schema，避免 Ajv 去寻找 draft 2020-12 的 metaschema
const schemaCopy: any = { ...(capsuleSchema as any) };
if (schemaCopy.$schema) {
  delete schemaCopy.$schema;
}

const validateCapsule = ajv.compile<Record<string, unknown>>(schemaCopy);

async function loadCar(cid: CID) {
  const res = await fetch(`https://w3s.link/ipfs/${cid.toString()}?format=car`, {
    // Revalidate on each request to reflect latest IPFS state
    cache: 'no-store'
  });

  if (!res.ok) {
    throw new Error(`无法获取 CAR：${res.status} ${res.statusText}`);
  }

  const bytes = new Uint8Array(await res.arrayBuffer());
  return CarReader.fromBytes(bytes);
}

async function decodeCapsule(reader: CarReader) {
  const roots = await reader.getRoots();
  if (!roots.length) {
    throw new Error('CAR 不包含根节点');
  }

  const rootCid = roots[0];
  const block = await reader.get(rootCid);
  if (!block) {
    throw new Error(`无法读取根块 ${rootCid}`);
  }

  const capsule = dagCbor.decode(block.bytes);
  if (typeof capsule !== 'object' || capsule === null || Array.isArray(capsule)) {
    throw new Error('根块不是 JSON 对象');
  }

  return { capsule: capsule as Record<string, unknown>, rootCid };
}

async function computeCid(data: Record<string, unknown>) {
  const bytes = dagCbor.encode(data);
  const hash = await sha256.digest(bytes);
  return CID.createV1(dagCbor.code, hash);
}

function decodeBase64(value: unknown, field: string) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${field} 缺失或不是字符串`);
  }

  try {
    return Buffer.from(value, 'base64');
  } catch {
    throw new Error(`${field} 不是有效的 base64 数据`);
  }
}

async function verifySignature(payload: Record<string, unknown>) {
  const signatureBytes = decodeBase64(payload.signature, 'signature');
  const pubkeyBytes = decodeBase64(payload.author_pubkey, 'author_pubkey');
  const payloadCopy = { ...payload };
  delete payloadCopy.signature;
  const canonical = canonicalize(payloadCopy);

  if (typeof canonical !== 'string') {
    throw new Error('canonicalize 失败');
  }

  const message = new TextEncoder().encode(canonical);
  const ok = await ed.verify(signatureBytes, message, pubkeyBytes);
  if (!ok) {
    throw new Error('Ed25519 签名校验失败');
  }
}

async function verifyCapsule(cidParam: string): Promise<VerificationOutcome> {
  let parsedCid: CID;

  try {
    parsedCid = CID.parse(cidParam);
  } catch {
    return {
      cid: cidParam,
      rootCid: null,
      capsule: null,
      steps: [
        {
          name: 'CID 解析',
          status: 'error',
          detail: '提供的 CID 无法解析。'
        }
      ]
    };
  }

  const steps: StepResult[] = [];
  let reader: CarReader | null = null;
  let capsule: Record<string, unknown> | null = null;
  let rootCid: CID | null = null;

  try {
    reader = await loadCar(parsedCid);
    steps.push({ name: '下载 CAR', status: 'ok', detail: '从 IPFS 网关获取成功。' });
  } catch (error) {
    steps.push({
      name: '下载 CAR',
      status: 'error',
      detail: error instanceof Error ? error.message : '未知错误'
    });

    return {
      cid: cidParam,
      rootCid: null,
      capsule: null,
      steps
    };
  }

  try {
    const decoded = await decodeCapsule(reader);
    capsule = decoded.capsule;
    rootCid = decoded.rootCid;
    steps.push({ name: '解析根块', status: 'ok', detail: `CAR 根为 ${rootCid.toString()}` });
  } catch (error) {
    steps.push({
      name: '解析根块',
      status: 'error',
      detail: error instanceof Error ? error.message : '未知错误'
    });

    return {
      cid: cidParam,
      rootCid: rootCid ? rootCid.toString() : null,
      capsule,
      steps
    };
  }

  if (!capsule) {
    return {
      cid: cidParam,
      rootCid: rootCid ? rootCid.toString() : null,
      capsule: null,
      steps
    };
  }

  const isValidSchema = validateCapsule(capsule);
  steps.push(
    isValidSchema
      ? { name: 'AJV 校验', status: 'ok', detail: '符合 capsule_v0.2.9 规范。' }
      : {
          name: 'AJV 校验',
          status: 'error',
          detail: (validateCapsule.errors ?? []).map((err) => `${err.instancePath || '/'} ${err.message ?? ''}`).join('; ') || '未知错误'
        }
  );

  try {
    const recomputed = await computeCid(capsule);
    if (recomputed.toString() === parsedCid.toString()) {
      steps.push({ name: 'CID 匹配', status: 'ok', detail: 'CAR 根 CID 与数据一致。' });
    } else {
      steps.push({
        name: 'CID 匹配',
        status: 'error',
        detail: `期望 ${parsedCid.toString()}，实际 ${recomputed.toString()}`
      });
    }
  } catch (error) {
    steps.push({
      name: 'CID 匹配',
      status: 'error',
      detail: error instanceof Error ? error.message : '无法重新计算 CID'
    });
  }

  try {
    await verifySignature(capsule);
    steps.push({ name: '签名校验', status: 'ok', detail: 'Ed25519 验签通过。' });
  } catch (error) {
    steps.push({
      name: '签名校验',
      status: 'error',
      detail: error instanceof Error ? error.message : '签名校验失败'
    });
  }

  return {
    cid: cidParam,
    rootCid: rootCid?.toString() ?? null,
    capsule,
    steps
  };
}

export function generateMetadata({ params }: VerifyPageProps): Metadata {
  return {
    title: `Verify ${params.cid}`
  };
}

export default async function VerifyPage({ params }: VerifyPageProps) {
  if (!params.cid) {
    notFound();
  }

  const outcome = await verifyCapsule(params.cid);

  const hasError = outcome.steps.some((step) => step.status === 'error');

  return (
    <main style={{ padding: '2rem 0' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Verify CID</h1>
      <p style={{ color: '#4b5563', marginBottom: '1.5rem' }}>
        检查 <code>{params.cid}</code> 的 CAR 文件、CID、一致性与签名状态。
      </p>
      <section
        style={{
          border: `2px solid ${hasError ? '#f87171' : '#4ade80'}`,
          background: hasError ? '#fef2f2' : '#f0fdf4',
          borderRadius: '0.75rem',
          padding: '1.5rem',
          marginBottom: '1.5rem'
        }}
      >
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>状态</h2>
        <ul style={{ paddingLeft: '1.25rem', lineHeight: 1.6, color: '#374151' }}>
          {outcome.steps.map((step) => (
            <li key={step.name}>
              <strong>{step.name}</strong> —{' '}
              <span style={{ color: step.status === 'ok' ? '#16a34a' : '#dc2626' }}>{step.status === 'ok' ? '通过' : '失败'}</span>
              {step.detail && <span style={{ color: '#4b5563' }}>：{step.detail}</span>}
            </li>
          ))}
        </ul>
      </section>

      <section style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem' }}>CAR 概览</h2>
        <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.5rem 1rem', color: '#374151' }}>
          <dt style={{ fontWeight: 600 }}>请求 CID</dt>
          <dd style={{ margin: 0 }}>
            <code>{outcome.cid}</code>
          </dd>
          <dt style={{ fontWeight: 600 }}>根 CID</dt>
          <dd style={{ margin: 0 }}>
            {outcome.rootCid ? <code>{outcome.rootCid}</code> : <span style={{ color: '#9ca3af' }}>未知</span>}
          </dd>
        </dl>
      </section>

      {outcome.capsule ? (
        <section>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem' }}>Capsule 结构</h2>
          <pre
            style={{
              background: '#111827',
              color: '#f9fafb',
              padding: '1rem',
              borderRadius: '0.75rem',
              overflow: 'auto',
              maxHeight: '28rem'
            }}
          >
            {JSON.stringify(outcome.capsule, null, 2)}
          </pre>
        </section>
      ) : (
        <section>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem' }}>Capsule 结构</h2>
          <p style={{ color: '#6b7280' }}>尚未取得 capsule 内容。</p>
        </section>
      )}
    </main>
  );
}
