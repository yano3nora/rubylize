// Release flow の薄い wrapper。compile / archive / checksum / GitHub Release 作成は
// goreleaser (.goreleaser.yaml) に任せ、ここには goreleaser に寄せられないものだけを残す:
// version bump・check/test・tag と VERSION の整合チェック・人間による publish ゲート。
//
// Flow:
//   1. prepare : bump + check/test + `goreleaser release --snapshot` (publish なしの全工程ドライラン)
//   2. 人間    : version bump を commit し、`git tag v<version>` を打つ
//   3. publish : 整合チェック → commit + tag を push → `goreleaser release` (tag 済みコミットから再ビルド)

type CommandName = 'prepare' | 'publish'

const PUBLISH_FLAG = '--i-understand-this-pushes-and-publishes'

function usage(): string {
  return `Usage:
  deno run -A scripts/release.ts prepare <version>
  deno run -A scripts/release.ts publish <version> ${PUBLISH_FLAG}

Examples:
  mise run release:prepare -- 0.1.0
  mise run release:publish -- 0.1.0 ${PUBLISH_FLAG}
`
}

function parseArgs(): {
  command: CommandName
  version: string
  publishAllowed: boolean
} {
  const [rawCommand, rawVersion, ...rest] = Deno.args
  const command = rawCommand as CommandName | undefined
  const version = rawVersion ?? Deno.env.get('RUBYLIZE_RELEASE_VERSION')

  if (command !== 'prepare' && command !== 'publish') {
    throw new Error(`Unknown command.\n\n${usage()}`)
  }
  if (version === undefined || !/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(
      `Release version must be semver-like, for example 0.1.0.\n\n${usage()}`,
    )
  }

  return {
    command,
    version,
    publishAllowed: rest.includes(PUBLISH_FLAG),
  }
}

interface RunOptions {
  readonly cwd?: string
  readonly env?: Record<string, string>
  // quiet: コマンドと stdout を表示しない。token など秘匿値を扱うコマンド用
  readonly quiet?: boolean
  // stream: 出力を端末へ直接流す (戻り値は空文字)。goreleaser 等の長時間コマンド用
  readonly stream?: boolean
}

async function run(
  command: string,
  args: readonly string[],
  options: RunOptions = {},
): Promise<string> {
  if (!options.quiet) {
    console.log(`$ ${[command, ...args].join(' ')}`)
  }

  const child = new Deno.Command(command, {
    args: [...args],
    cwd: options.cwd ?? Deno.cwd(),
    env: options.env,
    stdout: options.stream ? 'inherit' : 'piped',
    stderr: options.stream ? 'inherit' : 'piped',
  })
  const result = await child.output()
  let stdout = ''

  if (!options.stream) {
    stdout = new TextDecoder().decode(result.stdout)
    const stderr = new TextDecoder().decode(result.stderr)

    // quiet でも失敗時の stderr は出す。stdout は秘匿値の可能性があるため出さない
    if (!options.quiet && stdout.trim() !== '') {
      console.log(stdout.trimEnd())
    }
    if (stderr.trim() !== '' && (!options.quiet || !result.success)) {
      console.error(stderr.trimEnd())
    }
  }
  if (!result.success) {
    throw new Error(`Command failed: ${command} ${args.join(' ')}`)
  }

  return stdout
}

async function bumpVersion(version: string): Promise<void> {
  const path = 'main.ts'
  const source = await Deno.readTextFile(path)
  // main.ts は singleQuote / semiColons なしの fmt 設定なので、quote と行末もそれに合わせる
  const versionPattern = /export const VERSION = 'rubylize (\d+\.\d+\.\d+)'/
  const currentVersion = source.match(versionPattern)?.[1]

  if (currentVersion === undefined) {
    throw new Error(
      'VERSION declaration was not found or already uses a non-standard format.',
    )
  }
  if (currentVersion === version) {
    console.log(
      `VERSION is already rubylize ${version}; leaving main.ts unchanged.`,
    )
    return
  }

  const next = source.replace(
    versionPattern,
    `export const VERSION = 'rubylize ${version}'`,
  )

  await Deno.writeTextFile(path, next)
}

// deno compile は Go の ldflags のような version 注入ができないため VERSION は手動 bump。
// tag と VERSION の食い違いを publish 前に止める最後の網がこのチェック
async function assertCliVersion(version: string): Promise<void> {
  const stdout = await run('deno', [
    'run',
    '--allow-env',
    '--allow-read',
    'main.ts',
    '--version',
  ])
  const actual = stdout.trim()
  const expected = `rubylize ${version}`

  if (actual !== expected) {
    throw new Error(
      `CLI version mismatch: expected "${expected}", got "${actual}".`,
    )
  }
}

