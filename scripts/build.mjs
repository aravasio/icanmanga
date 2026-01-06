import { spawn } from "node:child_process"

const args = process.argv.slice(2)
const isWatch = args.includes("--watch")
const viteCmd = process.platform === "win32" ? "vite.cmd" : "vite"

function run(cmd, cmdArgs) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, cmdArgs, { stdio: "inherit" })
    child.on("error", reject)
    child.on("exit", (code) => {
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(`${cmd} exited with code ${code}`))
    })
  })
}

async function runOnce() {
  await run(viteCmd, ["build", ...args])
  await run(viteCmd, ["build", "-c", "vite.content.config.ts", ...args])
}

function runWatch() {
  const children = [
    spawn(viteCmd, ["build", ...args], { stdio: "inherit" }),
    spawn(viteCmd, ["build", "-c", "vite.content.config.ts", ...args], {
      stdio: "inherit",
    }),
  ]

  const shutdown = (code = 0) => {
    for (const child of children) {
      child.kill("SIGINT")
    }
    process.exit(code)
  }

  for (const child of children) {
    child.on("exit", (code) => {
      if (code && code !== 0) {
        shutdown(code)
      }
    })
  }

  process.on("SIGINT", () => shutdown(0))
  process.on("SIGTERM", () => shutdown(0))
}

if (isWatch) {
  runWatch()
} else {
  runOnce().catch((error) => {
    console.error(error.message)
    process.exit(1)
  })
}
