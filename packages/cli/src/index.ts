import chalk from 'chalk';
import { promises as fs } from 'fs';
import { CarReader } from '@ipld/car';
import * as dagCbor from '@ipld/dag-cbor';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import {
  canonicalize,
  encodeDagCbor,
  sign as signPayload,
  toCAR,
  toCID,
  verify as verifySignature
} from '@fireseed/core';

function normalizeHex(input: string): string {
  return input.trim().toLowerCase().replace(/^0x/, '');
}

function parseDidJwk(input: string): string {
  if (!input.startsWith('did:jwk:')) {
    return normalizeHex(input);
  }

  const payload = input.slice('did:jwk:'.length);
  let jwk: { kty?: string; crv?: string; x?: string };
  try {
    jwk = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch (error) {
    throw new Error(`Invalid did:jwk payload: ${(error as Error).message}`);
  }

  if (jwk.kty !== 'OKP' || jwk.crv !== 'Ed25519' || typeof jwk.x !== 'string') {
    throw new Error('Unsupported did:jwk key; expected Ed25519 OKP');
  }

  return Buffer.from(jwk.x, 'base64url').toString('hex');
}

async function readJson(filePath: string): Promise<unknown> {
  const contents = await fs.readFile(filePath, 'utf8');
  return JSON.parse(contents);
}

async function readHexFile(filePath: string): Promise<string> {
  const contents = await fs.readFile(filePath, 'utf8');
  return normalizeHex(contents);
}

export async function run(argv = hideBin(process.argv)) {
  const parser = yargs(argv)
    .scriptName('fireseed')
    .usage('$0 <cmd> [args]')
    .command(
      'version',
      'Print the Fireseed core version',
      () => {},
      async () => {
        const { coreVersion } = await import('@fireseed/core');
        console.log(chalk.green(`@fireseed/core v${coreVersion}`));
      }
    )
    .command(
      'sign',
      'Sign JSON payload and emit CAR file',
      (yargsBuilder) =>
        yargsBuilder
          .option('in', {
            describe: 'Path to JSON payload file',
            type: 'string',
            demandOption: true
          })
          .option('privkey-file', {
            describe: 'Path to hex-encoded private key',
            type: 'string',
            demandOption: true
          })
          .option('out', {
            describe: 'Output CAR file path',
            type: 'string',
            demandOption: true
          }),
      async (args) => {
        const inputPath = args.in as string;
        const outPath = args.out as string;
        const privKeyPath = args['privkey-file'] as string;
        const data = await readJson(inputPath);
        const canonicalPayload = canonicalize(data as any);
        const payloadBytes = encodeDagCbor(canonicalPayload);
        const secretKeyHex = await readHexFile(privKeyPath);
        const signature = signPayload(payloadBytes, secretKeyHex);
        const record = { payload: canonicalPayload, signature };
        const blockBytes = encodeDagCbor(record);
        const cid = toCID(blockBytes);
        const carBytes = await toCAR(cid, blockBytes);
        await fs.writeFile(outPath, carBytes);
        console.log(chalk.green(`CAR written to ${outPath}`));
        console.log(chalk.blue(`CID: ${cid}`));
      }
    )
    .command(
      'verify',
      'Verify CAR file signature',
      (yargsBuilder) =>
        yargsBuilder
          .option('car', {
            describe: 'Path to CAR file',
            type: 'string',
            demandOption: true
          })
          .option('pub', {
            describe: 'Public key in hex or did:jwk format',
            type: 'string',
            demandOption: true
          }),
      async (args) => {
        const carPath = args.car as string;
        const pubInput = args.pub as string;
        const carBytes = await fs.readFile(carPath);
        const reader = await CarReader.fromBytes(carBytes);
        const roots = await reader.getRoots();
        if (roots.length !== 1) {
          console.error(chalk.red('CAR must contain exactly one root'));
          process.exitCode = 1;
          return;
        }
        const rootCid = roots[0];
        const block = await reader.get(rootCid);
        if (!block) {
          console.error(chalk.red('Root block missing from CAR'));
          process.exitCode = 1;
          return;
        }
        const record = dagCbor.decode(block.bytes) as Record<string, unknown>;
        const payload = record?.payload as unknown;
        const signature = record?.signature;
        if (typeof signature !== 'string') {
          console.error(chalk.red('Missing signature in CAR payload'));
          process.exitCode = 1;
          return;
        }
        const canonicalPayload = canonicalize(payload as any);
        const payloadBytes = encodeDagCbor(canonicalPayload);
        const publicKeyHex = parseDidJwk(pubInput);
        const valid = verifySignature(payloadBytes, signature, publicKeyHex);
        const expectedCid = toCID(block.bytes);
        if (expectedCid !== rootCid.toString()) {
          console.error(chalk.red('Root CID does not match encoded block contents'));
          process.exitCode = 1;
          return;
        }
        if (valid) {
          console.log(chalk.green('Signature verified successfully'));
        } else {
          console.error(chalk.red('Signature verification failed'));
          process.exitCode = 1;
        }
      }
    )
    .command(
      'pin',
      'Pin CAR file using configured service (no-op placeholder)',
      (yargsBuilder) =>
        yargsBuilder.option('car', {
          describe: 'Path to CAR file',
          type: 'string',
          demandOption: true
        }),
      async (args) => {
        const carPath = args.car as string;
        try {
          await fs.access(carPath);
          console.log(chalk.yellow('Pin command not yet configured; no action taken.'));
        } catch (error) {
          console.error(chalk.red(`Unable to access CAR: ${(error as Error).message}`));
          process.exitCode = 1;
        }
      }
    )
    .command(
      'get',
      'Fetch CAR by CID (placeholder)',
      (yargsBuilder) =>
        yargsBuilder
          .option('cid', {
            describe: 'CID to fetch',
            type: 'string',
            demandOption: true
          })
          .option('out', {
            describe: 'Output CAR file path',
            type: 'string',
            demandOption: true
          }),
      async (args) => {
        console.error(
          chalk.red('`fireseed get` is not yet implemented. Configure a retrieval service to enable it.')
        );
        process.exitCode = 1;
      }
    )
    .demandCommand(1)
    .strict()
    .help();

  await parser.parseAsync();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run();
}
