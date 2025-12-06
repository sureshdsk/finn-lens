// Reward Hunter Insight Calculator

import { ParsedData } from '../../types/data.types';
import { Insight, RewardHunterData } from '../../types/insight.types';

/**
 * Calculate Reward Hunter insight
 * Tracks total cashback rewards earned
 */
export function calculateRewardHunterInsight(
  data: ParsedData
): Insight<RewardHunterData> | null {
  const { cashbackRewards } = data;

  if (cashbackRewards.length === 0) return null;

  let totalRewards = 0;
  const rewardCount = cashbackRewards.length;

  cashbackRewards.forEach(reward => {
    // Convert to INR if needed
    const amountInINR = reward.currency === 'INR'
      ? reward.amount
      : reward.amount * 83; // Approx USD to INR
    totalRewards += amountInINR;
  });

  const avgReward = totalRewards / rewardCount;

  // Generate message
  let message = `You earned ₹${totalRewards.toFixed(0)} in cashback rewards! `;
  message += `That's ${rewardCount} reward${rewardCount === 1 ? '' : 's'}. `;

  if (totalRewards >= 10000) {
    message += 'Elite reward hunter! 🏆';
  } else if (totalRewards >= 5000) {
    message += 'Serious cashback game! 💰';
  } else if (totalRewards >= 1000) {
    message += 'Nice savings! 🎯';
  } else if (totalRewards >= 100) {
    message += 'Every rupee counts! 💸';
  } else {
    message += 'Just getting started! ✨';
  }

  return {
    type: 'reward_hunter',
    title: 'Reward Hunter',
    tone: 'wholesome',
    data: {
      totalRewards,
      rewardCount,
      avgReward
    },
    message
  };
}
