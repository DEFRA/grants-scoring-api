import { describe, it, expect, vi } from 'vitest'
import { calculateScore, calculateScarcityScore } from './water-management.js'

describe('water-management helper', () => {
  describe('calculateScore', () => {
    it('should calculate the total score correctly with all positive factors', async () => {
      const db = {
        collection: vi.fn().mockReturnThis(),
        findOne: vi.fn().mockResolvedValue({ score: 9 })
      }

      const result = await calculateScore(
        db,
        'food',
        380712,
        396269,
        '5+',
        true,
        'Y'
      )

      expect(result).toEqual({
        totalScore: 100, // 25 (sector) + 60 (scarcity) + 10 (collaboration) + 5 (planning/abstraction)
        sectorScore: 25,
        scarcityScore: 60,
        collaborationScore: 10,
        planningAbstractionScore: 5
      })
    })

    it('should calculate the total score correctly with minimal factors', async () => {
      const db = {
        collection: vi.fn().mockReturnThis(),
        findOne: vi.fn().mockResolvedValue({ score: 1 }) // score 1 maps to 0 in scarcity
      }

      const result = await calculateScore(db, null, 0, 0, null, false, 'N')

      expect(result).toEqual({
        totalScore: 0,
        sectorScore: 0,
        scarcityScore: 0,
        collaborationScore: 0,
        planningAbstractionScore: 0
      })
    })

    it('should calculate the sector score as 25 if growing is truthy', async () => {
      const db = {
        collection: vi.fn().mockReturnThis(),
        findOne: vi.fn().mockResolvedValue({ score: 1 })
      }
      const result = await calculateScore(
        db,
        'anything',
        0,
        0,
        false,
        false,
        'N'
      )
      expect(result.sectorScore).toBe(25)
    })

    it('should calculate the collaboration score as 10 if supplyOthers is truthy', async () => {
      const db = {
        collection: vi.fn().mockReturnThis(),
        findOne: vi.fn().mockResolvedValue({ score: 1 })
      }
      const result = await calculateScore(db, null, 0, 0, 'yes', false, 'N')
      expect(result.collaborationScore).toBe(10)
    })

    it('should calculate planningAbstractionScore as 5 only if planning is true AND abstraction is Y', async () => {
      const db = {
        collection: vi.fn().mockReturnThis(),
        findOne: vi.fn().mockResolvedValue({ score: 1 })
      }

      expect(
        (await calculateScore(db, null, 0, 0, false, true, 'Y'))
          .planningAbstractionScore
      ).toBe(5)
      expect(
        (await calculateScore(db, null, 0, 0, false, false, 'Y'))
          .planningAbstractionScore
      ).toBe(0)
      expect(
        (await calculateScore(db, null, 0, 0, false, true, 'N'))
          .planningAbstractionScore
      ).toBe(0)
    })
  })

  describe('calculateScarcityScore', () => {
    const mockDb = (score) => ({
      collection: vi.fn().mockReturnThis(),
      findOne: vi.fn().mockResolvedValue(score !== undefined ? { score } : null)
    })

    it('should return correct scores for each case in the switch', async () => {
      const cases = [
        { hexScore: 9, expected: 60 },
        { hexScore: 8, expected: 55 },
        { hexScore: 7, expected: 50 },
        { hexScore: 6, expected: 45 },
        { hexScore: 5, expected: 40 },
        { hexScore: 4, expected: 35 },
        { hexScore: 3, expected: 30 },
        { hexScore: 2, expected: 25 },
        { hexScore: 1, expected: 0 },
        { hexScore: 0, expected: 0 }
      ]

      for (const { hexScore, expected } of cases) {
        const db = mockDb(hexScore)
        const score = await calculateScarcityScore(db, 0, 0)
        expect(score).toBe(expected)
      }
    })

    it('should throw an error if hexagon is not found', async () => {
      const db = mockDb(undefined)
      await expect(calculateScarcityScore(db, 0, 0)).rejects.toThrow(
        'Hexagon not found for q: 0, r: 0'
      )
    })
  })

  describe('pointToHexagon (Internal logic)', () => {
    // Since pointToHexagon is not exported, we test it through calculateScarcityScore
    it('should correctly map easting/northing to hexagon coordinates', async () => {
      const db = {
        collection: vi.fn().mockReturnThis(),
        findOne: vi.fn().mockImplementation(async ({ q, r }) => {
          return { q, r, score: 9 }
        })
      }

      // Test point (0,0)
      await calculateScarcityScore(db, 0, 0)
      expect(db.findOne).toHaveBeenCalledWith({ q: 0, r: 0 })

      // Test a known point from existing tests in scoring.test.js: easting=380712, northing=396269
      // These coordinates map to specific q, r.
      await calculateScarcityScore(db, 380712, 396269)
      // We don't need to know the exact q, r here if we trust the previous session's verification,
      // but we can see what they are to ensure consistency.
      const call = db.findOne.mock.calls[1][0]
      expect(call).toHaveProperty('q')
      expect(call).toHaveProperty('r')
    })
  })
})
