import type { DevToolsDockEntry } from '@vitejs/devtools-kit'
import { describe, expect, it } from 'vitest'
import { redirectDevToolsMountPath, renderDockImportsMap } from '../plugins/server'

describe('renderDockImportsMap', () => {
  it('uses default importName when omitted', () => {
    const docks: DevToolsDockEntry[] = [
      {
        type: 'action',
        id: 'action-entry',
        title: 'Action Entry',
        icon: 'ph:rocket-duotone',
        action: {
          importFrom: 'my-plugin/action',
        },
      },
      {
        type: 'iframe',
        id: 'iframe-with-script',
        title: 'Iframe With Script',
        icon: 'ph:browser-duotone',
        url: '/.my-plugin/',
        clientScript: {
          importFrom: 'my-plugin/iframe-script',
        },
      },
      {
        type: 'custom-render',
        id: 'custom-render',
        title: 'Custom Render',
        icon: 'ph:code-duotone',
        renderer: {
          importFrom: 'my-plugin/renderer',
          importName: 'renderPanel',
        },
      },
      {
        type: 'iframe',
        id: 'plain-iframe',
        title: 'Plain Iframe',
        icon: 'ph:app-window-duotone',
        url: '/.plain/',
      },
    ]

    const code = renderDockImportsMap(docks)

    expect(code).toContain('["action:action-entry"]')
    expect(code).toContain('["iframe:iframe-with-script"]')
    expect(code).toContain('["custom-render:custom-render"]')
    expect(code).not.toContain('["iframe:plain-iframe"]')

    const defaultImportCount = code.split('r["default"]').length - 1
    expect(defaultImportCount).toBe(2)
    expect(code).toContain('r["renderPanel"]')
  })
})

describe('redirectDevToolsMountPath', () => {
  function callRedirect(url: string, originalUrl = url) {
    let statusCode: number | undefined
    let location: string | undefined
    let ended = false
    let nextCalled = false

    redirectDevToolsMountPath(
      { originalUrl, url } as any,
      {
        set statusCode(value: number) {
          statusCode = value
        },
        get statusCode() {
          return statusCode ?? 200
        },
        setHeader(name: string, value: string) {
          if (name === 'Location') {
            location = value
          }
        },
        end() {
          ended = true
        },
      } as any,
      () => {
        nextCalled = true
      },
    )

    return {
      ended,
      location,
      nextCalled,
      statusCode,
    }
  }

  it('redirects the mounted devtools root to the canonical trailing slash URL', () => {
    expect(callRedirect('/', '/.devtools')).toEqual({
      ended: true,
      location: '/.devtools/',
      nextCalled: false,
      statusCode: 302,
    })
  })

  it('preserves the query string when redirecting the mounted devtools root', () => {
    expect(callRedirect('/?foo=bar', '/.devtools?foo=bar')).toEqual({
      ended: true,
      location: '/.devtools/?foo=bar',
      nextCalled: false,
      statusCode: 302,
    })
  })

  it('passes through the canonical trailing slash URL', () => {
    expect(callRedirect('/', '/.devtools/')).toEqual({
      ended: false,
      location: undefined,
      nextCalled: true,
      statusCode: undefined,
    })
  })

  it('passes through devtools subpaths', () => {
    expect(callRedirect('/auth', '/.devtools/auth')).toEqual({
      ended: false,
      location: undefined,
      nextCalled: true,
      statusCode: undefined,
    })
  })
})
