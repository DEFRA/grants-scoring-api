export const calculateScore = async (
  logger,
  db,
  growing,
  easting,
  northing,
  supplyOthers,
  planning,
  abstraction
) => {
  const sectorScore = calculateSectorScore(growing)
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
 * Sector is scored out of 25
 * @param growing
 * @returns {number}
 */
const calculateSectorScore = (growing) => {
  const scores = {
    max: 25,
    min: 0
  }

  if (growing) {
    return scores.max
  } else {
    return scores.min
  }
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
 *  - Hexagon centred at BNG (0, 0) (?)
 *  - Tessellation pattern
 *
 * @param {number} easting
 * @param {number} northing
 * @returns {{q: number, r: number}} - coordinates used to identify a hexagon, q ≈ x and r ≈ y
 */
export const pointToHexagon = (logger, easting, northing) => {
  const hexagon = {
    area: 100,
    qMultiplier: 2 / 3,
    rMultiplierEasting: -1 / 3,
    rMultiplierNorthing: Math.sqrt(3) / 3,
    sizeNumeratorMultiplier: 2,
    sizeDenominatorMultiplier: 3,
    sqrt3: Math.sqrt(3)
  }

  // Distance between opposite sides of the hexagon.
  const hexagonWidth = hexagon.area

  // Regular flat-top hexagon distance between opposite sides
  const hexagonSideLength = hexagonWidth / hexagon.sqrt3

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
