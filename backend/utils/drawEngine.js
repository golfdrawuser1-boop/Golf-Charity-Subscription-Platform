/**
 * DRAW ENGINE
 * Handles the monthly draw logic as per PRD:
 * - 5-Number Match (40% pool) - Jackpot, rolls over
 * - 4-Number Match (35% pool) - No rollover
 * - 3-Number Match (25% pool) - No rollover
 *
 * Draw Logic Options:
 * 1. Random - standard lottery style
 * 2. Algorithmic - weighted by most/least frequent user scores
 */

// Generate random draw numbers (5 numbers, range 1-45 Stableford)
const generateRandomDraw = () => {
  const numbers = []
  while (numbers.length < 5) {
    const num = Math.floor(Math.random() * 45) + 1
    if (!numbers.includes(num)) {
      numbers.push(num)
    }
  }
  return numbers.sort((a, b) => a - b)
}

// Generate algorithmic draw - weighted by score frequency
// Picks numbers that appear more/less frequently in user scores
const generateAlgorithmicDraw = (allUserScores, mode = 'frequent') => {
  // Count frequency of each score value across all users
  const frequency = {}
  allUserScores.forEach(score => {
    frequency[score] = (frequency[score] || 0) + 1
  })

  // Sort scores by frequency
  const sorted = Object.entries(frequency)
    .map(([score, count]) => ({ score: parseInt(score), count }))
    .sort((a, b) => mode === 'frequent' ? b.count - a.count : a.count - b.count)

  // Pick top 5 most/least frequent, with some randomness
  const pool = sorted.slice(0, 15).map(s => s.score)
  const numbers = []

  while (numbers.length < 5 && pool.length > 0) {
    const idx = Math.floor(Math.random() * Math.min(pool.length, 8))
    const num = pool.splice(idx, 1)[0]
    if (!numbers.includes(num)) numbers.push(num)
  }

  // Fill remaining with random if pool exhausted
  while (numbers.length < 5) {
    const num = Math.floor(Math.random() * 45) + 1
    if (!numbers.includes(num)) numbers.push(num)
  }

  return numbers.sort((a, b) => a - b)
}

// Check how many numbers a user matched
const checkMatch = (userScores, drawNumbers) => {
  const matched = userScores.filter(score => drawNumbers.includes(score))
  return matched.length
}

// Determine match type and prize eligibility
const getMatchType = (matchCount) => {
  if (matchCount >= 5) return '5_match'
  if (matchCount === 4) return '4_match'
  if (matchCount === 3) return '3_match'
  return null
}

// Calculate prize pool distribution per PRD
// 5-match: 40%, 4-match: 35%, 3-match: 25%
const calculatePrizePools = (totalPool, jackpotRollover = 0) => {
  return {
    five_match: (totalPool * 0.40) + jackpotRollover,
    four_match: totalPool * 0.35,
    three_match: totalPool * 0.25
  }
}

// Split prize among multiple winners in same tier
const splitPrize = (poolAmount, winnerCount) => {
  if (winnerCount === 0) return 0
  return parseFloat((poolAmount / winnerCount).toFixed(2))
}

// Process full draw - returns results for all participants
const processDraw = (participants, drawNumbers, prizePools) => {
  const results = {
    five_match_winners: [],
    four_match_winners: [],
    three_match_winners: [],
    draw_numbers: drawNumbers
  }

  participants.forEach(participant => {
    // Use latest 5 scores for draw entry
    const scores = participant.scores.map(s => s.score)
    const matchCount = checkMatch(scores, drawNumbers)
    const matchType = getMatchType(matchCount)

    if (matchType === '5_match') {
      results.five_match_winners.push({ ...participant, match_count: matchCount })
    } else if (matchType === '4_match') {
      results.four_match_winners.push({ ...participant, match_count: matchCount })
    } else if (matchType === '3_match') {
      results.three_match_winners.push({ ...participant, match_count: matchCount })
    }
  })

  // Calculate individual prize amounts
  results.prize_per_winner = {
    five_match: splitPrize(prizePools.five_match, results.five_match_winners.length),
    four_match: splitPrize(prizePools.four_match, results.four_match_winners.length),
    three_match: splitPrize(prizePools.three_match, results.three_match_winners.length)
  }

  // Jackpot rollover if no 5-match winner (per PRD)
  results.jackpot_rollover = results.five_match_winners.length === 0
    ? prizePools.five_match
    : 0

  return results
}

module.exports = {
  generateRandomDraw,
  generateAlgorithmicDraw,
  checkMatch,
  getMatchType,
  calculatePrizePools,
  splitPrize,
  processDraw
}
