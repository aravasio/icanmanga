import { optionsStyles } from "../content/styles"
import type { SettingsResponse } from "../shared/types"

const ext = (globalThis as any).browser ?? chrome

function injectStyles() {
  const style = document.createElement("style")
  style.textContent = optionsStyles
  document.head.append(style)
}

function render() {
  injectStyles()
  const wrap = document.createElement("div")
  wrap.className = "wrap"
  wrap.innerHTML = `
    <h1>ICanManga Settings</h1>
    <p>Provide your OpenAI API key. It stays in extension storage.</p>
    <label for="apiKey">API Key</label>
    <input id="apiKey" type="password" placeholder="sk-..." />
    <button id="save">Save</button>
    <div id="status" class="status"></div>
  `

  document.body.append(wrap)

  const input = wrap.querySelector("#apiKey") as HTMLInputElement
  const status = wrap.querySelector("#status") as HTMLDivElement
  const button = wrap.querySelector("#save") as HTMLButtonElement

  button.addEventListener("click", async () => {
    status.textContent = ""
    status.className = "status"
    const value = input.value.trim()
    if (!value) {
      status.textContent = "API key is required."
      status.classList.add("error")
      return
    }

    const response = await sendMessage({ type: "SET_SETTINGS", payload: { apiKey: value } })
    if (response?.error) {
      status.textContent = response.error
      status.classList.add("error")
      return
    }

    status.textContent = "Saved."
    status.classList.add("success")
  })

  loadSettings(input, status)
}

async function loadSettings(input: HTMLInputElement, status: HTMLDivElement) {
  const response = await sendMessage({ type: "GET_SETTINGS" })
  if (response?.payload?.apiKey) {
    input.value = response.payload.apiKey
  }
  if (response?.error) {
    status.textContent = response.error
    status.classList.add("error")
  }
}

function sendMessage(message: any): Promise<SettingsResponse | null> {
  return new Promise((resolve) => {
    ext.runtime.sendMessage(message, (response: SettingsResponse) => {
      if (ext.runtime.lastError) {
        resolve(null)
      } else {
        resolve(response)
      }
    })
  })
}

render()