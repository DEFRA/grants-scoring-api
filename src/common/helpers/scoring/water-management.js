export const calculateScore = async (
  logger,
  db,
  cropsIrrigated,
  easting,
  northing,
  supplyOthers,
  planning,
  abstraction
) => {
  const sectorScore = calculateSectorScore(cropsIrrigated)
  const collaborationScore = calculateCollaborationScore(supplyOthers)
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

/**
 * Sector is scored out of 25.
 * <br/>
 * If multiple crops are being irrigated using the water from this project, the highest score is used.
 *
 * Scores awarded for crops irrigated using the water from this project:
 * <li>25% - Soft & Cane Fruit (SOFT_AND_CANE_FRUIT), Protected edible crops (PROTECTED_EDIBLE_CROPS)</li>
 * <li>20% - Ornamentals (ORNAMENTALS), Forest Nursery (FOREST_NURSERY)</li>
 * <li>15% - Top & Stone Fruit (TOP_AND_STONE_FRUIT), Vineyards (VINEYARDS), Field scale vegetables (FIELD_SCALE_VEGETABLES)</li>
 * <li>5% - Arable (ARABLE)</li>
 * <li>2% - Grass - for feeding livestock, commercial turf (GRASS_FEEDING_LIVESTOCK_COMMERCIAL_TURF)</li>
 *
 * @param {string[]} cropsIrrigated - crops irrigated using the water from the project
 * @returns {number} - the highest score awarded out of the crops provided
 */
export const calculateSectorScore = (cropsIrrigated) => {
  if (
    !cropsIrrigated ||
    (Array.isArray(cropsIrrigated) && cropsIrrigated.length === 0)
  ) {
    throw new Error('No crops provided')
  }

  const sectorScores = {
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

  if (Array.isArray(cropsIrrigated)) {
    const scores = cropsIrrigated
      .map((crop) => sectorScores[crop])
      .filter((score) => score !== undefined)

    if (scores.length === 0) {
      throw new Error('No valid crops provided')
    }
    return Math.max(...scores)
  }

  throw new Error('No valid crops provided')
}

/**
 * Collaboration is scored out of 10
 * @param supplyOthers
 */
const calculateCollaborationScore = (supplyOthers) => {
  const scores = {
    max: 10,
    min: 0
  }

  if (supplyOthers) {
    return scores.max
  } else {
    return scores.min
  }
}

/**
 * Planning/EA is scored out of 5
 * @param planning
 * @param abstraction
 * @returns {number}
 */
const calculatePlanningAbstractionScore = (planning, abstraction) => {
  const scores = {
    max: 5,
    min: 0
  }

  if (planning && abstraction) {
    return scores.max
  } else {
    return scores.min
  }
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
