export const calculateScore = async (
  logger,
  db,
  sectorsIrrigated,
  easting,
  northing,
  businessesUsingWater,
  planning,
  abstraction
) => {
  const sectorScore = calculateSectorScore(sectorsIrrigated)
  const collaborationScore = calculateCollaborationScore(businessesUsingWater)
  const planningAbstractionScore = calculatePlanningAbstractionScore(
    planning,
    abstraction
  )
  const scarcityScore = await calculateScarcityScore(
    logger,
    db,
    easting,
    northing
  )

  const totalScore =
    sectorScore + scarcityScore + collaborationScore + planningAbstractionScore

  return {
    totalScore,
    sectorScore,
    scarcityScore,
    collaborationScore,
    planningAbstractionScore
  }
}

export const sectorsIrrigatedScores = {
  SOFT_AND_CANE_FRUIT: 25,
  PROTECTED_EDIBLE_CROPS: 25,
  ORNAMENTALS: 20,
  FOREST_NURSERY: 20,
  TOP_AND_STONE_FRUIT: 15,
  VINEYARDS: 15,
  FIELD_SCALE_VEGETABLES: 15,
  ARABLE: 5,
  GRASS_FEEDING_LIVESTOCK_COMMERCIAL_TURF: 2
}

/**
 * Sector is scored out of 25.
 * <br/>
 * If multiple sectors are being irrigated using the water from this project, the highest score is used.
 *
 * Scores awarded for sectors irrigated using the water from this project:
 * <li>25% - Soft & Cane Fruit (SOFT_AND_CANE_FRUIT), Protected edible crops (PROTECTED_EDIBLE_CROPS)</li>
 * <li>20% - Ornamentals (ORNAMENTALS), Forest Nursery (FOREST_NURSERY)</li>
 * <li>15% - Top & Stone Fruit (TOP_AND_STONE_FRUIT), Vineyards (VINEYARDS), Field scale vegetables (FIELD_SCALE_VEGETABLES)</li>
 * <li>5% - Arable (ARABLE)</li>
 * <li>2% - Grass - for feeding livestock, commercial turf (GRASS_FEEDING_LIVESTOCK_COMMERCIAL_TURF)</li>
 *
 * @param {string[]} sectorsIrrigated - sectors irrigated using the water from the project
 * @returns {number} - the highest score awarded out of the sectors provided
 */
export const calculateSectorScore = (sectorsIrrigated) => {
  if (
    !sectorsIrrigated ||
    (Array.isArray(sectorsIrrigated) && sectorsIrrigated.length === 0)
  ) {
    throw new Error('No sectors provided')
  }

  const scores = sectorsIrrigated
    .map((sector) => sectorsIrrigatedScores[sector])
    .filter((score) => score !== undefined)

  if (scores.length === 0) {
    throw new Error('No valid sectors provided')
  }
  return Math.max(...scores)
}

export const collaborationScores = {
  FIVE_OR_MORE: 10,
  TWO_TO_FOUR: 5,
  ONE: 0
}

/**
 * Collaboration is scored out of 10.
 * <br/>
 * Scores awarded for the number of businesses using the water from this project:
 * <li>10% - Five or more (FIVE_OR_MORE)</li>
 * <li>5% - Two to Four (TWO_TO_FOUR)</li>
 * <li>0% - One (ONE)</li>
 *
 * @param {string} businessesUsingWater - the number of businesses using the water from the project
 * @returns {number} - the score awarded based on the number of businesses
 */
export const calculateCollaborationScore = (businessesUsingWater) => {
  const score = collaborationScores[businessesUsingWater]

  if (score === undefined) {
    throw new Error('Invalid businessesUsingWater value')
  }

  return score
}

/**
 * Planning/Abstraction is scored out of 5.
 * <br/>
 * Scores awarded based on if planning permission and abstraction licence are needed/held:
 * <li>5% - Planning and abstraction are held</li>
 * <li>0% - Neither planning nor abstraction are held</li>
 * <li>0% - Abstraction is held, but planning is NOT held</li>
 * <li>0% - Planning is held, but abstraction is NOT held</li>
 * <li>5% - Abstraction is held, and planning is not needed</li>
 * <li>5% - Planning is held, and abstraction is not needed</li>
 * <li>5% - Neither planning nor abstraction is needed</li>
 *
 * @param {string} planning - whether planning permission is needed/held
 * @param {string} abstraction - whether an abstraction licence is needed/held
 * @returns {number} - the score awarded based on whether planning and abstraction are needed/held
 */
