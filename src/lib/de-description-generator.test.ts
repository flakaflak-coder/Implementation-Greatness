import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  generateDEDescription,
  generateDEDescriptionVariants,
  generateDETagline,
} from './de-description-generator'

describe('generateDEDescription', () => {
  beforeEach(() => {
    // Seed random for deterministic tests
    vi.spyOn(Math, 'random').mockReturnValue(0)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('generates a description containing the DE name', () => {
    const description = generateDEDescription({
      name: 'ClaimsBot',
      companyName: 'Acme Insurance',
    })
    expect(description).toContain('ClaimsBot')
  })

  it('generates a description containing the company name', () => {
    const description = generateDEDescription({
      name: 'ClaimsBot',
      companyName: 'Acme Insurance',
    })
    expect(description).toContain('Acme Insurance')
  })

  it('includes channel information when provided', () => {
    const description = generateDEDescription({
      name: 'ClaimsBot',
      companyName: 'Acme Insurance',
      channels: ['EMAIL', 'WEBCHAT'],
    })
    expect(description).toContain('email')
    expect(description).toContain('webchat')
  })

  it('limits channels to first 3', () => {
    const description = generateDEDescription({
      name: 'ClaimsBot',
      companyName: 'Acme Insurance',
      channels: ['EMAIL', 'WEBCHAT', 'VOICE', 'WHATSAPP'],
    })
    // Should include first 3 channels but not the 4th
    expect(description).toContain('email')
    expect(description).toContain('webchat')
    expect(description).toContain('voice')
    expect(description).not.toContain('whatsapp')
  })

  it('includes skills when provided', () => {
    const description = generateDEDescription({
      name: 'ClaimsBot',
      companyName: 'Acme Insurance',
      skills: ['claims processing', 'document validation'],
    })
    expect(description).toContain('claims processing')
    expect(description).toContain('document validation')
  })

  it('limits skills to first 3', () => {
    const description = generateDEDescription({
      name: 'ClaimsBot',
      companyName: 'Acme Insurance',
      skills: ['skill1', 'skill2', 'skill3', 'skill4'],
    })
    expect(description).toContain('skill1')
    expect(description).toContain('skill2')
    expect(description).toContain('skill3')
    expect(description).not.toContain('skill4')
  })

  it('uses customer service template for "customer service" department', () => {
    const description = generateDEDescription({
      name: 'ServiceBot',
      companyName: 'Acme',
      department: 'Customer Service',
    })
    // The description should use customer service template
    // With Math.random() returning 0, we get index 0 of each array
    expect(description).toContain('friendly first point of contact')
  })

  it('uses claims template for "claims" department', () => {
    const description = generateDEDescription({
      name: 'ClaimsBot',
      companyName: 'Acme',
      department: 'Claims',
    })
    expect(description).toContain('claims handling')
  })

  it('uses HR template for "hr" department', () => {
    const description = generateDEDescription({
      name: 'HRBot',
      companyName: 'Acme',
      department: 'HR',
    })
    expect(description).toContain('HR')
  })

  it('uses finance template for "finance" department', () => {
    const description = generateDEDescription({
      name: 'FinBot',
      companyName: 'Acme',
      department: 'Finance',
    })
    expect(description).toContain('financial')
  })

  it('uses IT template for "it" department', () => {
    const description = generateDEDescription({
      name: 'ITBot',
      companyName: 'Acme',
      department: 'IT',
    })
    // The intro is lowercased in the description, so "IT support" becomes "it support"
    expect(description).toContain('tech-savvy digital assistant')
  })

  it('uses default template for unknown department', () => {
    const description = generateDEDescription({
      name: 'GenBot',
      companyName: 'Acme',
      department: 'Marketing',
    })
    // Default template
    expect(description).toContain('dedicated digital assistant')
  })

  it('uses default template when no department provided', () => {
    const description = generateDEDescription({
      name: 'GenBot',
      companyName: 'Acme',
    })
    expect(description).toContain('dedicated digital assistant')
  })

  it('handles keyword-based department matching for "support"', () => {
    const description = generateDEDescription({
      name: 'Bot',
      companyName: 'Acme',
      department: 'Client Support Department',
    })
    expect(description).toContain('friendly first point of contact')
  })

  it('handles keyword-based department matching for "schade" (Dutch for claims)', () => {
    const description = generateDEDescription({
      name: 'Bot',
      companyName: 'Acme',
      department: 'Schadeafdeling',
    })
    expect(description).toContain('claims handling')
  })

  it('handles keyword-based department matching for "accounting"', () => {
    const description = generateDEDescription({
      name: 'Bot',
      companyName: 'Acme',
      department: 'Accounting',
    })
    expect(description).toContain('financial')
  })

  it('handles keyword-based department matching for "people" (HR)', () => {
    const description = generateDEDescription({
      name: 'Bot',
      companyName: 'Acme',
      department: 'People Operations',
    })
    expect(description).toContain('HR')
  })

  it('ends with a period', () => {
    const description = generateDEDescription({
      name: 'Bot',
      companyName: 'Acme',
    })
    expect(description.endsWith('.')).toBe(true)
  })

  it('does not include channel text when channels are empty', () => {
    const description = generateDEDescription({
      name: 'Bot',
      companyName: 'Acme',
      channels: [],
    })
    expect(description).not.toContain('via')
  })
})

describe('generateDEDescriptionVariants', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('generates the requested number of variants', () => {
    // Use real random for variant generation
    const variants = generateDEDescriptionVariants({
      name: 'ClaimsBot',
      companyName: 'Acme Insurance',
    }, 2)
    expect(variants.length).toBeGreaterThanOrEqual(1)
    expect(variants.length).toBeLessThanOrEqual(2)
  })

  it('defaults to 3 variants', () => {
    const variants = generateDEDescriptionVariants({
      name: 'ClaimsBot',
      companyName: 'Acme Insurance',
    })
    expect(variants.length).toBeGreaterThanOrEqual(1)
    expect(variants.length).toBeLessThanOrEqual(3)
  })

  it('generates unique variants', () => {
    const variants = generateDEDescriptionVariants({
      name: 'ClaimsBot',
      companyName: 'Acme Insurance',
    }, 3)
    const unique = new Set(variants)
    expect(unique.size).toBe(variants.length)
  })

  it('each variant contains the DE name', () => {
    const variants = generateDEDescriptionVariants({
      name: 'ClaimsBot',
      companyName: 'Acme Insurance',
    }, 3)
    for (const variant of variants) {
      expect(variant).toContain('ClaimsBot')
    }
  })
})

describe('generateDETagline', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('generates a tagline containing the DE name', () => {
    const tagline = generateDETagline({
      name: 'ClaimsBot',
      companyName: 'Acme Insurance',
    })
    expect(tagline).toContain('ClaimsBot')
  })

  it('generates a tagline containing the company name', () => {
    const tagline = generateDETagline({
      name: 'ClaimsBot',
      companyName: 'Acme Insurance',
    })
    expect(tagline).toContain('Acme Insurance')
  })

  it('uses department-specific closing', () => {
    const tagline = generateDETagline({
      name: 'ClaimsBot',
      companyName: 'Acme',
      department: 'Claims',
    })
    // With Math.random() = 0, picks first closing from claims template
    expect(tagline).toContain('Streamlining claims')
  })

  it('includes a dash separator', () => {
    const tagline = generateDETagline({
      name: 'Bot',
      companyName: 'Acme',
    })
    expect(tagline).toContain(' - ')
  })

  it('capitalizes the first letter of the closing', () => {
    const tagline = generateDETagline({
      name: 'Bot',
      companyName: 'Acme',
    })
    // The closing part after " - " should start with an uppercase letter
    const closingPart = tagline.split(' - ')[1]
    expect(closingPart[0]).toBe(closingPart[0].toUpperCase())
  })
})
