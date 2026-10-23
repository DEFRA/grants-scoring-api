import { describe, it, expect } from 'vitest'
import {
  scoringParamsSchema,
  scoringQuerySchema,
  validateLocationQuerySchema
} from './schemas.js'

describe('Schemas', () => {
  describe('scoringParamsSchema', () => {
    it('should validate a valid grant', () => {
      const { error, value } = scoringParamsSchema.validate({
        grant: 'water-management'
      })
      expect(error).toBeUndefined()
      expect(value).toEqual({ grant: 'water-management' })
    })

    it('should fail if grant is missing', () => {
      const { error } = scoringParamsSchema.validate({})
      expect(error).toBeDefined()
    })
  })

  describe('scoringQuerySchema', () => {
    const validData = {
      sectorsIrrigated: 'ARABLE',
      easting: 380712,
      northing: 396269,
      businessesUsingWater: 'ONE',
      planning: 'Y',
      abstraction: 'Y'
    }

    it('should validate valid data', () => {
      const { error, value } = scoringQuerySchema.validate(validData)
      expect(error).toBeUndefined()
      expect(value.sectorsIrrigated).toEqual(['ARABLE'])
    })

    it('should handle comma-separated sectorsIrrigated', () => {
      const { error, value } = scoringQuerySchema.validate({
        ...validData,
        sectorsIrrigated: 'ARABLE,TOP_AND_STONE_FRUIT'
      })
      expect(error).toBeUndefined()
      expect(value.sectorsIrrigated).toEqual(['ARABLE', 'TOP_AND_STONE_FRUIT'])
    })

    it('should handle array of sectorsIrrigated', () => {
      const { error, value } = scoringQuerySchema.validate({
        ...validData,
        sectorsIrrigated: ['ARABLE', 'TOP_AND_STONE_FRUIT']
      })
      expect(error).toBeUndefined()
      expect(value.sectorsIrrigated).toEqual(['ARABLE', 'TOP_AND_STONE_FRUIT'])
    })

    it('should fail if sectorsIrrigated is invalid', () => {
      const { error } = scoringQuerySchema.validate({
        ...validData,
        sectorsIrrigated: 'INVALID'
      })
      expect(error).toBeDefined()
    })

    it('should fail if mandatory fields are missing', () => {
      const { error } = scoringQuerySchema.validate({ easting: 123 })
      expect(error).toBeDefined()
    })

    it('should fail if values are not in valid set', () => {
      const { error } = scoringQuerySchema.validate({
        ...validData,
        planning: 'INVALID'
      })
      expect(error).toBeDefined()
    })
  })

  describe('validateLocationQuerySchema', () => {
    it('should validate valid coordinates', () => {
      const { error, value } = validateLocationQuerySchema.validate({
        easting: 380712,
        northing: 396269
      })
      expect(error).toBeUndefined()
      expect(value).toEqual({ easting: 380712, northing: 396269 })
    })

    it('should fail if coordinates are missing', () => {
      const { error } = validateLocationQuerySchema.validate({
        easting: 380712
      })
      expect(error).toBeDefined()
    })
  })
})