export const calculatePlanningAbstractionScore = (planning, abstraction) => {
  const validValues = ['Y', 'N', 'NN']
  if (!validValues.includes(planning) || !validValues.includes(abstraction)) {
    throw new Error('Invalid planning or abstraction value')
  }

  return planning !== 'N' && abstraction !== 'N' ? 5 : 0
}

/**
 * Scarcity is scored out of a maximum percentage
 * @param db
 * @param easting
 * @param northing
 * @returns {Promise<number>}
 */
export const calculateScarcityScore = async (logger, db, easting, northing) => {
  const scoreToPercentageMappings = {
    9: 60,
    8: 55,
    7: 50,
    6: 45,
    5: 40,
    4: 35,
    3: 30,
    2: 25
  }

  const { q, r } = pointToHexagon(logger, easting, northing)

  const score = await getHexagonScoreFromDatastore(db, q, r)

  const percentage = scoreToPercentageMappings[score]
  if (percentage === undefined) {
    throw new Error('Hexagon score not found')
  }
  return percentage
}

/**
 * Map a British National Grid point to the nearest hexagon.
 *
 * Hexagons:
 *  - British National Grid
 *  - Regular flat-top hexagons
 *  - 100 m between opposite sides
 *  - 8660.260000033304 m² area
 *  - Tessellation pattern
 *
 * @param logger
 * @param {number} easting
 * @param {number} northing
 * @returns {{q: number, r: number}} - coordinates used to identify a hexagon, q ≈ x and r ≈ y
 */
export const pointToHexagon = (logger, easting, northing) => {
  const hexagon = {
    area: 8660.260000033304,
    qMultiplier: 2 / 3,
    rMultiplierEasting: -1 / 3,
    rMultiplierNorthing: Math.sqrt(3) / 3,
    sizeNumeratorMultiplier: 2,
    sizeDenominatorMultiplier: 3,
    sqrt3: Math.sqrt(3)
  }

  // Regular flat-top hexagon side length from area: A = (3 * sqrt(3) / 2) * s^2
  const hexagonSideLength = Math.sqrt(
    (hexagon.sizeNumeratorMultiplier * hexagon.area) /
      (hexagon.sizeDenominatorMultiplier * hexagon.sqrt3)
  )

  // Convert BNG coordinates to flat-top hexagon axial coordinates.
  const q = (hexagon.qMultiplier * easting) / hexagonSideLength
  const r =
    (hexagon.rMultiplierEasting * easting +
      hexagon.rMultiplierNorthing * northing) /
    hexagonSideLength

  // Convert axial coordinates to cube coordinates.
  const x = q
  const z = r
  const y = -x - z

  // Use cube coordinate rounding to snap to the nearest hexagon center
  const roundedY = Math.round(y)
  let roundedX = Math.round(x)
  let roundedZ = Math.round(z)

  const diffX = Math.abs(roundedX - x)
  const diffY = Math.abs(roundedY - y)
  const diffZ = Math.abs(roundedZ - z)

  if (diffX > diffY && diffX > diffZ) {
    roundedX = -roundedY - roundedZ
  } else if (diffY > diffZ) {
    // NOT USED roundedY = -roundedX - roundedZ
  } else {
    roundedZ = -roundedX - roundedY
  }

  const centralEasting = (3 / 2) * hexagonSideLength * roundedX
  const centralNorthing =
    hexagonSideLength * hexagon.sqrt3 * (roundedZ + roundedX / 2)
  logger.info(
    `Selected hexagon central point: Easting ${centralEasting}, Northing ${centralNorthing}`
  )

  return {
    q: roundedX,
    r: roundedZ
  }
}

const getHexagonScoreFromDatastore = async (db, q, r) => {
  const hex = await db.collection('hexagons').findOne({ q, r })
  if (!hex) {
    throw new Error(`Hexagon not found for q: ${q}, r: ${r}`)
  }
  return hex.score
}
