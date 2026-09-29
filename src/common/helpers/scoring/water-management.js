export const calculateScore = async (
  db,
  growing,
  easting,
  northing,
  supplyOthers,
  planning,
  abstraction
) => {
  // Sector: out of 25
  const sectorScore = calculateSectorScore(growing)

  // Scarcity: out of 60
  const scarcityScore = await calculateScarcityScore(db, easting, northing)

  // Collaboration: out of 10
  const collaborationScore = calculateCollaborationScore(supplyOthers)

  // Planning/EA: out of 5
  const planningAbstractionScore = calculatePlanningAbstractionScore(
    planning,
    abstraction
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

const calculateSectorScore = (growing) => (growing ? 25 : 0)
const calculateCollaborationScore = (supplyOthers) => (supplyOthers ? 10 : 0)
const calculatePlanningAbstractionScore = (planning, abstraction) =>
  planning && abstraction === 'Y' ? 5 : 0

export const calculateScarcityScore = async (db, easting, northing) => {
  const { q, r } = pointToHexagon(easting, northing)

  const score = await getHexagonScoreFromDatastore(db, q, r)

  switch (score) {
    case 9:
      return 60
    case 8:
      return 55
    case 7:
      return 50
    case 6:
      return 45
    case 5:
      return 40
    case 4:
      return 35
    case 3:
      return 30
    case 2:
      return 25
    default:
      return 0
  }
}

// Assumed:
//  the starting point is (0,0)
//  hexagons are 100m² area
//  point is central point of the hexagon
// Confirmed:
//  hexagons follow a tessellation pattern, no overlaps and no gaps
//  hexagons are flat-top
const pointToHexagon = (easting, northing) => {
  // Calculate the "size" parameter for a flat-top hexagon with an area of 100m².
  const hexagonSize = Math.sqrt(200 / (3 * Math.sqrt(3)))

  // Convert Easting to Q Coordinate
  const q = ((2 / 3) * easting) / hexagonSize
  // Convert Both Coordinates to R
  const r = ((-1 / 3) * easting + (Math.sqrt(3) / 3) * northing) / hexagonSize

  // Use cube coordinate rounding to snap to the nearest hexagon center
  const x = q
  const z = r
  const y = -x - z

  let roundedX = Math.round(x)
  const roundedY = Math.round(y)
  let roundedZ = Math.round(z)

  const diffX = Math.abs(roundedX - x)
  const diffY = Math.abs(roundedY - y)
  const diffZ = Math.abs(roundedZ - z)

  if (diffX > diffY && diffX > diffZ) {
    roundedX = -roundedY - roundedZ
  } else if (diffZ >= diffY) {
    roundedZ = -roundedX - roundedY
  }

  // nearest hexagon center
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
