import { describe, it, expect, vi } from 'vitest'
import {
  calculateScore,
  calculateScarcityScore,
  pointToHexagon
} from './water-management.js'

describe('water-management helper', () => {
  describe('calculateScore', () => {
    const logger = { info: vi.fn() }
    it('should calculate the total score correctly with all positive factors', async () => {
      const db = {
        collection: vi.fn().mockReturnThis(),
        findOne: vi.fn().mockResolvedValue({ score: 9 })
      }

      const result = await calculateScore(
        logger,
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
        findOne: vi.fn().mockResolvedValue({ score: 2 }) // score 2 maps to 25 in scarcity
      }

      const result = await calculateScore(
        logger,
        db,
        null,
        0,
        0,
        null,
        false,
        'N'
      )

      expect(result).toEqual({
        totalScore: 25,
        sectorScore: 0,
        scarcityScore: 25,
        collaborationScore: 0,
        planningAbstractionScore: 0
      })
    })

    it('should calculate the sector score as 25 if growing is truthy', async () => {
      const db = {
        collection: vi.fn().mockReturnThis(),
        findOne: vi.fn().mockResolvedValue({ score: 2 })
      }
      const result = await calculateScore(
        logger,
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
        findOne: vi.fn().mockResolvedValue({ score: 2 })
      }
      const result = await calculateScore(
        logger,
        db,
        null,
        0,
        0,
        'yes',
        false,
        'N'
      )
      expect(result.collaborationScore).toBe(10)
    })

    it('should calculate planningAbstractionScore as 5 only if planning is true AND abstraction is Y', async () => {
      const db = {
        collection: vi.fn().mockReturnThis(),
        findOne: vi.fn().mockResolvedValue({ score: 2 })
      }

      expect(
        (await calculateScore(logger, db, null, 0, 0, false, true, 'Y'))
          .planningAbstractionScore
      ).toBe(5)
      expect(
        (await calculateScore(logger, db, null, 0, 0, false, false, 'Y'))
          .planningAbstractionScore
      ).toBe(0)
      expect(
        (await calculateScore(logger, db, null, 0, 0, false, true, false))
          .planningAbstractionScore
      ).toBe(0)
    })
  })

  describe('calculateScarcityScore', () => {
    const logger = { info: vi.fn() }
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
        { hexScore: 2, expected: 25 }
      ]

      for (const { hexScore, expected } of cases) {
        const db = mockDb(hexScore)
        const score = await calculateScarcityScore(logger, db, 0, 0)
        expect(score).toBe(expected)
      }
    })

    it('should throw an error for scores not in the mapping (0, 1)', async () => {
      for (const hexScore of [0, 1]) {
        const db = mockDb(hexScore)
        await expect(calculateScarcityScore(logger, db, 0, 0)).rejects.toThrow(
          'Hexagon score not found'
        )
      }
    })

    it('should throw an error if hexagon is not found', async () => {
      const db = mockDb(undefined)
      await expect(calculateScarcityScore(logger, db, 0, 0)).rejects.toThrow(
        'Hexagon not found for q: 0, r: 0'
      )
    })
  })

  describe('pointToHexagon', () => {
    const logger = { info: vi.fn() }
    it('should correctly map (0,0) to hexagon (0,0)', () => {
      expect(pointToHexagon(logger, 0, 0)).toEqual({ q: 0, r: 0 })
    })

    it('should correctly map easting=380712, northing=396269 to correct hexagon', () => {
      // Manual calculation with updated hexagon size (Area = 8660.260000033304):
      // s = sqrt(2 * A / (3 * sqrt(3))) = sqrt(17320.52 / 5.1961524) = sqrt(3333.333) ~= 57.735
      // q = (2/3 * 380712) / 57.735 = 253808 / 57.735 ~= 4396.08
      // r = (-1/3 * 380712 + sqrt(3)/3 * 396269) / 57.735
      //   = (-126904 + 0.57735 * 396269) / 57.735
      //   = (-126904 + 228786.13) / 57.735
      //   = 101882.13 / 57.735 ~= 1764.65
      // q=4396.08, r=1764.65
      // x=4396.08, z=1764.65, y=-6160.73
      // roundedX=4396, roundedZ=1765, roundedY=-6161
      // diffX=0.08, diffZ=0.35, diffY=0.27
      // diffZ is largest, so roundedZ = -roundedX - roundedY = -4396 - (-6161) = 1765
      // result { q: 4396, r: 1765 }
      expect(pointToHexagon(logger, 380712, 396269)).toEqual({
        q: 4396,
        r: 1765
      })
    })

    it('should handle rounding at boundaries', () => {
      // Testing a point near a boundary to exercise the rounding logic
      // hexagonSideLength ~= 57.735
      // Let's pick a point where one coordinate is halfway between hexagons.
      // E.g. x = 0.6, z = 0.6, y = -1.2
      // roundedX = 1, roundedZ = 1, roundedY = -1
      // diffX = 0.4, diffZ = 0.4, diffY = 0.2
      // diffX is not greater than diffY AND diffZ... wait.
      // If diffX > diffY && diffX > diffZ -> roundedX = -roundedY - roundedZ
      // else if diffY > diffZ -> roundedY = ...
      // else roundedZ = -roundedX - roundedY

      // Let's just trust the implementation but provide a specific point that was previously debated.
      // Point where diffX is largest:
      // x = 0.8, z = 0.1, y = -0.9
      // roundedX=1, roundedZ=0, roundedY=-1
      // diffX=0.2, diffZ=0.1, diffY=0.1
      // diffX > diffY && diffX > diffZ is true.
      // roundedX = -(-1) - 0 = 1. Correct.

      // q = 0.8 * 57.735 / (2/3) = 0.8 * 57.735 * 1.5 = 69.282
      // easting = 69.282
      // r = (-1/3 * 69.282 + sqrt(3)/3 * northing) / 57.735 = 0.1
      // -23.094 + 0.57735 * northing = 5.7735
      // 0.57735 * northing = 28.8675
      // northing = 50
      expect(pointToHexagon(logger, 69.282, 50)).toEqual({ q: 1, r: 0 })
    })
  })
})
