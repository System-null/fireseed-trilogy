import chalk from 'chalk';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { coreVersion } from '@fireseed/core';

export async function run(argv = hideBin(process.argv)) {
  const parser = yargs(argv)
    .scriptName('fireseed')
    .usage('$0 <cmd> [args]')
    .command(
      'version',
      'Print the Fireseed core version',
      () => {},
      () => {
        console.log(chalk.green(`@fireseed/core v${coreVersion}`));
      }
    )
    .help();

  await parser.parse();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run();
}
