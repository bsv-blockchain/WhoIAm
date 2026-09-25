import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import LookupResolver from '@bsv/sdk/overlay-tools/LookupResolver'
import OverlayAdminTokenTemplate from '@bsv/sdk/overlay-tools/OverlayAdminTokenTemplate'
import { Transaction } from '@bsv/sdk'
import {
  assertOverlayBroadcast,
  createIdentityLookupResolver,
  IDENTITY_OVERLAY_HOSTS,
  identityLookupConfig,
  isPinnedIdentityOverlayHost,
  createIdentityBroadcaster,
  toOverlayNetworkPreset,
} from './overlay.ts'

describe('toOverlayNetworkPreset', () => {
  it('maps wallet-toolbox chain "main" to overlay preset mainnet', () => {
    assert.equal(toOverlayNetworkPreset('main'), 'mainnet')
  })

  it('maps wallet-toolbox chain "test" to overlay preset testnet', () => {
    assert.equal(toOverlayNetworkPreset('test'), 'testnet')
  })

  it('keeps BRC-100 mainnet/testnet strings', () => {
    assert.equal(toOverlayNetworkPreset('mainnet'), 'mainnet')
    assert.equal(toOverlayNetworkPreset('testnet'), 'testnet')
  })

  it('defaults unknown or missing values to mainnet so SLAP trackers are defined', () => {
    assert.equal(toOverlayNetworkPreset(undefined), 'mainnet')
    assert.equal(toOverlayNetworkPreset('MAIN'), 'mainnet')
  })
})

describe('assertOverlayBroadcast', () => {
  it('throws when TopicBroadcaster returns ERR_NO_HOSTS_INTERESTED instead of treating it as success', () => {
    assert.throws(
      () =>
        assertOverlayBroadcast({
          status: 'error',
          code: 'ERR_NO_HOSTS_INTERESTED',
          description: 'No mainnet hosts are interested in receiving this transaction.',
        }),
      /ERR_NO_HOSTS_INTERESTED/,
    )
  })

  it('returns the result when overlay submit succeeded', () => {
    const result = {
      status: 'success' as const,
      txid: 'ab'.repeat(32),
      message: 'Sent to 1 Overlay Services host.',
    }
    assert.equal(assertOverlayBroadcast(result), result)
  })
})

describe('identity overlay host pinning', () => {
  it('pins the BSVA overlay cluster for ls_ship and ls_identity on mainnet', () => {
    const config = identityLookupConfig('mainnet')
    assert.equal(config.networkPreset, 'mainnet')
    assert.deepEqual(config.hostOverrides?.ls_ship, IDENTITY_OVERLAY_HOSTS.mainnet)
    assert.deepEqual(config.hostOverrides?.ls_identity, IDENTITY_OVERLAY_HOSTS.mainnet)
    assert.ok(IDENTITY_OVERLAY_HOSTS.mainnet.includes('https://overlay-us-1.bsvb.tech'))
  })

  it('accepts only pinned overlay hosts as /submit targets', () => {
    assert.equal(isPinnedIdentityOverlayHost('https://overlay-us-1.bsvb.tech', 'mainnet'), true)
    assert.equal(isPinnedIdentityOverlayHost('https://chooser-crimp-recast.ngrok-free.dev', 'mainnet'), false)
    assert.equal(
      isPinnedIdentityOverlayHost(
        'https://backend.f8ad4f88d28eff5fd4ab1411e2520a31.projects.babbage.systems',
        'mainnet',
      ),
      false,
    )
  })

  it('finds tm_identity SHIP hosts without relying on unfiltered SLAP advertisements', async () => {
    const resolver = createIdentityLookupResolver('mainnet')
    const answer = await resolver.query(
      { service: 'ls_ship', query: { topics: ['tm_identity'] } },
      8000,
    )
    assert.equal(answer.type, 'output-list')
    assert.ok(answer.outputs.length > 0, 'expected SHIP advertisements for tm_identity')

    const domains = new Set<string>()
    for (const output of answer.outputs) {
      try {
        const tx = Transaction.fromBEEF(output.beef)
        const parsed = OverlayAdminTokenTemplate.decode(tx.outputs[output.outputIndex].lockingScript)
        if (parsed.protocol === 'SHIP' && parsed.topicOrService === 'tm_identity') {
          domains.add(parsed.domain)
        }
      } catch {
        /* skip undecodable ads */
      }
    }
    assert.ok(
      [...domains].some((d) => d.includes('overlay-us-1.bsvb.tech') || d.includes('overlay-ap-1.bsvb.tech')),
      `expected a BSVA tm_identity host, got ${[...domains].join(', ')}`,
    )

    const interested = await (
      createIdentityBroadcaster('mainnet') as unknown as {
        findInterestedHosts: () => Promise<Record<string, Set<string>>>
      }
    ).findInterestedHosts()
    const submitTargets = Object.keys(interested)
    assert.ok(
      submitTargets.some((host) => isPinnedIdentityOverlayHost(host, 'mainnet')),
      `TopicBroadcaster would not POST /submit to a pinned host; targets were ${submitTargets.join(', ')}`,
    )
  })
})

describe('SDK lookup trap this app must not hit', () => {
  it('LookupResolver rejects wallet chain "main" as a network preset', () => {
    assert.throws(
      () =>
        new LookupResolver({
          networkPreset: 'main' as 'mainnet',
          reputationStorage: { get: () => null, set: () => {} },
        }),
      /network preset is invalid/,
    )
  })
})