async function assertCleanTree(): Promise<void> {
  const stdout = await run('git', ['status', '--porcelain'])
  if (stdout.trim() !== '') {
    throw new Error(
      'Working tree must be clean before publishing. Commit the version bump first.',
    )
  }
}

// goreleaser は tag 済みコミットからビルドする前提のため、tag が HEAD を指すことを保証する
async function assertTagAtHead(tag: string): Promise<void> {
  let tagCommit: string
  try {
    tagCommit =
      (await run('git', ['rev-parse', '--verify', `${tag}^{commit}`], {
        quiet: true,
      }))
        .trim()
  } catch {
    throw new Error(
      `Tag ${tag} does not exist. Create it yourself first: git tag ${tag}`,
    )
  }

  const head = (await run('git', ['rev-parse', 'HEAD'], { quiet: true })).trim()
  if (tagCommit !== head) {
    throw new Error(
      `Tag ${tag} does not point at HEAD. Move the tag to the release commit or check out the tagged commit.`,
    )
  }
}

// compile 成功だけでは npm 依存 (kuromoji 辞書) の VFS 埋め込み漏れを検出できないため、
// host 向けバイナリを実際に実行して version と stdin -> stdout の動作まで確認する
async function smokeTestCompiledBinary(version: string): Promise<void> {
  await run('deno', ['task', 'compile'], { stream: true })
  try {
    const versionOut = (await run('./rubylize', ['--version'])).trim()
    if (versionOut !== `rubylize ${version}`) {
      throw new Error(`Compiled binary version mismatch: got "${versionOut}".`)
    }
    const smokeOut = await run('sh', [
      '-c',
      "echo 'こんにちは、世界。' | ./rubylize",
    ])
    if (!smokeOut.includes('<ruby>')) {
      throw new Error('Compiled binary smoke test failed: no <ruby> output.')
    }
  } finally {
    await Deno.remove('./rubylize')
  }
}

async function prepare(version: string): Promise<void> {
  await bumpVersion(version)
  await assertCliVersion(version)
  await run('deno', ['task', 'check'], { stream: true })
  await run('deno', ['task', 'test'], { stream: true })
  await smokeTestCompiledBinary(version)

  // publish で失敗しうるビルド〜archive〜checksum をここで全部失敗させておく。
  // --snapshot は tag 不要・publish なしで全工程を回すドライラン
  await run('goreleaser', ['release', '--snapshot', '--clean'], {
    stream: true,
  })

  console.log(
    '\nSnapshot assets are ready in dist/ (validation only; publish rebuilds from the tag).',
  )
  console.log(
    `Review the diff, commit the bump, tag it (git tag v${version}), then run release:publish.`,
  )
}

async function publish(
  version: string,
  publishAllowed: boolean,
): Promise<void> {
  if (!publishAllowed) {
    throw new Error(
      `Refusing to push tags or publish a GitHub Release without ${PUBLISH_FLAG}.`,
    )
  }

  const tag = `v${version}`

  await assertCliVersion(version)
  await assertCleanTree()
  await assertTagAtHead(tag)

  // goreleaser は GITHUB_TOKEN を要求する。gh の認証を使い回して token 管理を増やさない。
  // push 後に認証失敗すると remote だけ進んだ半端な状態になるため、token は push より先に確保する
  // ?? だと空文字の GITHUB_TOKEN でフォールバックできないため || で判定する
  const token = Deno.env.get('GITHUB_TOKEN')?.trim() ||
    (await run('gh', ['auth', 'token'], { quiet: true })).trim()

  // goreleaser は push を行わず GitHub API しか叩かないため、
  // Release が正しいコミットを指すように commit と tag を先に remote へ揃える。
  // --atomic で branch だけ進んで tag が落ちる半端な状態を防ぐ
  await run('git', ['push', '--atomic', 'origin', 'HEAD', tag])

  await run('goreleaser', ['release', '--clean'], {
    env: { GITHUB_TOKEN: token },
    stream: true,
  })

  console.log(`Published ${tag}.`)
}

if (import.meta.main) {
  try {
    const { command, version, publishAllowed } = parseArgs()

    if (command === 'prepare') {
      await prepare(version)
    }
    if (command === 'publish') {
      await publish(version, publishAllowed)
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    Deno.exit(1)
  }
}
